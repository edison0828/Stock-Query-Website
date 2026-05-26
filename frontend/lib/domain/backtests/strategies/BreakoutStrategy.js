import { HighestHighIndicator } from "../indicators/HighestHighIndicator";
import { BacktestValidationError } from "../errors";
import { TradingStrategy } from "./TradingStrategy";

export class BreakoutStrategy extends TradingStrategy {
  constructor({ lookbackWindow }) {
    if (!Number.isInteger(lookbackWindow) || lookbackWindow <= 1) {
      throw new BacktestValidationError("突破觀察天數必須是大於 1 的整數");
    }

    super({
      type: "BREAKOUT",
      name: `價格突破策略 (${lookbackWindow})`,
      parameters: { lookbackWindow },
    });

    this.lookbackWindow = lookbackWindow;
    this.highestHighIndicator = new HighestHighIndicator(lookbackWindow);
  }

  getWarmupPeriod() {
    return this.lookbackWindow;
  }

  generateSignals(priceSeries) {
    const highestHighValues = this.highestHighIndicator.calculate(priceSeries);
    const signals = [];

    for (let index = 1; index < priceSeries.length; index += 1) {
      const previousHigh = highestHighValues[index - 1];
      const currentHigh = highestHighValues[index];

      if (previousHigh === null || currentHigh === null) {
        continue;
      }

      const previousClose = priceSeries[index - 1].closePrice;
      const currentClose = priceSeries[index].closePrice;

      if (previousClose <= currentHigh && currentClose > currentHigh) {
        signals.push({
          type: "BUY",
          date: priceSeries[index].date,
          price: currentClose,
          reason: `收盤價突破近 ${this.lookbackWindow} 日高點`,
        });
      } else if (previousClose >= previousHigh && currentClose < previousHigh) {
        signals.push({
          type: "SELL",
          date: priceSeries[index].date,
          price: currentClose,
          reason: `收盤價跌回近 ${this.lookbackWindow} 日高點下方`,
        });
      }
    }

    return signals;
  }
}
