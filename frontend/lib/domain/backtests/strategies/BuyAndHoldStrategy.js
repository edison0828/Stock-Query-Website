import { TradingStrategy } from "./TradingStrategy";

export class BuyAndHoldStrategy extends TradingStrategy {
  constructor() {
    super({
      type: "BUY_AND_HOLD",
      name: "買入持有策略",
      parameters: {},
    });
  }

  generateSignals(priceSeries) {
    if (!Array.isArray(priceSeries) || priceSeries.length === 0) {
      return [];
    }

    return [
      {
        type: "BUY",
        date: priceSeries[0].date,
        price: priceSeries[0].closePrice,
        reason: "回測開始買入並持有",
      },
    ];
  }
}
