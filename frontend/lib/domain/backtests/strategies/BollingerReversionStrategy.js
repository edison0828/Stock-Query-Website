import { BollingerBandsIndicator } from "../indicators/BollingerBandsIndicator";
import { TradingStrategy } from "./TradingStrategy";

export class BollingerReversionStrategy extends TradingStrategy {
  constructor({ window, standardDeviationMultiplier }) {
    super({
      type: "BOLLINGER_REVERSION",
      name: `布林通道反轉策略 (${window}, ${standardDeviationMultiplier})`,
      parameters: { window, standardDeviationMultiplier },
    });

    this.window = window;
    this.standardDeviationMultiplier = standardDeviationMultiplier;
    this.indicator = new BollingerBandsIndicator({
      windowSize: window,
      standardDeviationMultiplier,
    });
  }

  getWarmupPeriod() {
    return this.window;
  }

  generateSignals(priceSeries) {
    const bands = this.indicator.calculate(priceSeries);
    const signals = [];

    for (let index = 1; index < priceSeries.length; index += 1) {
      const previousBands = bands[index - 1];
      const currentBands = bands[index];

      if (previousBands === null || currentBands === null) {
        continue;
      }

      const previousClose = priceSeries[index - 1].closePrice;
      const currentClose = priceSeries[index].closePrice;

      if (previousClose >= previousBands.lower && currentClose < currentBands.lower) {
        signals.push({
          type: "BUY",
          date: priceSeries[index].date,
          price: currentClose,
          reason: "收盤價跌破布林下軌",
        });
      } else if (
        previousClose <= previousBands.middle &&
        currentClose > currentBands.middle
      ) {
        signals.push({
          type: "SELL",
          date: priceSeries[index].date,
          price: currentClose,
          reason: "收盤價回到布林中線上方",
        });
      }
    }

    return signals;
  }
}
