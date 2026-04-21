export class BacktestDomainError extends Error {
  constructor(
    message,
    { status = 400, code = "BACKTEST_DOMAIN_ERROR", details } = {}
  ) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BacktestValidationError extends BacktestDomainError {
  constructor(message, options = {}) {
    super(message, {
      status: 400,
      code: "BACKTEST_VALIDATION_ERROR",
      ...options,
    });
  }
}
