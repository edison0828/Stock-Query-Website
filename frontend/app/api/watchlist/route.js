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
    // 假設 session.user.id 存儲的是字串形式的 BigInt
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
          // 根據你的 schema，關係名是 stocks
          select: {
            stock_id: true,
            company_name: true,
            market_type: true, // 可以加入市場類型
            currency: true,
            historicalprices: {
              // 可以考慮獲取最新的歷史價格作為當前價格
              orderBy: { date: "desc" },
              take: 1,
              select: { close_price: true, date: true },
            },
          },
        },
      },
      orderBy: {
        added_at: "desc",
      },
    });

    // 處理和格式化返回數據
    const formattedWatchlist = await Promise.all(
      // 使用 Promise.all 因為獲取最新價格可能是異步的
      watchlistItemsFromDb.map(async (item) => {
        const stockInfo = item.stocks;

        // --- 獲取或模擬動態股票數據 ---
        // 策略：嘗試從最新的 historicalprices 獲取收盤價作為 current_price
        // 否則，使用 placeholder 或調用外部 API (此處簡化)
        let current_price = 0;
        let latest_price_date = null;
        let change_amount = 0;
        let change_percent = 0;
        let is_up = false;
        let volume = "N/A";
        let market_cap = "N/A"; // 市值通常不直接存在價格歷史中

        const latestHistoricalPrice = await prisma.historicalprices.findFirst({
          where: { stock_id: stockInfo.stock_id },
          orderBy: { date: "desc" },
          select: {
            close_price: true,
            open_price: true,
            date: true,
            volume: true,
          },
        });

        if (
          latestHistoricalPrice &&
          latestHistoricalPrice.close_price !== null
        ) {
          current_price = parseFloat(latestHistoricalPrice.close_price);
          latest_price_date = latestHistoricalPrice.date;
          volume = latestHistoricalPrice.volume
            ? latestHistoricalPrice.volume.toString()
            : "N/A";

          // 計算漲跌幅 (與開盤價比較，或與前一日收盤價比較 - 這裡簡化為與開盤價)
          if (latestHistoricalPrice.open_price !== null) {
            const open_price_float = parseFloat(
              latestHistoricalPrice.open_price
            );
            change_amount = current_price - open_price_float;
            if (open_price_float !== 0) {
              change_percent = (change_amount / open_price_float) * 100;
            }
          }
          is_up = change_amount >= 0;
        }
        // 市值 (market_cap) 通常需要 (股票總股數 * 當前股價)，總股數可能在 Stocks 表或 FinancialReports 表
        // 這裡我們暫時留空或用 N/A

        return {
          // 使用 stock_id 作為前端 key 可能更穩定，因為 user_id, stock_id 組合才是 WatchlistItem 的唯一標識
          // 但前端移除時可能只需要 stock_id (假設一個用戶對一個股票只有一條關注記錄)
          // 如果需要 WatchlistItem 的複合主鍵，可以這樣組合:
          id: `${item.user_id}_${item.stock_id}`, // 或者讓前端處理
          stock_id: stockInfo.stock_id,
          symbol: stockInfo.stock_id, // 你的 stocks 表的 stock_id 就是 tickerSymbol
          name: stockInfo.company_name || "N/A",
          currency: stockInfo.currency || "USD",
          current_price: current_price,
          change_amount: change_amount,
          change_percent: change_percent,
          is_up: is_up,
          market_cap: market_cap, // 暫時 N/A
          volume: volume, // 暫時 N/A
          added_at: item.added_at,
          _debug_latest_price_date: latest_price_date, // 用於調試
        };
      })
    );

    return NextResponse.json(formattedWatchlist, { status: 200 });
  } catch (error) {
    console.error("獲取關注列表失敗:", error);
    // 避免暴露詳細錯誤給客戶端，但記錄在伺服器端
    if (error.code === "P2025" || error.code === "P2023") {
      // Prisma 特定錯誤碼，如記錄未找到或 ID 格式錯誤
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
