import { MarketDataStatus } from "./MarketDataStatus";

export class MarketDataStatusService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  async getCurrentStatus() {
    const [
      stockCount,
      priceAggregate,
      financialReportCount,
      latestFinancialRows,
      dividendAggregate,
      stockSplitCount,
    ] = await Promise.all([
      this.prisma.stocks.count(),
      this.prisma.historicalprices.aggregate({
        _count: { _all: true },
        _max: { date: true },
      }),
      this.prisma.financialreports.count(),
      this.prisma.$queryRaw`
        SELECT year, period_type
        FROM financialreports
        ORDER BY year DESC, FIELD(period_type, 'Q4', 'Q3', 'Q2', 'Q1') ASC
        LIMIT 1
      `,
      this.prisma.dividends.aggregate({
        _count: { _all: true },
        _max: { dividend_date: true },
      }),
      this.prisma.stocksplits.count(),
    ]);

    const latestFinancial = latestFinancialRows[0] || {};

    return new MarketDataStatus({
      stockCount,
      historicalPriceCount: priceAggregate._count._all,
      latestPriceDate: priceAggregate._max.date,
      financialReportCount,
      latestFinancialYear: latestFinancial.year,
      latestFinancialPeriod: latestFinancial.period_type,
      dividendCount: dividendAggregate._count._all,
      latestDividendDate: dividendAggregate._max.dividend_date,
      stockSplitCount,
    });
  }
}
