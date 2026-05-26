import { BacktestValidationError } from "../errors";

function assertRate(name, value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new BacktestValidationError(`${name} 必須是大於等於 0 的數字`);
  }
}

export class BrokerageFeeModel {
  constructor({ feeRate = 0.001425, sellTaxRate = 0.003, slippageRate = 0 } = {}) {
    this.feeRate = Number(feeRate);
    this.sellTaxRate = Number(sellTaxRate);
    this.slippageRate = Number(slippageRate);

    assertRate("手續費率", this.feeRate);
    assertRate("賣出交易稅率", this.sellTaxRate);
    assertRate("滑價率", this.slippageRate);
  }

  getBuyCostRate() {
    return this.feeRate + this.slippageRate;
  }

  getSellCostRate() {
    return this.feeRate + this.sellTaxRate + this.slippageRate;
  }

  calculateBuyCost(grossAmount) {
    const fee = grossAmount * this.feeRate;
    const slippage = grossAmount * this.slippageRate;

    return {
      grossAmount,
      feeAmount: fee + slippage,
      taxAmount: 0,
      netAmount: grossAmount + fee + slippage,
    };
  }

  calculateSellCost(grossAmount) {
    const fee = grossAmount * this.feeRate;
    const tax = grossAmount * this.sellTaxRate;
    const slippage = grossAmount * this.slippageRate;

    return {
      grossAmount,
      feeAmount: fee + slippage,
      taxAmount: tax,
      netAmount: grossAmount - fee - tax - slippage,
    };
  }

  toConfig() {
    return {
      feeRate: this.feeRate,
      sellTaxRate: this.sellTaxRate,
      slippageRate: this.slippageRate,
    };
  }
}
