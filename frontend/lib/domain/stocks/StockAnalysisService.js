import { FinancialTrendAnalyzer } from "./FinancialTrendAnalyzer";
import { PriceSeriesAnalyzer } from "./PriceSeriesAnalyzer";

export class StockAnalysisService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  async getPriceRows(stockId) {
    return this.prisma.historicalprices.findMany({
      where: { stock_id: stockId },
      orderBy: { date: "asc" },
      select: {
        date: true,
        open_price: true,
        high_price: true,
        low_price: true,
        close_price: true,
        volume: true,
      },
    });
  }

  async getReferenceLatestDate() {
    const aggregate = await this.prisma.historicalprices.aggregate({
      _max: { date: true },
    });

    return aggregate._max.date;
  }

  async buildPriceAnalysis(stockId) {
    const [priceRows, referenceLatestDate] = await Promise.all([
      this.getPriceRows(stockId),
      this.getReferenceLatestDate(),
    ]);

    const analyzer = new PriceSeriesAnalyzer(priceRows, referenceLatestDate);

    return {
      historicalData: analyzer.buildHistoricalData(),
      priceQuality: analyzer.buildQualitySummary(),
      technicalSummary: analyzer.buildTechnicalSummary(),
    };
  }

  buildFinancialTrend(financialReports) {
    return new FinancialTrendAnalyzer(financialReports).buildTrend();
  }
}
