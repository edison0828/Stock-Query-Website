import { TransactionValidationError } from "./errors";

const BUY = "BUY";
const SELL = "SELL";

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new TransactionValidationError("交易資料格式不正確");
  }

  return parsed;
}

export class PortfolioTransaction {
  constructor({
    transactionId = null,
    stockId,
    stockName = null,
    transactionType,
    quantity,
    pricePerShare,
    commission = 0,
    currency = "TWD",
    transactionDate = null,
  }) {
    if (!stockId) {
      throw new TransactionValidationError("缺少股票代號");
    }

    if (![BUY, SELL].includes(transactionType)) {
      throw new TransactionValidationError("無效的交易類型");
    }

    this.transactionId = transactionId;
    this.stockId = stockId;
    this.stockName = stockName || stockId;
    this.transactionType = transactionType;
    this.quantity = toNumber(quantity);
    this.pricePerShare = toNumber(pricePerShare);
    this.commission = toNumber(commission);
    this.currency = currency;
    this.transactionDate = transactionDate ? new Date(transactionDate) : null;
  }

  isBuy() {
    return this.transactionType === BUY;
  }

  isSell() {
    return this.transactionType === SELL;
  }

  getGrossAmount() {
    return this.quantity * this.pricePerShare;
  }

  getBuyCost() {
    return this.getGrossAmount() + this.commission;
  }

  getSellProceeds() {
    return this.getGrossAmount() - this.commission;
  }
}

export function comparePortfolioTransactions(left, right) {
  const leftTime = left.transactionDate
    ? left.transactionDate.getTime()
    : Number.NEGATIVE_INFINITY;
  const rightTime = right.transactionDate
    ? right.transactionDate.getTime()
    : Number.NEGATIVE_INFINITY;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return String(left.transactionId ?? "").localeCompare(
    String(right.transactionId ?? "")
  );
}
