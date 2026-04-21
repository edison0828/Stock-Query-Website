import { MarketSnapshot } from "./MarketSnapshot";

export class AlertMarketDataService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getSnapshots(stockIds) {
    const uniqueStockIds = [...new Set(stockIds.filter(Boolean))];

    if (uniqueStockIds.length === 0) {
      return new Map();
    }

    const placeholders = uniqueStockIds.map(() => "?").join(", ");
    const query = `
      WITH RankedPrices AS (
        SELECT
          hp.stock_id,
          hp.close_price,
          hp.date,
          ROW_NUMBER() OVER (PARTITION BY hp.stock_id ORDER BY hp.date DESC) AS rn
        FROM historicalprices hp
        WHERE hp.stock_id IN (${placeholders})
      )
      SELECT
        rp.stock_id,
        MAX(CASE WHEN rp.rn = 1 THEN rp.close_price END) AS current_price,
        MAX(CASE WHEN rp.rn = 2 THEN rp.close_price END) AS previous_close,
        MAX(CASE WHEN rp.rn = 1 THEN rp.date END) AS market_date,
        s.company_name
      FROM RankedPrices rp
      INNER JOIN stocks s ON s.stock_id = rp.stock_id
      WHERE rp.rn IN (1, 2)
      GROUP BY rp.stock_id, s.company_name
    `;

    const rows = await this.prisma.$queryRawUnsafe(query, ...uniqueStockIds);

    return new Map(
      rows.map((row) => [
        row.stock_id,
        new MarketSnapshot({
          stockId: row.stock_id,
          companyName: row.company_name,
          currentPrice: row.current_price,
          previousClose: row.previous_close,
          marketDate: row.market_date,
        }),
      ])
    );
  }
}
