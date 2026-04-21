import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  PortfolioPriceService,
  toPortfolioEntity,
} from "@/lib/domain/portfolio";

const priceService = new PortfolioPriceService(prisma);

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);

    // 檢查查詢參數
    const url = new URL(request.url);
    const includeSummary = url.searchParams.get("summary") === "true";
    const recentTransactions = url.searchParams.get("recent_transactions");

    // 如果請求最近交易記錄
    if (recentTransactions) {
      const limit = parseInt(recentTransactions) || 5;

      const transactions = await prisma.transactions.findMany({
        where: {
          portfolios: {
            user_id: userIdAsBigInt,
          },
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
        orderBy: {
          transaction_date: "desc",
        },
        take: limit,
      });

      const formattedTransactions = transactions.map((tx) => ({
        transaction_id: Number(tx.transaction_id),
        type: tx.transaction_type,
        ticker: tx.stock_id,
        stock_name: tx.stocks.company_name,
        portfolio_name: tx.portfolios.portfolio_name,
        shares: Number(tx.quantity),
        price_per_share: Number(tx.price_per_share),
        total_value: Number(tx.quantity) * Number(tx.price_per_share),
        date: tx.transaction_date.toLocaleDateString("zh-TW"),
        currency: tx.currency,
      }));

      return NextResponse.json(formattedTransactions, { status: 200 });
    }

    // 獲取投資組合並交由 domain 計算持倉與損益
    const portfolios = await prisma.portfolios.findMany({
      where: {
        user_id: userIdAsBigInt,
      },
      include: {
        transactions: {
          include: {
            stocks: {
              select: {
                stock_id: true,
                currency: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const portfolioEntities = portfolios.map(toPortfolioEntity);
    const latestPrices = await priceService.getLatestClosePrices(
      portfolioEntities.flatMap((portfolio) => portfolio.getStockIds())
    );

    const portfoliosWithValue = portfolioEntities.map((portfolioEntity, index) => {
      const snapshot = portfolioEntity.createSnapshot(latestPrices);
      const summary = snapshot.summary;
      const source = portfolios[index];

      return {
        id: `pf${Number(source.portfolio_id)}`,
        portfolio_id: Number(source.portfolio_id),
        name: source.portfolio_name,
        description: source.description,
        total_value: summary.totalMarketValue,
        total_cost: summary.totalCostBasis,
        currency: portfolioEntity.getPrimaryCurrency(),
        today_pnl: summary.unrealizedPnl,
        today_pnl_percent: summary.unrealizedPnlPercent,
        is_pnl_up: summary.unrealizedPnl >= 0,
        created_at: source.created_at,
      };
    });

    // 如果要求摘要資訊，計算所有投資組合的總和
    if (includeSummary) {
      const summary = portfoliosWithValue.reduce(
        (acc, portfolio) => {
          acc.total_portfolio_value += portfolio.total_value;
          acc.total_cost_basis += portfolio.total_cost;
          acc.total_today_pnl += portfolio.today_pnl;
          return acc;
        },
        {
          total_portfolio_value: 0,
          total_cost_basis: 0,
          total_today_pnl: 0,
        }
      );

      // 計算總損益百分比
      summary.total_today_pnl_percent =
        summary.total_cost_basis > 0
          ? (summary.total_today_pnl / summary.total_cost_basis) * 100
          : 0;

      summary.is_total_pnl_up = summary.total_today_pnl >= 0;
      summary.portfolio_count = portfoliosWithValue.length;

      return NextResponse.json(
        {
          portfolios: portfoliosWithValue,
          summary: summary,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(portfoliosWithValue, { status: 200 });
  } catch (error) {
    console.error("獲取投資組合列表失敗:", error);
    return NextResponse.json(
      { error: "獲取投資組合列表時發生錯誤" },
      { status: 500 }
    );
  }
}

// 創建新投資組合
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);
    const body = await request.json();
    const { portfolio_name, description } = body;

    if (!portfolio_name?.trim()) {
      return NextResponse.json(
        { error: "投資組合名稱為必填" },
        { status: 400 }
      );
    }

    // 檢查投資組合名稱是否已存在
    const existingPortfolio = await prisma.portfolios.findFirst({
      where: {
        user_id: userIdAsBigInt,
        portfolio_name: portfolio_name.trim(),
      },
    });

    if (existingPortfolio) {
      return NextResponse.json(
        { error: "投資組合名稱已存在" },
        { status: 409 }
      );
    }

    const newPortfolio = await prisma.portfolios.create({
      data: {
        user_id: userIdAsBigInt,
        portfolio_name: portfolio_name.trim(),
        description: description?.trim() || null,
      },
    });

    // 回應格式與 GET API 保持一致
    return NextResponse.json(
      {
        id: `pf${Number(newPortfolio.portfolio_id)}`, // 與前端一致的 ID 格式
        portfolio_id: Number(newPortfolio.portfolio_id),
        name: newPortfolio.portfolio_name, // 使用 'name' 而不是 'portfolio_name'
        description: newPortfolio.description,
        total_value: 0,
        currency: "TWD",
        today_pnl: 0,
        today_pnl_percent: 0,
        is_pnl_up: true,
        created_at: newPortfolio.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("創建投資組合失敗:", error);
    return NextResponse.json(
      { error: "創建投資組合時發生錯誤" },
      { status: 500 }
    );
  }
}
