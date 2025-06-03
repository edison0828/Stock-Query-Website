import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);

    // 獲取投資組合和計算總價值
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

    // 計算每個投資組合的總價值和今日損益
    const portfoliosWithValue = await Promise.all(
      portfolios.map(async (portfolio) => {
        let totalValue = 0;
        let todayPnl = 0;
        let currency = "TWD"; // 預設貨幣

        // 計算持倉價值
        const holdings = {};

        // 整理持倉
        portfolio.transactions.forEach((transaction) => {
          const stockId = transaction.stock_id;
          if (!holdings[stockId]) {
            holdings[stockId] = {
              quantity: 0,
              totalCost: 0,
              currency: transaction.currency,
            };
          }

          const quantity = Number(transaction.quantity);
          const price = Number(transaction.price_per_share);

          if (transaction.transaction_type === "BUY") {
            holdings[stockId].quantity += quantity;
            holdings[stockId].totalCost += quantity * price;
          } else if (transaction.transaction_type === "SELL") {
            holdings[stockId].quantity -= quantity;
            holdings[stockId].totalCost -= quantity * price;
          }
        });

        // 獲取當前價格並計算價值
        for (const [stockId, holding] of Object.entries(holdings)) {
          if (holding.quantity > 0) {
            try {
              // 獲取最新價格
              const latestPrice = await prisma.historicalprices.findFirst({
                where: { stock_id: stockId },
                orderBy: { date: "desc" },
                select: { close_price: true },
              });

              if (latestPrice) {
                const currentPrice = Number(latestPrice.close_price);
                const currentValue = holding.quantity * currentPrice;
                totalValue += currentValue;

                // 簡化的今日損益計算（實際應該用昨日收盤價）
                const costValue = holding.totalCost;
                todayPnl += currentValue - costValue;
              }
            } catch (error) {
              console.error(`獲取 ${stockId} 價格失敗:`, error);
            }
          }
        }

        // 設定主要貨幣
        if (portfolio.transactions.length > 0) {
          currency = portfolio.transactions[0].currency;
        }

        const todayPnlPercent =
          totalValue > 0 ? (todayPnl / totalValue) * 100 : 0;

        return {
          id: `pf${Number(portfolio.portfolio_id)}`, // 保持與前端一致的格式
          portfolio_id: Number(portfolio.portfolio_id),
          name: portfolio.portfolio_name,
          description: portfolio.description,
          total_value: totalValue,
          currency: currency,
          today_pnl: todayPnl,
          today_pnl_percent: todayPnlPercent,
          is_pnl_up: todayPnl >= 0,
          created_at: portfolio.created_at,
        };
      })
    );

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
