import { Position } from "./Position";
import { comparePortfolioTransactions } from "./PortfolioTransaction";

export class Portfolio {
  constructor({
    portfolioId = null,
    userId = null,
    name,
    description = null,
    createdAt = null,
    transactions = [],
  }) {
    this.portfolioId = portfolioId;
    this.userId = userId;
    this.name = name;
    this.description = description;
    this.createdAt = createdAt ? new Date(createdAt) : null;
    this.transactions = [...transactions].sort(comparePortfolioTransactions);
  }

  getPrimaryCurrency() {
    return this.transactions[0]?.currency || "TWD";
  }

  getStockIds() {
    return [...new Set(this.transactions.map((transaction) => transaction.stockId))];
  }

  buildPositions() {
    const positions = new Map();

    for (const transaction of this.transactions) {
      if (!positions.has(transaction.stockId)) {
        positions.set(
          transaction.stockId,
          new Position({
            stockId: transaction.stockId,
            symbol: transaction.stockId,
            name: transaction.stockName,
            currency: transaction.currency,
          })
        );
      }

      positions.get(transaction.stockId).applyTransaction(transaction);
    }

    return positions;
  }

  getPosition(stockId) {
    return this.buildPositions().get(stockId) || null;
  }

  createSnapshot(priceMap = new Map()) {
    const positions = [...this.buildPositions().values()];

    for (const position of positions) {
      const marketPrice = priceMap.get(position.stockId);

      if (marketPrice) {
        position.setMarketPrice(marketPrice);
      }
    }

    const holdings = positions
      .filter((position) => position.isOpen())
      .map((position) => position.toSnapshot())
      .sort(
        (left, right) =>
          right.currentValue - left.currentValue ||
          left.stockId.localeCompare(right.stockId)
      );

    const summary = positions.reduce(
      (result, position) => {
        result.totalCostBasis += position.costBasis;
        result.totalMarketValue += position.getCurrentValue();
        result.realizedPnl += position.realizedPnl;
        return result;
      },
      {
        totalCostBasis: 0,
        totalMarketValue: 0,
        realizedPnl: 0,
      }
    );

    summary.unrealizedPnl = summary.totalMarketValue - summary.totalCostBasis;
    summary.unrealizedPnlPercent =
      summary.totalCostBasis > 0
        ? (summary.unrealizedPnl / summary.totalCostBasis) * 100
        : 0;

    return {
      holdings,
      summary,
    };
  }
}
