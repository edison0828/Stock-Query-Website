export class AlertDomainError extends Error {
  constructor(message, { status = 400, code = "ALERT_DOMAIN_ERROR", details } = {}) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class AlertValidationError extends AlertDomainError {
  constructor(message, options = {}) {
    super(message, {
      status: 400,
      code: "ALERT_VALIDATION_ERROR",
      ...options,
    });
  }
}
