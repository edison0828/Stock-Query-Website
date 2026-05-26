import { MovingAverageIndicator } from "../MovingAverageIndicator";
import { BacktestValidationError } from "../errors";
import { TradingStrategy } from "./TradingStrategy";

export class MovingAverageCrossWithStopLossStrategy extends TradingStrategy {
  constructor({ shortWindow, longWindow, stopLossPercent }) {
    if (!Number.isInteger(shortWindow) || !Number.isInteger(longWindow)) {
      throw new BacktestValidationError("均線參數必須是整數");
    }

    if (shortWindow <= 0 || longWindow <= 0) {
      throw new BacktestValidationError("均線參數必須大於 0");
    }

    if (shortWindow >= longWindow) {
      throw new BacktestValidationError("短均線週期必須小於長均線週期");
    }

    if (!Number.isFinite(stopLossPercent) || stopLossPercent <= 0) {
      throw new BacktestValidationError("停損百分比必須大於 0");
    }

    super({
      type: "MA_CROSS_WITH_STOP_LOSS",
      name: `均線交叉停損策略 (${shortWindow}/${longWindow}, ${stopLossPercent}%)`,
      parameters: { shortWindow, longWindow, stopLossPercent },
    });

    this.shortWindow = shortWindow;
    this.longWindow = longWindow;
    this.stopLossPercent = stopLossPercent;
    this.shortIndicator = new MovingAverageIndicator(shortWindow);
    this.longIndicator = new MovingAverageIndicator(longWindow);
  }

  getWarmupPeriod() {
    return this.longWindow;
  }

  generateSignals(priceSeries) {
    const shortValues = this.shortIndicator.calculate(priceSeries);
    const longValues = this.longIndicator.calculate(priceSeries);
    const signals = [];
    let inPosition = false;
    let entryPrice = 0;

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

      const currentPrice = priceSeries[index].closePrice;
      const stopLossPrice = entryPrice * (1 - this.stopLossPercent / 100);

      if (!inPosition && previousShort <= previousLong && currentShort > currentLong) {
        inPosition = true;
        entryPrice = currentPrice;
        signals.push({
          type: "BUY",
          date: priceSeries[index].date,
          price: currentPrice,
          reason: `短均線 ${this.shortWindow} 日向上突破 ${this.longWindow} 日`,
        });
      } else if (inPosition && currentPrice <= stopLossPrice) {
        inPosition = false;
        entryPrice = 0;
        signals.push({
          type: "SELL",
          date: priceSeries[index].date,
          price: currentPrice,
          reason: `價格觸及 ${this.stopLossPercent}% 停損`,
        });
      } else if (inPosition && previousShort >= previousLong && currentShort < currentLong) {
        inPosition = false;
        entryPrice = 0;
        signals.push({
          type: "SELL",
          date: priceSeries[index].date,
          price: currentPrice,
          reason: `短均線 ${this.shortWindow} 日向下跌破 ${this.longWindow} 日`,
        });
      }
    }

    return signals;
  }
}
