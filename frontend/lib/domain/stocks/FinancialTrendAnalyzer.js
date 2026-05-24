const PERIOD_ORDER = {
  Q1: 1,
  Q2: 2,
  Q3: 3,
  Q4: 4,
};

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function calculateRatio(numerator, denominator) {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    Number(denominator) === 0
  ) {
    return null;
  }

  return Number(((Number(numerator) / Number(denominator)) * 100).toFixed(2));
}

export class FinancialTrendAnalyzer {
  constructor(financialReports) {
    this.reports = [...financialReports].sort((a, b) => {
      const yearDiff = Number(a.year) - Number(b.year);
      if (yearDiff !== 0) {
        return yearDiff;
      }

      return (
        (PERIOD_ORDER[a.period_type] || 0) - (PERIOD_ORDER[b.period_type] || 0)
      );
    });
  }

  buildTrend(limit = 12) {
    return this.reports.slice(-limit).map((report) => {
      const revenue = toNumber(report.revenue);
      const operatingIncome = toNumber(report.Income);
      const netIncome = toNumber(report.net_income);

      return {
        period: `${Number(report.year)} ${report.period_type}`,
        year: Number(report.year),
        period_type: report.period_type,
        revenue,
        operating_income: operatingIncome,
        net_income: netIncome,
        eps: toNumber(report.eps),
        operating_margin: calculateRatio(operatingIncome, revenue),
        net_margin: calculateRatio(netIncome, revenue),
      };
    });
  }
}
