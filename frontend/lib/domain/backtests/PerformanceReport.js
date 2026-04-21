function roundNumber(value, digits = 4) {
  return Number(value.toFixed(digits));
}

export class PerformanceReport {
  static fromBacktest({ initialCapital, finalValue, equityCurve, trades }) {
    let peak = initialCapital;
    let maxDrawdown = 0;

    for (const point of equityCurve) {
      peak = Math.max(peak, point.value);

      if (peak > 0) {
        const drawdown = ((peak - point.value) / peak) * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    const closedTrades = trades.filter((trade) => trade.tradeType === "SELL");
    const winningTrades = closedTrades.filter((trade) => (trade.pnlAmount ?? 0) > 0);
    const totalReturnPercent =
      initialCapital === 0 ? 0 : ((finalValue - initialCapital) / initialCapital) * 100;
    const winRatePercent =
      closedTrades.length === 0 ? 0 : (winningTrades.length / closedTrades.length) * 100;

    return {
      finalValue: roundNumber(finalValue, 6),
      totalReturnPercent: roundNumber(totalReturnPercent),
      maxDrawdownPercent: roundNumber(maxDrawdown),
      winRatePercent: roundNumber(winRatePercent),
      tradeCount: closedTrades.length,
    };
  }
}
