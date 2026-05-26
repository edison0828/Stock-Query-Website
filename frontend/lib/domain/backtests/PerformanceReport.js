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
    const losingTrades = closedTrades.filter((trade) => (trade.pnlAmount ?? 0) < 0);
    const totalReturnPercent =
      initialCapital === 0 ? 0 : ((finalValue - initialCapital) / initialCapital) * 100;
    const winRatePercent =
      closedTrades.length === 0 ? 0 : (winningTrades.length / closedTrades.length) * 100;
    const firstDate = equityCurve[0]?.date ? new Date(equityCurve[0].date) : null;
    const lastDate = equityCurve[equityCurve.length - 1]?.date
      ? new Date(equityCurve[equityCurve.length - 1].date)
      : null;
    const elapsedDays =
      firstDate && lastDate
        ? Math.max((lastDate.getTime() - firstDate.getTime()) / 86400000, 1)
        : 1;
    const annualizedReturnPercent =
      initialCapital <= 0 || finalValue <= 0
        ? 0
        : (Math.pow(finalValue / initialCapital, 365 / elapsedDays) - 1) * 100;
    const grossProfit = winningTrades.reduce(
      (sum, trade) => sum + (trade.pnlAmount ?? 0),
      0
    );
    const grossLoss = losingTrades.reduce(
      (sum, trade) => sum + Math.abs(trade.pnlAmount ?? 0),
      0
    );
    const profitFactor =
      grossLoss === 0 ? (grossProfit > 0 ? null : 0) : grossProfit / grossLoss;
    const averageWinPercent =
      winningTrades.length === 0
        ? 0
        : winningTrades.reduce((sum, trade) => sum + (trade.returnPercent ?? 0), 0) /
          winningTrades.length;
    const averageLossPercent =
      losingTrades.length === 0
        ? 0
        : losingTrades.reduce((sum, trade) => sum + (trade.returnPercent ?? 0), 0) /
          losingTrades.length;
    let currentLossStreak = 0;
    let maxConsecutiveLosses = 0;

    for (const trade of closedTrades) {
      if ((trade.pnlAmount ?? 0) < 0) {
        currentLossStreak += 1;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      } else {
        currentLossStreak = 0;
      }
    }

    return {
      finalValue: roundNumber(finalValue, 6),
      totalReturnPercent: roundNumber(totalReturnPercent),
      annualizedReturnPercent: roundNumber(annualizedReturnPercent),
      maxDrawdownPercent: roundNumber(maxDrawdown),
      winRatePercent: roundNumber(winRatePercent),
      tradeCount: closedTrades.length,
      profitFactor: profitFactor === null ? null : roundNumber(profitFactor),
      averageWinPercent: roundNumber(averageWinPercent),
      averageLossPercent: roundNumber(averageLossPercent),
      maxConsecutiveLosses,
    };
  }
}
