export class HistoricalPricePoint {
  constructor({ date, closePrice }) {
    this.date = new Date(date);
    this.closePrice = Number(closePrice);
  }

  getDateKey() {
    return this.date.toISOString().slice(0, 10);
  }
}
