import { BacktestValidationError } from "../errors";

export class RsiIndicator {
  constructor(windowSize) {
    if (!Number.isInteger(windowSize) || windowSize <= 0) {
      throw new BacktestValidationError("RSI 週期必須是正整數");
    }

    this.windowSize = windowSize;
  }

  calculate(priceSeries) {
    const values = new Array(priceSeries.length).fill(null);

    for (let index = this.windowSize; index < priceSeries.length; index += 1) {
      let gains = 0;
      let losses = 0;

      for (let offset = index - this.windowSize + 1; offset <= index; offset += 1) {
        const change =
          priceSeries[offset].closePrice - priceSeries[offset - 1].closePrice;

        if (change >= 0) {
          gains += change;
        } else {
          losses += Math.abs(change);
        }
      }

      const averageGain = gains / this.windowSize;
      const averageLoss = losses / this.windowSize;
      values[index] =
        averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
    }

    return values;
  }
}
