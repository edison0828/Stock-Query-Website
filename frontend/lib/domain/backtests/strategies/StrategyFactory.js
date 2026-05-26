import { BacktestValidationError } from "../errors";
import { BreakoutStrategy } from "./BreakoutStrategy";
import { MovingAverageCrossStrategy } from "./MovingAverageCrossStrategy";
import { RsiReversionStrategy } from "./RsiReversionStrategy";

function numberFrom(value, fallback = undefined) {
  const numericValue = Number(value ?? fallback);
  return Number.isFinite(numericValue) ? numericValue : NaN;
}

export class StrategyFactory {
  static create({ type, parameters = {} }) {
    switch (type) {
      case "MOVING_AVERAGE_CROSS":
        return new MovingAverageCrossStrategy({
          shortWindow: numberFrom(parameters.shortWindow),
          longWindow: numberFrom(parameters.longWindow),
        });
      case "RSI_REVERSION":
        return new RsiReversionStrategy({
          rsiWindow: numberFrom(parameters.rsiWindow),
          oversoldThreshold: numberFrom(parameters.oversoldThreshold),
          overboughtThreshold: numberFrom(parameters.overboughtThreshold),
        });
      case "BREAKOUT":
        return new BreakoutStrategy({
          lookbackWindow: numberFrom(parameters.lookbackWindow),
        });
      default:
        throw new BacktestValidationError("目前不支援此回測策略");
    }
  }
}
