import { Portfolio } from "./Portfolio";
import { PortfolioTransaction } from "./PortfolioTransaction";

export function toPortfolioTransaction(record) {
  return new PortfolioTransaction({
    transactionId: record.transaction_id,
    stockId: record.stock_id,
    stockName: record.stocks?.company_name,
    transactionType: record.transaction_type,
    quantity: record.quantity,
    pricePerShare: record.price_per_share,
    commission: record.commission,
    currency: record.currency,
    transactionDate: record.transaction_date,
  });
}

export function toPortfolioEntity(record) {
  return new Portfolio({
    portfolioId: record.portfolio_id,
    userId: record.user_id,
    name: record.portfolio_name,
    description: record.description,
    createdAt: record.created_at,
    transactions: (record.transactions || []).map(toPortfolioTransaction),
  });
}
