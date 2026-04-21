import { MovingAverageIndicator } from "./MovingAverageIndicator";
import { BacktestValidationError } from "./errors";

export class MovingAverageCrossStrategy {
  constructor({ shortWindow, longWindow }) {
    if (!Number.isInteger(shortWindow) || !Number.isInteger(longWindow)) {
      throw new BacktestValidationError("均線參數必須是整數");
    }

    if (shortWindow <= 0 || longWindow <= 0) {
      throw new BacktestValidationError("均線參數必須大於 0");
    }

    if (shortWindow >= longWindow) {
      throw new BacktestValidationError("短均線週期必須小於長均線週期");
    }

    this.type = "MOVING_AVERAGE_CROSS";
    this.name = `均線交叉策略 (${shortWindow}/${longWindow})`;
    this.shortWindow = shortWindow;
    this.longWindow = longWindow;
    this.shortIndicator = new MovingAverageIndicator(shortWindow);
    this.longIndicator = new MovingAverageIndicator(longWindow);
  }

  generateSignals(priceSeries) {
    const shortValues = this.shortIndicator.calculate(priceSeries);
    const longValues = this.longIndicator.calculate(priceSeries);
    const signals = [];

    for (let index = 1; index < priceSeries.length; index += 1) {
      const previousShort = shortValues[index - 1];
      const previousLong = longValues[index - 1];
      const currentShort = shortValues[index];
      const currentLong = longValues[index];

      if (
        previousShort === null ||
        previousLong === null ||
        currentShort === null ||
        currentLong === null
      ) {
        continue;
      }

      if (previousShort <= previousLong && currentShort > currentLong) {
        signals.push({
          type: "BUY",
          date: priceSeries[index].date,
          price: priceSeries[index].closePrice,
          reason: `短均線 ${this.shortWindow} 日向上突破 ${this.longWindow} 日`,
        });
      } else if (previousShort >= previousLong && currentShort < currentLong) {
        signals.push({
          type: "SELL",
          date: priceSeries[index].date,
          price: priceSeries[index].closePrice,
          reason: `短均線 ${this.shortWindow} 日向下跌破 ${this.longWindow} 日`,
        });
      }
    }

    return signals;
  }
}
