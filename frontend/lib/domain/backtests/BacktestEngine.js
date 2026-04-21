import { BacktestValidationError } from "./errors";
import { BacktestTrade } from "./BacktestTrade";
import { PerformanceReport } from "./PerformanceReport";

function roundNumber(value, digits = 6) {
  return Number(value.toFixed(digits));
}

export class BacktestEngine {
  run({ strategy, priceSeries, initialCapital }) {
    if (!Array.isArray(priceSeries) || priceSeries.length === 0) {
      throw new BacktestValidationError("沒有可用的歷史股價資料");
    }

    if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
      throw new BacktestValidationError("初始資金必須大於 0");
    }

    if (priceSeries.length <= strategy.longWindow) {
      throw new BacktestValidationError("歷史資料長度不足以支援目前的均線參數");
    }

    const signals = strategy.generateSignals(priceSeries);
    const signalsByDate = new Map(
      signals.map((signal) => [new Date(signal.date).toISOString().slice(0, 10), signal])
    );

    const trades = [];
    const equityCurve = [];
    let cash = initialCapital;
    let quantity = 0;
    let entryCost = 0;

    for (const point of priceSeries) {
      const dateKey = point.getDateKey();
      const signal = signalsByDate.get(dateKey);

      if (signal?.type === "BUY" && quantity === 0 && point.closePrice > 0) {
        quantity = cash / point.closePrice;
        entryCost = cash;
        cash = 0;

        const equityAfter = quantity * point.closePrice;
        trades.push(
          new BacktestTrade({
            tradeType: "BUY",
            tradeDate: point.date,
            price: point.closePrice,
            quantity,
            cashAfter: cash,
            equityAfter,
            reason: signal.reason,
          })
        );
      } else if (signal?.type === "SELL" && quantity > 0) {
        const proceeds = quantity * point.closePrice;
        const pnlAmount = proceeds - entryCost;
        const returnPercent = entryCost === 0 ? 0 : (pnlAmount / entryCost) * 100;

        cash = proceeds;
        quantity = 0;
        entryCost = 0;

        trades.push(
          new BacktestTrade({
            tradeType: "SELL",
            tradeDate: point.date,
            price: point.closePrice,
            quantity: proceeds / point.closePrice,
            cashAfter: cash,
            equityAfter: cash,
            pnlAmount,
            returnPercent,
            reason: signal.reason,
          })
        );
      }

      const equityValue = cash + quantity * point.closePrice;
      equityCurve.push({
        date: dateKey,
        value: roundNumber(equityValue),
      });
    }

    const lastPoint = priceSeries[priceSeries.length - 1];

    if (quantity > 0) {
      const proceeds = quantity * lastPoint.closePrice;
      const pnlAmount = proceeds - entryCost;
      const returnPercent = entryCost === 0 ? 0 : (pnlAmount / entryCost) * 100;
      const soldQuantity = quantity;

      cash = proceeds;
      quantity = 0;
      entryCost = 0;

      trades.push(
        new BacktestTrade({
          tradeType: "SELL",
          tradeDate: lastPoint.date,
          price: lastPoint.closePrice,
          quantity: soldQuantity,
          cashAfter: cash,
          equityAfter: cash,
          pnlAmount,
          returnPercent,
          reason: "回測結束強制平倉",
        })
      );

      if (equityCurve.length > 0) {
        equityCurve[equityCurve.length - 1] = {
          date: lastPoint.getDateKey(),
          value: roundNumber(cash),
        };
      }
    }

    const performance = PerformanceReport.fromBacktest({
      initialCapital,
      finalValue: cash,
      equityCurve,
      trades,
    });

    return {
      strategyType: strategy.type,
      strategyName: strategy.name,
      shortWindow: strategy.shortWindow,
      longWindow: strategy.longWindow,
      initialCapital: roundNumber(initialCapital),
      signalCount: signals.length,
      equityCurve,
      trades,
      performance,
    };
  }
}
