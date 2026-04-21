import { BacktestValidationError } from "./errors";

export class MovingAverageIndicator {
  constructor(windowSize) {
    if (!Number.isInteger(windowSize) || windowSize <= 0) {
      throw new BacktestValidationError("均線週期必須是正整數");
    }

    this.windowSize = windowSize;
  }

  calculate(priceSeries) {
    const values = new Array(priceSeries.length).fill(null);
    let rollingSum = 0;

    for (let index = 0; index < priceSeries.length; index += 1) {
      rollingSum += priceSeries[index].closePrice;

      if (index >= this.windowSize) {
        rollingSum -= priceSeries[index - this.windowSize].closePrice;
      }

      if (index >= this.windowSize - 1) {
        values[index] = rollingSum / this.windowSize;
      }
    }

    return values;
  }
}
