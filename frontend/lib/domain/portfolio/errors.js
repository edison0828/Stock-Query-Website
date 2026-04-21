export class PortfolioDomainError extends Error {
  constructor(
    message,
    { status = 400, code = "PORTFOLIO_DOMAIN_ERROR", details } = {}
  ) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class TransactionValidationError extends PortfolioDomainError {
  constructor(message, options = {}) {
    super(message, {
      status: 400,
      code: "TRANSACTION_VALIDATION_ERROR",
      ...options,
    });
  }
}
