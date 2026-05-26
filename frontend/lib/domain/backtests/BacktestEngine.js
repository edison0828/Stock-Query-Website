import { BacktestValidationError } from "./errors";
import { PerformanceReport } from "./PerformanceReport";
import { BacktestPortfolio } from "./execution/BacktestPortfolio";
import { BrokerageFeeModel } from "./execution/BrokerageFeeModel";
import { ExecutionPolicy } from "./execution/ExecutionPolicy";

function roundNumber(value, digits = 6) {
  return Number(value.toFixed(digits));
}

export class BacktestEngine {
  run({
    strategy,
    priceSeries,
    initialCapital,
    executionPolicy = new ExecutionPolicy(),
    brokerageFeeModel = new BrokerageFeeModel(),
  }) {
    if (!Array.isArray(priceSeries) || priceSeries.length === 0) {
      throw new BacktestValidationError("沒有可用的歷史股價資料");
    }

    if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
      throw new BacktestValidationError("初始資金必須大於 0");
    }

    if (priceSeries.length <= strategy.getWarmupPeriod()) {
      throw new BacktestValidationError("歷史資料長度不足以支援目前的策略參數");
    }

    const signals = strategy.generateSignals(priceSeries);
    const signalsByDate = new Map(
      signals.map((signal) => [new Date(signal.date).toISOString().slice(0, 10), signal])
    );

    const trades = [];
    const equityCurve = [];
    const portfolio = new BacktestPortfolio({ initialCapital });

    for (const point of priceSeries) {
      const dateKey = point.getDateKey();
      const signal = signalsByDate.get(dateKey);

      if (signal?.type === "BUY" && !portfolio.hasPosition()) {
        const trade = portfolio.buy({
          date: point.date,
          price: point.closePrice,
          budget: executionPolicy.getBuyBudget(portfolio.cash),
          feeModel: brokerageFeeModel,
          reason: signal.reason,
        });

        if (trade) {
          trades.push(trade);
        }
      } else if (signal?.type === "SELL" && portfolio.hasPosition()) {
        const trade = portfolio.sellAll({
          date: point.date,
          price: point.closePrice,
          feeModel: brokerageFeeModel,
          reason: signal.reason,
        });

        if (trade) {
          trades.push(trade);
        }
      }

      equityCurve.push({
        date: dateKey,
        value: roundNumber(portfolio.getEquity(point.closePrice)),
      });
    }

    const lastPoint = priceSeries[priceSeries.length - 1];

    if (portfolio.hasPosition()) {
      const trade = portfolio.sellAll({
        date: lastPoint.date,
        price: lastPoint.closePrice,
        feeModel: brokerageFeeModel,
        reason: "回測結束強制平倉",
      });

      if (trade) {
        trades.push(trade);
      }

      if (equityCurve.length > 0) {
        equityCurve[equityCurve.length - 1] = {
          date: lastPoint.getDateKey(),
          value: roundNumber(portfolio.cash),
        };
      }
    }

    const performance = PerformanceReport.fromBacktest({
      initialCapital,
      finalValue: portfolio.cash,
      equityCurve,
      trades,
    });

    return {
      strategyType: strategy.type,
      strategyName: strategy.name,
      parameters: strategy.parameters,
      executionConfig: {
        ...executionPolicy.toConfig(),
        ...brokerageFeeModel.toConfig(),
      },
      shortWindow: strategy.parameters.shortWindow ?? null,
      longWindow: strategy.parameters.longWindow ?? null,
      initialCapital: roundNumber(initialCapital),
      signalCount: signals.length,
      equityCurve,
      trades,
      performance,
    };
  }
}
