import { PortfolioTransaction } from "./PortfolioTransaction";
import { TransactionValidationError } from "./errors";

export class TransactionValidator {
  static normalizeInput({
    stockId,
    portfolioId,
    transactionType,
    quantity,
    pricePerShare,
  }) {
    const normalizedStockId = stockId?.toUpperCase();
    const normalizedPortfolioId = Number(portfolioId);
    const normalizedQuantity = Number(quantity);
    const normalizedPricePerShare = Number(pricePerShare);

    if (
      !normalizedStockId ||
      !portfolioId ||
      !transactionType ||
      !quantity ||
      !pricePerShare
    ) {
      throw new TransactionValidationError("缺少必要的交易資訊");
    }

    if (!Number.isFinite(normalizedPortfolioId)) {
      throw new TransactionValidationError("投資組合 ID 格式不正確");
    }

    if (!["BUY", "SELL"].includes(transactionType)) {
      throw new TransactionValidationError("無效的交易類型");
    }

    if (normalizedQuantity <= 0 || normalizedPricePerShare <= 0) {
      throw new TransactionValidationError("數量和價格必須大於 0");
    }

    return {
      stockId: normalizedStockId,
      portfolioId: normalizedPortfolioId,
      transactionType,
      quantity: normalizedQuantity,
      pricePerShare: normalizedPricePerShare,
    };
  }

  static createPendingTransaction(input, stock) {
    return new PortfolioTransaction({
      stockId: input.stockId,
      stockName: stock.company_name,
      transactionType: input.transactionType,
      quantity: input.quantity,
      pricePerShare: input.pricePerShare,
      commission: 0,
      currency: stock.currency,
      transactionDate: new Date(),
    });
  }

  static assertCanRecord(portfolio, transaction) {
    if (!transaction.isSell()) {
      return;
    }

    const position = portfolio.getPosition(transaction.stockId);
    const currentHolding = position?.quantity || 0;

    if (currentHolding < transaction.quantity) {
      throw new TransactionValidationError(
        `庫存不足：您目前持有 ${currentHolding} 股 ${transaction.stockId}，無法賣出 ${transaction.quantity} 股`,
        {
          details: {
            current_holding: currentHolding,
            requested_quantity: transaction.quantity,
          },
        }
      );
    }
  }
}
