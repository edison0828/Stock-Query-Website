export class PortfolioPriceService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getLatestClosePrices(stockIds) {
    const uniqueStockIds = [...new Set(stockIds.filter(Boolean))];

    if (uniqueStockIds.length === 0) {
      return new Map();
    }

    const placeholders = uniqueStockIds.map(() => "?").join(", ");
    const query = `
      WITH RankedPrices AS (
        SELECT
          stock_id,
          close_price,
          date,
          ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY date DESC) AS rn
        FROM historicalprices
        WHERE stock_id IN (${placeholders})
      )
      SELECT stock_id, close_price, date
      FROM RankedPrices
      WHERE rn = 1
    `;

    const rows = await this.prisma.$queryRawUnsafe(query, ...uniqueStockIds);

    return new Map(
      rows.map((row) => [
        row.stock_id,
        {
          closePrice:
            row.close_price === null || row.close_price === undefined
              ? null
              : Number(row.close_price),
          date: row.date,
        },
      ])
    );
  }
}
