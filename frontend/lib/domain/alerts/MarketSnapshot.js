export class MarketSnapshot {
  constructor({
    stockId,
    companyName = null,
    currentPrice = null,
    previousClose = null,
    marketDate = null,
  }) {
    this.stockId = stockId;
    this.companyName = companyName || stockId;
    this.currentPrice =
      currentPrice === null || currentPrice === undefined
        ? null
        : Number(currentPrice);
    this.previousClose =
      previousClose === null || previousClose === undefined
        ? null
        : Number(previousClose);
    this.marketDate = marketDate ? new Date(marketDate) : null;
  }

  hasCurrentPrice() {
    return this.currentPrice !== null;
  }

  getPriceChange() {
    if (this.currentPrice === null || this.previousClose === null) {
      return 0;
    }

    return this.currentPrice - this.previousClose;
  }

  getPercentChange() {
    if (
      this.currentPrice === null ||
      this.previousClose === null ||
      this.previousClose === 0
    ) {
      return 0;
    }

    return (this.getPriceChange() / this.previousClose) * 100;
  }
}
