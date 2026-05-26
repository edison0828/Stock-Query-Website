export class BacktestPosition {
  constructor() {
    this.quantity = 0;
    this.costBasis = 0;
  }

  hasShares() {
    return this.quantity > 0;
  }

  add({ quantity, totalCost }) {
    this.quantity += quantity;
    this.costBasis += totalCost;
  }

  close() {
    const closed = {
      quantity: this.quantity,
      costBasis: this.costBasis,
    };

    this.quantity = 0;
    this.costBasis = 0;

    return closed;
  }

  getMarketValue(price) {
    return this.quantity * price;
  }
}
