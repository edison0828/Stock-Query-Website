function formatIsoDate(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}

export class MarketDataStatus {
  constructor({
    stockCount,
    historicalPriceCount,
    latestPriceDate,
    financialReportCount,
    latestFinancialYear,
    latestFinancialPeriod,
    dividendCount,
    latestDividendDate,
    stockSplitCount,
  }) {
    this.stockCount = Number(stockCount || 0);
    this.historicalPriceCount = Number(historicalPriceCount || 0);
    this.latestPriceDate = formatIsoDate(latestPriceDate);
    this.financialReportCount = Number(financialReportCount || 0);
    this.latestFinancialYear =
      latestFinancialYear === null || latestFinancialYear === undefined
        ? null
        : Number(latestFinancialYear);
    this.latestFinancialPeriod = latestFinancialPeriod || null;
    this.dividendCount = Number(dividendCount || 0);
    this.latestDividendDate = formatIsoDate(latestDividendDate);
    this.stockSplitCount = Number(stockSplitCount || 0);
  }

  get latestFinancialLabel() {
    if (!this.latestFinancialYear || !this.latestFinancialPeriod) {
      return null;
    }

    return `${this.latestFinancialYear} ${this.latestFinancialPeriod}`;
  }

  toJSON() {
    return {
      stock_count: this.stockCount,
      historical_price_count: this.historicalPriceCount,
      latest_price_date: this.latestPriceDate,
      financial_report_count: this.financialReportCount,
      latest_financial_year: this.latestFinancialYear,
      latest_financial_period: this.latestFinancialPeriod,
      latest_financial_label: this.latestFinancialLabel,
      dividend_count: this.dividendCount,
      latest_dividend_date: this.latestDividendDate,
      stock_split_count: this.stockSplitCount,
    };
  }
}
