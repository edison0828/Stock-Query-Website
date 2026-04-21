import { HistoricalPricePoint } from "./HistoricalPricePoint";

export class BacktestMarketDataService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getPriceSeries(stockId, { startDate, endDate }) {
    const rows = await this.prisma.historicalprices.findMany({
      where: {
        stock_id: stockId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
      select: {
        date: true,
        close_price: true,
      },
    });

    return rows
      .filter((row) => row.close_price !== null)
      .map(
        (row) =>
          new HistoricalPricePoint({
            date: row.date,
            closePrice: row.close_price,
          })
      );
  }
}
