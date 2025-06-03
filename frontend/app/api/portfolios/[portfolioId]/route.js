import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// 處理 portfolioId 格式的輔助函數
function parsePortfolioId(portfolioId) {
  // 如果 ID 以 'pf' 開頭，移除前綴
  if (typeof portfolioId === "string" && portfolioId.startsWith("pf")) {
    return portfolioId.substring(2);
  }
  return portfolioId;
}

// 獲取單個投資組合詳細資訊
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { portfolioId } = await params;
    const cleanPortfolioId = parsePortfolioId(portfolioId);
    const userIdAsBigInt = BigInt(session.user.id);
    const portfolioIdAsBigInt = BigInt(cleanPortfolioId);

    // 獲取投資組合詳細資訊，包括所有交易記錄
    const portfolio = await prisma.portfolios.findFirst({
      where: {
        portfolio_id: portfolioIdAsBigInt,
        user_id: userIdAsBigInt,
      },
      include: {
        transactions: {
          include: {
            stocks: {
              select: {
                stock_id: true,
                company_name: true,
                currency: true,
              },
            },
          },
          orderBy: {
            transaction_date: "desc",
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "找不到指定的投資組合或無權限存取" },
        { status: 404 }
      );
    }

    // 計算持倉和總價值
    const holdings = {};
    let totalValue = 0;
    let totalCost = 0;

    // 整理持倉
    portfolio.transactions.forEach((transaction) => {
      const stockId = transaction.stock_id;
      if (!holdings[stockId]) {
        holdings[stockId] = {
          stock_id: stockId,
          symbol: stockId,
          name: transaction.stocks.company_name,
          quantity: 0,
          totalCost: 0,
          avgPrice: 0,
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

    // 計算平均價格和當前價值
    const holdingsArray = [];
    for (const [stockId, holding] of Object.entries(holdings)) {
      if (holding.quantity > 0) {
        holding.avgPrice = holding.totalCost / holding.quantity;

        try {
          // 獲取最新價格
          const latestPrice = await prisma.historicalprices.findFirst({
            where: { stock_id: stockId },
            orderBy: { date: "desc" },
            select: { close_price: true },
          });

          if (latestPrice) {
            const currentPrice = Number(latestPrice.close_price);
            holding.currentPrice = currentPrice;
            holding.currentValue = holding.quantity * currentPrice;
            holding.unrealizedPnl = holding.currentValue - holding.totalCost;
            holding.unrealizedPnlPercent =
              (holding.unrealizedPnl / holding.totalCost) * 100;

            totalValue += holding.currentValue;
            totalCost += holding.totalCost;
          }
        } catch (error) {
          console.error(`獲取 ${stockId} 價格失敗:`, error);
        }

        holdingsArray.push(holding);
      }
    }

    // 格式化交易記錄
    const formattedTransactions = portfolio.transactions.map((transaction) => ({
      transaction_id: Number(transaction.transaction_id),
      stock_id: transaction.stock_id,
      stock_name: transaction.stocks.company_name,
      transaction_type: transaction.transaction_type,
      quantity: Number(transaction.quantity),
      price_per_share: Number(transaction.price_per_share),
      total_value:
        Number(transaction.quantity) * Number(transaction.price_per_share),
      transaction_date: transaction.transaction_date,
      currency: transaction.currency,
    }));

    const responseData = {
      portfolio_id: Number(portfolio.portfolio_id),
      id: `pf${Number(portfolio.portfolio_id)}`, // 保持前端一致的格式
      name: portfolio.portfolio_name,
      description: portfolio.description,
      created_at: portfolio.created_at,
      summary: {
        total_market_value: totalValue,
        total_cost_basis: totalCost,
        unrealized_pnl: totalValue - totalCost,
        unrealized_pnl_percent:
          totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      },
      holdings: holdingsArray,
      transactions: formattedTransactions,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("獲取投資組合詳細資訊失敗:", error);
    return NextResponse.json(
      { error: "獲取投資組合詳細資訊時發生錯誤" },
      { status: 500 }
    );
  }
}

// 更新投資組合資訊
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { portfolioId } = await params;
    const cleanPortfolioId = parsePortfolioId(portfolioId); // 使用輔助函數
    const userIdAsBigInt = BigInt(session.user.id);
    const portfolioIdAsBigInt = BigInt(cleanPortfolioId);
    const body = await request.json();
    const { portfolio_name, description } = body;

    if (!portfolio_name?.trim()) {
      return NextResponse.json(
        { error: "投資組合名稱為必填" },
        { status: 400 }
      );
    }

    // 驗證投資組合是否屬於當前用戶
    const existingPortfolio = await prisma.portfolios.findFirst({
      where: {
        portfolio_id: portfolioIdAsBigInt,
        user_id: userIdAsBigInt,
      },
    });

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: "找不到指定的投資組合或無權限" },
        { status: 404 }
      );
    }

    // 檢查新名稱是否與其他投資組合重複
    const duplicatePortfolio = await prisma.portfolios.findFirst({
      where: {
        user_id: userIdAsBigInt,
        portfolio_name: portfolio_name.trim(),
        portfolio_id: { not: portfolioIdAsBigInt },
      },
    });

    if (duplicatePortfolio) {
      return NextResponse.json(
        { error: "投資組合名稱已存在" },
        { status: 409 }
      );
    }

    // 更新投資組合
    const updatedPortfolio = await prisma.portfolios.update({
      where: {
        portfolio_id: portfolioIdAsBigInt,
      },
      data: {
        portfolio_name: portfolio_name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        portfolio_id: Number(updatedPortfolio.portfolio_id),
        id: `pf${Number(updatedPortfolio.portfolio_id)}`, // 保持前端一致的格式
        name: updatedPortfolio.portfolio_name,
        description: updatedPortfolio.description,
        created_at: updatedPortfolio.created_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("更新投資組合失敗:", error);
    return NextResponse.json(
      { error: "更新投資組合時發生錯誤" },
      { status: 500 }
    );
  }
}

// 刪除投資組合
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { portfolioId } = await params;
    const cleanPortfolioId = parsePortfolioId(portfolioId); // 使用輔助函數
    const userIdAsBigInt = BigInt(session.user.id);
    const portfolioIdAsBigInt = BigInt(cleanPortfolioId);

    // 驗證投資組合是否屬於當前用戶
    const existingPortfolio = await prisma.portfolios.findFirst({
      where: {
        portfolio_id: portfolioIdAsBigInt,
        user_id: userIdAsBigInt,
      },
    });

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: "找不到指定的投資組合或無權限" },
        { status: 404 }
      );
    }

    // 刪除投資組合（由於設置了 onDelete: Cascade，相關的交易記錄會自動刪除）
    await prisma.portfolios.delete({
      where: {
        portfolio_id: portfolioIdAsBigInt,
      },
    });

    return NextResponse.json(
      { message: `投資組合 "${existingPortfolio.portfolio_name}" 已成功刪除` },
      { status: 200 }
    );
  } catch (error) {
    console.error("刪除投資組合失敗:", error);
    return NextResponse.json(
      { error: "刪除投資組合時發生錯誤" },
      { status: 500 }
    );
  }
}
