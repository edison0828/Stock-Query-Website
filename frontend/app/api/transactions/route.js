import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  PortfolioDomainError,
  TransactionValidator,
  toPortfolioEntity,
} from "@/lib/domain/portfolio";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);
    const body = await request.json();
    const transactionInput = TransactionValidator.normalizeInput({
      stockId: body.stock_id,
      portfolioId: body.portfolio_id,
      transactionType: body.transaction_type,
      quantity: body.quantity,
      pricePerShare: body.price_per_share,
    });

    // 驗證投資組合是否屬於當前用戶
    const portfolio = await prisma.portfolios.findFirst({
      where: {
        portfolio_id: BigInt(transactionInput.portfolioId),
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
      where: { stock_id: transactionInput.stockId },
      select: { stock_id: true, company_name: true, currency: true },
    });

    if (!stock) {
      return NextResponse.json(
        { error: `找不到股票代號 ${transactionInput.stockId}` },
        { status: 404 }
      );
    }

    const existingTransactions = await prisma.transactions.findMany({
      where: {
        portfolio_id: BigInt(transactionInput.portfolioId),
      },
      include: {
        stocks: {
          select: {
            company_name: true,
          },
        },
      },
      orderBy: {
        transaction_date: "asc",
      },
    });

    const portfolioEntity = toPortfolioEntity({
      ...portfolio,
      transactions: existingTransactions,
    });
    const pendingTransaction = TransactionValidator.createPendingTransaction(
      transactionInput,
      stock
    );

    TransactionValidator.assertCanRecord(portfolioEntity, pendingTransaction);

    // 創建交易記錄
    const transaction = await prisma.transactions.create({
      data: {
        portfolio_id: BigInt(transactionInput.portfolioId),
        stock_id: transactionInput.stockId,
        transaction_type: transactionInput.transactionType,
        quantity: transactionInput.quantity,
        price_per_share: transactionInput.pricePerShare,
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
    if (error instanceof PortfolioDomainError) {
      return NextResponse.json(
        {
          error: error.message,
          ...(error.details || {}),
        },
        { status: error.status }
      );
    }

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
