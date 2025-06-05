// app/api/watchlist/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  let userIdAsBigInt;
  try {
    userIdAsBigInt = BigInt(session.user.id);
  } catch (e) {
    console.error("無效的用戶 ID 格式:", session.user.id);
    return NextResponse.json(
      { error: "未授權：無效的用戶 ID" },
      { status: 401 }
    );
  }

  try {
    const watchlistItemsFromDb = await prisma.watchlistitems.findMany({
      where: {
        user_id: userIdAsBigInt,
      },
      include: {
        stocks: {
          select: {
            stock_id: true,
            company_name: true,
            market_type: true,
            currency: true,
          },
        },
      },
      orderBy: {
        added_at: "desc",
      },
    });

    // 處理和格式化返回數據
    const formattedWatchlist = await Promise.all(
      watchlistItemsFromDb.map(async (item) => {
        const stockInfo = item.stocks;

        // --- 獲取最新兩天的價格數據來計算漲跌 ---
        const latestPrices = await prisma.historicalprices.findMany({
          where: { stock_id: stockInfo.stock_id },
          orderBy: { date: "desc" },
          take: 2,
          select: {
            close_price: true,
            date: true,
            volume: true,
          },
        });

        // --- 獲取最近5天的歷史價格用於趨勢圖 ---
        const trendPrices = await prisma.historicalprices.findMany({
          where: { stock_id: stockInfo.stock_id },
          orderBy: { date: "desc" },
          take: 5,
          select: {
            close_price: true,
            date: true,
          },
        });

        // 格式化趨勢數據（標準化處理）
        let formattedTrendData = [];
        if (trendPrices.length >= 2) {
          const prices = trendPrices
            .reverse()
            .map((p) => parseFloat(p.close_price) || 0);
          const basePrice = prices[0]; // 使用第一個價格作為基準

          // 計算相對變化百分比，讓趨勢更明顯
          formattedTrendData = prices.map((price, index) => {
            const changePercent =
              basePrice !== 0 ? ((price - basePrice) / basePrice) * 100 : 0;
            return {
              uv: 50 + changePercent * 10, // 基準線在50，放大變化幅度
              originalPrice: price,
              date: trendPrices[trendPrices.length - 1 - index]?.date
                .toISOString()
                .split("T")[0],
            };
          });
        }

        // --- 計算當前價格和漲跌幅 ---
        let current_price = 0;
        let latest_price_date = null;
        let change_amount = 0;
        let change_percent = 0;
        let is_up = false;
        let volume = "N/A";
        let market_cap = "N/A";

        if (latestPrices.length > 0 && latestPrices[0].close_price !== null) {
          current_price = parseFloat(latestPrices[0].close_price);
          latest_price_date = latestPrices[0].date;
          volume = latestPrices[0].volume
            ? latestPrices[0].volume.toString()
            : "N/A";

          // 計算與前一日的漲跌幅
          if (latestPrices.length > 1 && latestPrices[1].close_price !== null) {
            const previous_price = parseFloat(latestPrices[1].close_price);
            change_amount = current_price - previous_price;
            if (previous_price !== 0) {
              change_percent = (change_amount / previous_price) * 100;
            }
          }
          is_up = change_amount >= 0;
        }

        return {
          id: `${item.user_id}_${item.stock_id}`,
          stock_id: stockInfo.stock_id,
          symbol: stockInfo.stock_id,
          name: stockInfo.company_name || "N/A",
          currency: stockInfo.currency || "USD",
          current_price: current_price,
          change_amount: change_amount,
          change_percent: change_percent,
          is_up: is_up,
          market_cap: market_cap,
          volume: volume,
          added_at: item.added_at,
          // 新增：5天趨勢數據
          trend_data: formattedTrendData.length > 0 ? formattedTrendData : null,
          _debug_latest_price_date: latest_price_date,
        };
      })
    );

    return NextResponse.json(formattedWatchlist, { status: 200 });
  } catch (error) {
    console.error("獲取關注列表失敗:", error);
    if (error.code === "P2025" || error.code === "P2023") {
      return NextResponse.json({ error: "請求的資源無效。" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "伺服器內部錯誤，無法獲取關注列表。" },
      { status: 500 }
    );
  }
}

// --- 新增股票到關注列表 ---
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  let userIdAsBigInt;
  try {
    userIdAsBigInt = BigInt(session.user.id);
  } catch (e) {
    return NextResponse.json(
      { error: "未授權：無效的用戶 ID" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { stock_id } = body; // 前端應傳遞 stock_id (即 tickerSymbol)

    if (!stock_id || typeof stock_id !== "string") {
      return NextResponse.json(
        { error: "請求無效：缺少 stock_id 或格式不正確。" },
        { status: 400 }
      );
    }

    // 檢查股票是否存在 (可選，但建議)
    const stockExists = await prisma.stocks.findUnique({
      where: { stock_id: stock_id },
    });

    if (!stockExists) {
      return NextResponse.json(
        { error: `找不到股票代號為 ${stock_id} 的股票。` },
        { status: 404 }
      );
    }

    // 嘗試創建 WatchlistItem
    // Prisma 的 @@unique([userId, stockId]) 會自動處理重複加入的問題
    // 如果記錄已存在，create 會失敗。可以使用 upsert 或先 find 再 create。
    // 為了簡單，我們先嘗試 create，如果失敗則認為已存在。

    const existingWatchlistItem = await prisma.watchlistitems.findUnique({
      where: {
        user_id_stock_id: {
          // 根據 @@id([user_id, stock_id]) 定義的複合鍵名
          user_id: userIdAsBigInt,
          stock_id: stock_id,
        },
      },
    });

    if (existingWatchlistItem) {
      return NextResponse.json(
        {
          message: `${stock_id} 已在您的關注列表中。`,
          item: existingWatchlistItem,
        },
        { status: 200 }
      ); // 或者 409 Conflict
    }

    const newWatchlistItem = await prisma.watchlistitems.create({
      data: {
        user_id: userIdAsBigInt,
        stock_id: stock_id,
        // notes: null, // 如果有 notes 欄位且允許為 null
        // added_at 會自動設置
      },
      include: {
        // 返回包含股票資訊的新項目，方便前端更新
        stocks: {
          select: { stock_id: true, company_name: true, currency: true },
        },
      },
    });

    // 格式化返回給前端的數據，與 GET API 一致
    const formattedNewItem = {
      id: `${newWatchlistItem.user_id}_${newWatchlistItem.stock_id}`,
      stock_id: newWatchlistItem.stocks.stock_id,
      symbol: newWatchlistItem.stocks.stock_id,
      name: newWatchlistItem.stocks.company_name,
      currency: newWatchlistItem.stocks.currency,
      current_price: 0, // 新加入時，價格資訊可能需要前端另外獲取或等待下次刷新
      change_amount: 0,
      change_percent: 0,
      is_up: false,
      market_cap: "N/A",
      volume: "N/A",
      added_at: newWatchlistItem.added_at,
    };

    return NextResponse.json(formattedNewItem, { status: 201 }); // 201 Created
  } catch (error) {
    console.error("新增到關注列表失敗:", error);
    if (error.code === "P2002") {
      // Prisma unique constraint violation
      return NextResponse.json(
        { error: "該股票已在您的關注列表中。" },
        { status: 409 }
      ); // 409 Conflict
    }
    return NextResponse.json(
      { error: "伺服器內部錯誤，無法新增到關注列表。" },
      { status: 500 }
    );
  }
}
