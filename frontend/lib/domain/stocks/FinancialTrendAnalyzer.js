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

export class FinancialTrendAnalyzer {
  constructor(financialReports) {
    this.reports = [...financialReports].sort((a, b) => {
      const yearDiff = Number(a.year) - Number(b.year);
      if (yearDiff !== 0) {
        return yearDiff;
      }

      return (PERIOD_ORDER[a.period_type] || 0) - (PERIOD_ORDER[b.period_type] || 0);
    });
  }

  buildTrend(limit = 12) {
    return this.reports.slice(-limit).map((report) => ({
      period: `${Number(report.year)} ${report.period_type}`,
      year: Number(report.year),
      period_type: report.period_type,
      revenue: toNumber(report.revenue),
      operating_income: toNumber(report.Income),
      net_income: toNumber(report.net_income),
      eps: toNumber(report.eps),
    }));
  }
}
