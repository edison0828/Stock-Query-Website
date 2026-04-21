import { TransactionValidationError } from "./errors";

const EPSILON = 1e-9;

function normalizeZero(value) {
  return Math.abs(value) < EPSILON ? 0 : value;
}

export class Position {
  constructor({ stockId, symbol = stockId, name = stockId, currency = "TWD" }) {
    this.stockId = stockId;
    this.symbol = symbol;
    this.name = name;
    this.currency = currency;
    this.quantity = 0;
    this.costBasis = 0;
    this.realizedPnl = 0;
    this.currentPrice = null;
    this.lastPriceDate = null;
  }

  applyTransaction(transaction) {
    if (transaction.stockId !== this.stockId) {
      throw new TransactionValidationError("交易股票與持倉不一致");
    }

    if (transaction.isBuy()) {
      this.quantity = normalizeZero(this.quantity + transaction.quantity);
      this.costBasis = normalizeZero(this.costBasis + transaction.getBuyCost());
      return;
    }

    if (!transaction.isSell()) {
      throw new TransactionValidationError("不支援的交易類型");
    }

    if (transaction.quantity > this.quantity + EPSILON) {
      throw new TransactionValidationError(
        `庫存不足：您目前持有 ${this.quantity} 股 ${this.stockId}，無法賣出 ${transaction.quantity} 股`,
        {
          details: {
            stock_id: this.stockId,
            current_holding: this.quantity,
            requested_quantity: transaction.quantity,
          },
        }
      );
    }

    const averageCost = this.getAverageCost();
    const releasedCost = averageCost * transaction.quantity;
    const proceeds = transaction.getSellProceeds();

    this.realizedPnl = normalizeZero(
      this.realizedPnl + (proceeds - releasedCost)
    );
    this.quantity = normalizeZero(this.quantity - transaction.quantity);
    this.costBasis = normalizeZero(this.costBasis - releasedCost);

    if (this.quantity === 0) {
      this.costBasis = 0;
    }
  }

  setMarketPrice({ closePrice, date }) {
    this.currentPrice =
      closePrice === null || closePrice === undefined ? null : Number(closePrice);
    this.lastPriceDate = date ? new Date(date) : null;
  }

  getAverageCost() {
    return this.quantity > 0 ? this.costBasis / this.quantity : 0;
  }

  getCurrentValue() {
    return this.currentPrice === null ? 0 : this.quantity * this.currentPrice;
  }

  getUnrealizedPnl() {
    return this.getCurrentValue() - this.costBasis;
  }

  getUnrealizedPnlPercent() {
    return this.costBasis > 0
      ? (this.getUnrealizedPnl() / this.costBasis) * 100
      : 0;
  }

  isOpen() {
    return this.quantity > 0;
  }

  toSnapshot() {
    return {
      stockId: this.stockId,
      symbol: this.symbol,
      name: this.name,
      quantity: this.quantity,
      totalCost: this.costBasis,
      avgPrice: this.getAverageCost(),
      currentPrice: this.currentPrice ?? 0,
      currentValue: this.getCurrentValue(),
      realizedPnl: this.realizedPnl,
      unrealizedPnl: this.getUnrealizedPnl(),
      unrealizedPnlPercent: this.getUnrealizedPnlPercent(),
      currency: this.currency,
      lastPriceDate: this.lastPriceDate,
    };
  }
}
