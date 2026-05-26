import { RsiIndicator } from "../indicators/RsiIndicator";
import { BacktestValidationError } from "../errors";
import { TradingStrategy } from "./TradingStrategy";

export class RsiReversionStrategy extends TradingStrategy {
  constructor({ rsiWindow, oversoldThreshold, overboughtThreshold }) {
    if (!Number.isInteger(rsiWindow) || rsiWindow <= 0) {
      throw new BacktestValidationError("RSI 週期必須是正整數");
    }

    if (
      !Number.isFinite(oversoldThreshold) ||
      !Number.isFinite(overboughtThreshold) ||
      oversoldThreshold <= 0 ||
      overboughtThreshold >= 100 ||
      oversoldThreshold >= overboughtThreshold
    ) {
      throw new BacktestValidationError("RSI 門檻設定不正確");
    }

    super({
      type: "RSI_REVERSION",
      name: `RSI 反轉策略 (${rsiWindow}, ${oversoldThreshold}/${overboughtThreshold})`,
      parameters: { rsiWindow, oversoldThreshold, overboughtThreshold },
    });

    this.rsiWindow = rsiWindow;
    this.oversoldThreshold = oversoldThreshold;
    this.overboughtThreshold = overboughtThreshold;
    this.rsiIndicator = new RsiIndicator(rsiWindow);
  }

  getWarmupPeriod() {
    return this.rsiWindow;
  }

  generateSignals(priceSeries) {
    const rsiValues = this.rsiIndicator.calculate(priceSeries);
    const signals = [];

    for (let index = 1; index < priceSeries.length; index += 1) {
      const previousRsi = rsiValues[index - 1];
      const currentRsi = rsiValues[index];

      if (previousRsi === null || currentRsi === null) {
        continue;
      }

      if (
        previousRsi >= this.oversoldThreshold &&
        currentRsi < this.oversoldThreshold
      ) {
        signals.push({
          type: "BUY",
          date: priceSeries[index].date,
          price: priceSeries[index].closePrice,
          reason: `RSI 跌破超賣門檻 ${this.oversoldThreshold}`,
        });
      } else if (
        previousRsi <= this.overboughtThreshold &&
        currentRsi > this.overboughtThreshold
      ) {
        signals.push({
          type: "SELL",
          date: priceSeries[index].date,
          price: priceSeries[index].closePrice,
          reason: `RSI 突破超買門檻 ${this.overboughtThreshold}`,
        });
      }
    }

    return signals;
  }
}
