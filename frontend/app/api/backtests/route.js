import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  BacktestDomainError,
  BacktestEngine,
  BacktestMarketDataService,
  BacktestValidationError,
  BrokerageFeeModel,
  ExecutionPolicy,
  StrategyFactory,
} from "@/lib/domain/backtests";

const marketDataService = new BacktestMarketDataService(prisma);
const backtestEngine = new BacktestEngine();

function getSessionUserId(session) {
  if (!session?.user?.id) {
    throw new BacktestValidationError("未授權：需要登入", { status: 401 });
  }

  return BigInt(session.user.id);
}

function toNumber(value, digits = 4) {
  return value === null || value === undefined ? null : Number(Number(value).toFixed(digits));
}

function formatRunSummary(run) {
  return {
    backtest_run_id: Number(run.backtest_run_id),
    stock_id: run.stock_id,
    company_name: run.stocks?.company_name ?? null,
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
    created_at: run.created_at,
    parameters: run.parameters ?? null,
    execution_config: run.execution_config ?? null,
    annualized_return_percent: toNumber(run.annualized_return_percent),
    profit_factor: toNumber(run.profit_factor),
    average_win_percent: toNumber(run.average_win_percent),
    average_loss_percent: toNumber(run.average_loss_percent),
    max_consecutive_losses: run.max_consecutive_losses,
  };
}

function formatRunDetail(run) {
  return {
    ...formatRunSummary(run),
    equity_curve: Array.isArray(run.equity_curve)
      ? run.equity_curve.map((point) => ({
          date: point.date,
          value: Number(point.value),
        }))
      : [],
    trades: (run.backtesttrades || []).map((trade) => ({
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
      gross_amount: trade.gross_amount === null ? null : Number(trade.gross_amount),
      fee_amount: trade.fee_amount === null ? null : Number(trade.fee_amount),
      tax_amount: trade.tax_amount === null ? null : Number(trade.tax_amount),
      net_amount: trade.net_amount === null ? null : Number(trade.net_amount),
      position_after:
        trade.position_after === null ? null : Number(trade.position_after),
      reason: trade.reason,
    })),
  };
}

function normalizeStrategyParameters(strategyType, body) {
  const parameters = body.parameters || {};

  if (strategyType === "MOVING_AVERAGE_CROSS") {
    return {
      shortWindow: Number(parameters.shortWindow ?? body.short_window),
      longWindow: Number(parameters.longWindow ?? body.long_window),
    };
  }

  if (strategyType === "MA_CROSS_WITH_STOP_LOSS") {
    return {
      shortWindow: Number(parameters.shortWindow),
      longWindow: Number(parameters.longWindow),
      stopLossPercent: Number(parameters.stopLossPercent),
    };
  }

  if (strategyType === "RSI_REVERSION") {
    return {
      rsiWindow: Number(parameters.rsiWindow),
      oversoldThreshold: Number(parameters.oversoldThreshold),
      overboughtThreshold: Number(parameters.overboughtThreshold),
    };
  }

  if (strategyType === "BREAKOUT") {
    return {
      lookbackWindow: Number(parameters.lookbackWindow),
    };
  }

  if (strategyType === "BOLLINGER_REVERSION") {
    return {
      window: Number(parameters.window),
      standardDeviationMultiplier: Number(parameters.standardDeviationMultiplier),
    };
  }

  if (strategyType === "BUY_AND_HOLD") {
    return {};
  }

  return parameters;
}

function normalizeExecutionConfig(body) {
  const config = body.execution_config || {};

  return {
    sizingMode: config.sizingMode || "FULL_CAPITAL",
    positionSizePercent: Number(config.positionSizePercent ?? 100),
    feeRate: Number(config.feeRate ?? 0.001425),
    sellTaxRate: Number(config.sellTaxRate ?? 0.003),
    slippageRate: Number(config.slippageRate ?? 0),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userIdAsBigInt = getSessionUserId(session);

    const runs = await prisma.backtestruns.findMany({
      where: {
        user_id: userIdAsBigInt,
      },
      include: {
        stocks: {
          select: {
            company_name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 20,
    });

    return NextResponse.json(
      {
        items: runs.map(formatRunSummary),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof BacktestDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("獲取 backtests 失敗:", error);
    return NextResponse.json(
      { error: "獲取回測紀錄時發生錯誤" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const userIdAsBigInt = getSessionUserId(session);
    const body = await request.json();

    const stockId = body.stock_id?.toUpperCase();
    const strategyType = body.strategy_type;
    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);
    const initialCapital = Number(body.initial_capital);

    if (!stockId || !strategyType || !body.start_date || !body.end_date) {
      throw new BacktestValidationError("缺少必要的回測參數");
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BacktestValidationError("回測日期格式不正確");
    }

    if (startDate > endDate) {
      throw new BacktestValidationError("開始日期不能晚於結束日期");
    }

    const stock = await prisma.stocks.findUnique({
      where: {
        stock_id: stockId,
      },
      select: {
        stock_id: true,
        company_name: true,
      },
    });

    if (!stock) {
      throw new BacktestValidationError(`找不到股票代號 ${stockId}`, {
        status: 404,
      });
    }

    const strategy = StrategyFactory.create({
      type: strategyType,
      parameters: normalizeStrategyParameters(strategyType, body),
    });
    const executionConfig = normalizeExecutionConfig(body);
    const executionPolicy = new ExecutionPolicy(executionConfig);
    const brokerageFeeModel = new BrokerageFeeModel(executionConfig);
    const priceSeries = await marketDataService.getPriceSeries(stockId, {
      startDate,
      endDate,
    });
    const result = backtestEngine.run({
      strategy,
      priceSeries,
      initialCapital,
      executionPolicy,
      brokerageFeeModel,
    });

    const createdRun = await prisma.backtestruns.create({
      data: {
        user_id: userIdAsBigInt,
        stock_id: stockId,
        strategy_type: result.strategyType,
        strategy_name: result.strategyName,
        start_date: startDate,
        end_date: endDate,
        initial_capital: result.initialCapital,
        final_value: result.performance.finalValue,
        total_return_percent: result.performance.totalReturnPercent,
        max_drawdown_percent: result.performance.maxDrawdownPercent,
        win_rate_percent: result.performance.winRatePercent,
        trade_count: result.performance.tradeCount,
        signal_count: result.signalCount,
        short_window: result.shortWindow,
        long_window: result.longWindow,
        parameters: result.parameters,
        execution_config: result.executionConfig,
        annualized_return_percent: result.performance.annualizedReturnPercent,
        profit_factor: result.performance.profitFactor,
        average_win_percent: result.performance.averageWinPercent,
        average_loss_percent: result.performance.averageLossPercent,
        max_consecutive_losses: result.performance.maxConsecutiveLosses,
        equity_curve: result.equityCurve,
        backtesttrades: {
          create: result.trades.map((trade) => trade.toPersistence()),
        },
      },
      include: {
        stocks: {
          select: {
            company_name: true,
          },
        },
        backtesttrades: {
          orderBy: {
            trade_date: "asc",
          },
        },
      },
    });

    return NextResponse.json(formatRunDetail(createdRun), { status: 201 });
  } catch (error) {
    if (error instanceof BacktestDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("建立 backtest 失敗:", error);
    return NextResponse.json(
      { error: "建立回測時發生錯誤" },
      { status: 500 }
    );
  }
}
