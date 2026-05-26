export class TradingStrategy {
  constructor({ type, name, parameters }) {
    this.type = type;
    this.name = name;
    this.parameters = parameters;
  }

  getWarmupPeriod() {
    return 0;
  }

  generateSignals() {
    throw new Error("generateSignals must be implemented by strategy subclasses");
  }
}
