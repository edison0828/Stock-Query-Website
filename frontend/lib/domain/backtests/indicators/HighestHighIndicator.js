import { BacktestValidationError } from "../errors";

export class HighestHighIndicator {
  constructor(windowSize) {
    if (!Number.isInteger(windowSize) || windowSize <= 0) {
      throw new BacktestValidationError("突破觀察天數必須是正整數");
    }

    this.windowSize = windowSize;
  }

  calculate(priceSeries) {
    const values = new Array(priceSeries.length).fill(null);

    for (let index = this.windowSize; index < priceSeries.length; index += 1) {
      let highest = priceSeries[index - this.windowSize].closePrice;

      for (let offset = index - this.windowSize + 1; offset < index; offset += 1) {
        highest = Math.max(highest, priceSeries[offset].closePrice);
      }

      values[index] = highest;
    }

    return values;
  }
}
