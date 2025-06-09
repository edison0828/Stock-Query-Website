import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);
    const body = await request.json();
    const {
      stock_id,
      portfolio_id,
      transaction_type,
      quantity,
      price_per_share,
    } = body;

    // 驗證請求數據
    if (
      !stock_id ||
      !portfolio_id ||
      !transaction_type ||
      !quantity ||
      !price_per_share
    ) {
      return NextResponse.json(
        { error: "缺少必要的交易資訊" },
        { status: 400 }
      );
    }

    if (!["BUY", "SELL"].includes(transaction_type)) {
      return NextResponse.json({ error: "無效的交易類型" }, { status: 400 });
    }

    if (quantity <= 0 || price_per_share <= 0) {
      return NextResponse.json(
        { error: "數量和價格必須大於 0" },
        { status: 400 }
      );
    }

    // 驗證投資組合是否屬於當前用戶
    const portfolio = await prisma.portfolios.findFirst({
      where: {
        portfolio_id: BigInt(portfolio_id),
        user_id: userIdAsBigInt,
      },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "找不到指定的投資組合或無權限" },
        { status: 404 }
      );
    }

    // 驗證股票是否存在
    const stock = await prisma.stocks.findUnique({
      where: { stock_id },
      select: { stock_id: true, company_name: true, currency: true },
    });

    if (!stock) {
      return NextResponse.json(
        { error: `找不到股票代號 ${stock_id}` },
        { status: 404 }
      );
    }

    // 如果是賣出交易，檢查庫存是否足夠
    if (transaction_type === "SELL") {
      // 獲取該投資組合中該股票的所有交易記錄
      const transactions = await prisma.transactions.findMany({
        where: {
          portfolio_id: BigInt(portfolio_id),
          stock_id: stock_id,
        },
        select: {
          transaction_type: true,
          quantity: true,
        },
      });

      // 計算當前持有數量
      let currentHolding = 0;
      transactions.forEach((transaction) => {
        if (transaction.transaction_type === "BUY") {
          currentHolding += Number(transaction.quantity);
        } else if (transaction.transaction_type === "SELL") {
          currentHolding -= Number(transaction.quantity);
        }
      });

      console.log(`股票 ${stock_id} 當前持有數量:`, currentHolding);
      console.log(`嘗試賣出數量:`, quantity);

      // 檢查是否有足夠的股票可以賣出
      if (currentHolding < quantity) {
        return NextResponse.json(
          {
            error: `庫存不足：您目前持有 ${currentHolding} 股 ${stock_id}，無法賣出 ${quantity} 股`,
            current_holding: currentHolding,
            requested_quantity: quantity,
          },
          { status: 400 }
        );
      }

      // 如果庫存剛好等於賣出數量，提醒用戶將完全清空該股票
      if (currentHolding === quantity) {
        console.log(`將完全賣出股票 ${stock_id}`);
      }
    }

    // 創建交易記錄
    const transaction = await prisma.transactions.create({
      data: {
        portfolio_id: BigInt(portfolio_id),
        stock_id: stock_id,
        transaction_type: transaction_type,
        quantity: quantity,
        price_per_share: price_per_share,
        commission: 0, // 模擬交易，手續費為 0
        currency: stock.currency,
      },
      include: {
        stocks: {
          select: {
            stock_id: true,
            company_name: true,
          },
        },
        portfolios: {
          select: {
            portfolio_name: true,
          },
        },
      },
    });

    // 格式化回應
    const formattedTransaction = {
      transaction_id: Number(transaction.transaction_id),
      stock_symbol: transaction.stocks.stock_id,
      stock_name: transaction.stocks.company_name,
      portfolio_name: transaction.portfolios.portfolio_name,
      transaction_type: transaction.transaction_type,
      quantity: Number(transaction.quantity),
      price_per_share: Number(transaction.price_per_share),
      total_value:
        Number(transaction.quantity) * Number(transaction.price_per_share),
      transaction_date: transaction.transaction_date,
    };

    return NextResponse.json(
      {
        message: "交易記錄已成功創建",
        transaction: formattedTransaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("創建交易記錄失敗:", error);
    return NextResponse.json(
      { error: "創建交易記錄時發生錯誤" },
      { status: 500 }
    );
  }
}

// 新增 GET 方法來獲取交易記錄
export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolio_id");

    let whereClause = {};

    if (portfolioId) {
      // 驗證投資組合是否屬於當前用戶
      const portfolio = await prisma.portfolios.findFirst({
        where: {
          portfolio_id: BigInt(portfolioId),
          user_id: userIdAsBigInt,
        },
      });

      if (!portfolio) {
        return NextResponse.json(
          { error: "找不到指定的投資組合或無權限" },
          { status: 404 }
        );
      }

      whereClause.portfolio_id = BigInt(portfolioId);
    } else {
      // 獲取用戶所有投資組合的交易記錄
      whereClause.portfolios = {
        user_id: userIdAsBigInt,
      };
    }

    const transactions = await prisma.transactions.findMany({
      where: whereClause,
      include: {
        stocks: {
          select: {
            stock_id: true,
            company_name: true,
          },
        },
        portfolios: {
          select: {
            portfolio_name: true,
          },
        },
      },
      orderBy: {
        transaction_date: "desc",
      },
    });

    const formattedTransactions = transactions.map((transaction) => ({
      transaction_id: Number(transaction.transaction_id),
      stock_symbol: transaction.stocks.stock_id,
      stock_name: transaction.stocks.company_name,
      portfolio_name: transaction.portfolios.portfolio_name,
      transaction_type: transaction.transaction_type,
      quantity: Number(transaction.quantity),
      price_per_share: Number(transaction.price_per_share),
      total_value:
        Number(transaction.quantity) * Number(transaction.price_per_share),
      transaction_date: transaction.transaction_date,
      currency: transaction.currency,
    }));

    return NextResponse.json(formattedTransactions, { status: 200 });
  } catch (error) {
    console.error("獲取交易記錄失敗:", error);
    return NextResponse.json(
      { error: "獲取交易記錄時發生錯誤" },
      { status: 500 }
    );
  }
}
