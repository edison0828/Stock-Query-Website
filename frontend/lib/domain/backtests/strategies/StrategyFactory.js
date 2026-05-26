import { BacktestValidationError } from "../errors";
import { BollingerReversionStrategy } from "./BollingerReversionStrategy";
import { BreakoutStrategy } from "./BreakoutStrategy";
import { BuyAndHoldStrategy } from "./BuyAndHoldStrategy";
import { MovingAverageCrossStrategy } from "./MovingAverageCrossStrategy";
import { MovingAverageCrossWithStopLossStrategy } from "./MovingAverageCrossWithStopLossStrategy";
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
      case "BUY_AND_HOLD":
        return new BuyAndHoldStrategy();
      case "MA_CROSS_WITH_STOP_LOSS":
        return new MovingAverageCrossWithStopLossStrategy({
          shortWindow: numberFrom(parameters.shortWindow),
          longWindow: numberFrom(parameters.longWindow),
          stopLossPercent: numberFrom(parameters.stopLossPercent),
        });
      case "BOLLINGER_REVERSION":
        return new BollingerReversionStrategy({
          window: numberFrom(parameters.window),
          standardDeviationMultiplier: numberFrom(
            parameters.standardDeviationMultiplier
          ),
        });
      default:
        throw new BacktestValidationError("目前不支援此回測策略");
    }
  }
}
