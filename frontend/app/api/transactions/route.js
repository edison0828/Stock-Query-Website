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
