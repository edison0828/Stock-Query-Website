import { BacktestValidationError } from "../errors";

export class ExecutionPolicy {
  constructor({ sizingMode = "FULL_CAPITAL", positionSizePercent = 100 } = {}) {
    this.sizingMode = sizingMode;
    this.positionSizePercent = Number(positionSizePercent);

    if (!["FULL_CAPITAL", "PERCENT_OF_CASH"].includes(this.sizingMode)) {
      throw new BacktestValidationError("資金投入方式不正確");
    }

    if (
      !Number.isFinite(this.positionSizePercent) ||
      this.positionSizePercent <= 0 ||
      this.positionSizePercent > 100
    ) {
      throw new BacktestValidationError("投入比例必須介於 0 到 100");
    }
  }

  getBuyBudget(cash) {
    if (this.sizingMode === "FULL_CAPITAL") {
      return cash;
    }

    return cash * (this.positionSizePercent / 100);
  }

  toConfig() {
    return {
      sizingMode: this.sizingMode,
      positionSizePercent: this.positionSizePercent,
    };
  }
}
