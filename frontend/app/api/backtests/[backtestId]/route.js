import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function toNumber(value, digits = 4) {
  return value === null || value === undefined ? null : Number(Number(value).toFixed(digits));
}

function formatRunDetail(run) {
  return {
    backtest_run_id: Number(run.backtest_run_id),
    stock_id: run.stock_id,
    company_name: run.stocks.company_name,
    strategy_type: run.strategy_type,
    strategy_name: run.strategy_name,
    start_date: run.start_date,
    end_date: run.end_date,
    short_window: run.short_window,
    long_window: run.long_window,
    initial_capital: Number(run.initial_capital),
    final_value: Number(run.final_value),
    total_return_percent: toNumber(run.total_return_percent),
    max_drawdown_percent: toNumber(run.max_drawdown_percent),
    win_rate_percent: toNumber(run.win_rate_percent),
    trade_count: run.trade_count,
    signal_count: run.signal_count,
    equity_curve: Array.isArray(run.equity_curve)
      ? run.equity_curve.map((point) => ({
          date: point.date,
          value: Number(point.value),
        }))
      : [],
    trades: run.backtesttrades.map((trade) => ({
      backtest_trade_id: Number(trade.backtest_trade_id),
      trade_type: trade.trade_type,
      trade_date: trade.trade_date,
      price: Number(trade.price),
      quantity: Number(trade.quantity),
      cash_after: Number(trade.cash_after),
      equity_after: Number(trade.equity_after),
      pnl_amount: trade.pnl_amount === null ? null : Number(trade.pnl_amount),
      return_percent:
        trade.return_percent === null ? null : toNumber(trade.return_percent),
      reason: trade.reason,
    })),
    created_at: run.created_at,
  };
}

export async function GET(_request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { backtestId } = params;
    const backtestRunId = BigInt(backtestId);
    const userIdAsBigInt = BigInt(session.user.id);

    const run = await prisma.backtestruns.findFirst({
      where: {
        backtest_run_id: backtestRunId,
        user_id: userIdAsBigInt,
      },
      include: {
        stocks: {
          select: {
            company_name: true,
          },
        },
        backtesttrades: {
          orderBy: [
            { trade_date: "asc" },
            { backtest_trade_id: "asc" },
          ],
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "找不到指定的回測紀錄或無權限" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatRunDetail(run), { status: 200 });
  } catch (error) {
    console.error("獲取 backtest detail 失敗:", error);
    return NextResponse.json(
      { error: "獲取回測細節時發生錯誤" },
      { status: 500 }
    );
  }
}
