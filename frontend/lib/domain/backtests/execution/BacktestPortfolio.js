import { BacktestTrade } from "../BacktestTrade";
import { BacktestPosition } from "./BacktestPosition";

export class BacktestPortfolio {
  constructor({ initialCapital }) {
    this.initialCapital = Number(initialCapital);
    this.cash = Number(initialCapital);
    this.position = new BacktestPosition();
  }

  hasPosition() {
    return this.position.hasShares();
  }

  buy({ date, price, budget, feeModel, reason }) {
    const availableBudget = Math.min(Number(budget), this.cash);

    if (availableBudget <= 0 || price <= 0) {
      return null;
    }

    const grossAmount = availableBudget / (1 + feeModel.getBuyCostRate());
    const quantity = grossAmount / price;
    const costs = feeModel.calculateBuyCost(grossAmount);

    if (quantity <= 0 || costs.netAmount > this.cash + 1e-8) {
      return null;
    }

    this.cash -= costs.netAmount;
    this.position.add({ quantity, totalCost: costs.netAmount });

    return new BacktestTrade({
      tradeType: "BUY",
      tradeDate: date,
      price,
      quantity,
      cashAfter: this.cash,
      equityAfter: this.getEquity(price),
      grossAmount: costs.grossAmount,
      feeAmount: costs.feeAmount,
      taxAmount: costs.taxAmount,
      netAmount: costs.netAmount,
      positionAfter: this.position.quantity,
      reason,
    });
  }

  sellAll({ date, price, feeModel, reason }) {
    if (!this.hasPosition() || price <= 0) {
      return null;
    }

    const closedPosition = this.position.close();
    const grossAmount = closedPosition.quantity * price;
    const costs = feeModel.calculateSellCost(grossAmount);
    const pnlAmount = costs.netAmount - closedPosition.costBasis;
    const returnPercent =
      closedPosition.costBasis === 0
        ? 0
        : (pnlAmount / closedPosition.costBasis) * 100;

    this.cash += costs.netAmount;

    return new BacktestTrade({
      tradeType: "SELL",
      tradeDate: date,
      price,
      quantity: closedPosition.quantity,
      cashAfter: this.cash,
      equityAfter: this.cash,
      pnlAmount,
      returnPercent,
      grossAmount: costs.grossAmount,
      feeAmount: costs.feeAmount,
      taxAmount: costs.taxAmount,
      netAmount: costs.netAmount,
      positionAfter: 0,
      reason,
    });
  }

  getEquity(closePrice) {
    return this.cash + this.position.getMarketValue(closePrice);
  }
}
