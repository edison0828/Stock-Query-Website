import { BacktestValidationError } from "../errors";

export class BollingerBandsIndicator {
  constructor({ windowSize, standardDeviationMultiplier }) {
    if (!Number.isInteger(windowSize) || windowSize <= 1) {
      throw new BacktestValidationError("布林通道週期必須是大於 1 的整數");
    }

    if (
      !Number.isFinite(standardDeviationMultiplier) ||
      standardDeviationMultiplier <= 0
    ) {
      throw new BacktestValidationError("標準差倍數必須大於 0");
    }

    this.windowSize = windowSize;
    this.standardDeviationMultiplier = standardDeviationMultiplier;
  }

  calculate(priceSeries) {
    const values = new Array(priceSeries.length).fill(null);

    for (let index = this.windowSize - 1; index < priceSeries.length; index += 1) {
      const windowPoints = priceSeries.slice(index - this.windowSize + 1, index + 1);
      const closes = windowPoints.map((point) => point.closePrice);
      const middle = closes.reduce((sum, close) => sum + close, 0) / this.windowSize;
      const variance =
        closes.reduce((sum, close) => sum + Math.pow(close - middle, 2), 0) /
        this.windowSize;
      const standardDeviation = Math.sqrt(variance);
      const bandWidth = standardDeviation * this.standardDeviationMultiplier;

      values[index] = {
        lower: middle - bandWidth,
        middle,
        upper: middle + bandWidth,
      };
    }

    return values;
  }
}
