export class BacktestTrade {
  constructor({
    tradeType,
    tradeDate,
    price,
    quantity,
    cashAfter,
    equityAfter,
    pnlAmount = null,
    returnPercent = null,
    reason = null,
  }) {
    this.tradeType = tradeType;
    this.tradeDate = new Date(tradeDate);
    this.price = Number(price);
    this.quantity = Number(quantity);
    this.cashAfter = Number(cashAfter);
    this.equityAfter = Number(equityAfter);
    this.pnlAmount =
      pnlAmount === null || pnlAmount === undefined ? null : Number(pnlAmount);
    this.returnPercent =
      returnPercent === null || returnPercent === undefined
        ? null
        : Number(returnPercent);
    this.reason = reason;
  }

  toPersistence() {
    return {
      trade_type: this.tradeType,
      trade_date: this.tradeDate,
      price: this.price,
      quantity: this.quantity,
      cash_after: this.cashAfter,
      equity_after: this.equityAfter,
      pnl_amount: this.pnlAmount,
      return_percent: this.returnPercent,
      reason: this.reason,
    };
  }
}
