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
    grossAmount = null,
    feeAmount = null,
    taxAmount = null,
    netAmount = null,
    positionAfter = null,
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
    this.grossAmount =
      grossAmount === null || grossAmount === undefined ? null : Number(grossAmount);
    this.feeAmount =
      feeAmount === null || feeAmount === undefined ? null : Number(feeAmount);
    this.taxAmount =
      taxAmount === null || taxAmount === undefined ? null : Number(taxAmount);
    this.netAmount =
      netAmount === null || netAmount === undefined ? null : Number(netAmount);
    this.positionAfter =
      positionAfter === null || positionAfter === undefined
        ? null
        : Number(positionAfter);
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
      gross_amount: this.grossAmount,
      fee_amount: this.feeAmount,
      tax_amount: this.taxAmount,
      net_amount: this.netAmount,
      position_after: this.positionAfter,
      reason: this.reason,
    };
  }
}
