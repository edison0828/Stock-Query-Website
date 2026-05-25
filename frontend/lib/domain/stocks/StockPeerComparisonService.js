import companyData from "@/data/company.json";
import { Prisma } from "@/lib/generated/prisma";

const RANGE_DAYS = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "3Y": 1095,
};

const RETURN_PERIODS = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  YTD: null,
  "1Y": 365,
};

const YEAR_TRADING_DAYS = 252;
const DEFAULT_LIMIT = 6;
const MAX_COMPARE_SYMBOLS = 8;
const SPLIT_RATIOS = [2, 3, 4, 5, 10];

function round(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Number(Number(value).toFixed(digits));
}

function formatDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function normalizeSymbol(symbol) {
  return String(symbol || "")
    .trim()
    .toUpperCase();
}

function uniqueSymbols(symbols) {
  return [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
}

function getCompanyData() {
  return companyData.default || companyData;
}

function getIndustry(stockId) {
  return getCompanyData()[stockId]?.industry || null;
}

function startDateForRange(latestDate, range) {
  const latest = new Date(latestDate);

  if (range === "YTD") {
    return new Date(latest.getFullYear(), 0, 1);
  }

  const days = RANGE_DAYS[range] || RANGE_DAYS["1Y"];
  const start = new Date(latest);
  start.setDate(start.getDate() - days);
  return start;
}

function findPointOnOrAfter(points, targetDate) {
  return points.find(
    (point) =>
      point.close !== null &&
      new Date(point.date).getTime() >= targetDate.getTime()
  );
}

function percentChange(start, end) {
  if (!start || !end) {
    return null;
  }

  return round(((end - start) / start) * 100);
}

function calculateMaxDrawdown(points) {
  let peak = null;
  let maxDrawdown = 0;

  for (const point of points) {
    if (!point.close) {
      continue;
    }

    if (peak === null || point.close > peak) {
      peak = point.close;
    }

    maxDrawdown = Math.min(maxDrawdown, ((point.close - peak) / peak) * 100);
  }

  return round(maxDrawdown);
}

function calculateAnnualizedVolatility(points) {
  const returns = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1].close;
    const current = points[index].close;

    if (previous && current) {
      returns.push((current - previous) / previous);
    }
  }

  if (returns.length < 2) {
    return null;
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (returns.length - 1);

  return round(Math.sqrt(variance) * Math.sqrt(YEAR_TRADING_DAYS) * 100);
}

function nearestSplitRatio(ratio) {
  return SPLIT_RATIOS.reduce((nearest, candidate) =>
    Math.abs(candidate - ratio) < Math.abs(nearest - ratio) ? candidate : nearest
  );
}

function adjustSplitJumps(points) {
  let factor = 1;
  let previousRawClose = null;

  return points.map((point) => {
    const rawClose = point.close;
    let close = rawClose;

    if (rawClose && previousRawClose) {
      const rawRatio = rawClose / previousRawClose;

      if (rawRatio > 0 && rawRatio < 0.45) {
        factor *= nearestSplitRatio(1 / rawRatio);
      } else if (rawRatio > 2.2) {
        factor /= nearestSplitRatio(rawRatio);
      }

      close = round(rawClose * factor, 6);
    } else if (rawClose) {
      close = round(rawClose * factor, 6);
    }

    if (rawClose) {
      previousRawClose = rawClose;
    }

    return {
      ...point,
      close,
    };
  });
}

function buildReturns(points, latestPoint) {
  if (!latestPoint?.close) {
    return {};
  }

  const latestDate = new Date(latestPoint.date);
  const result = {};

  for (const [label, days] of Object.entries(RETURN_PERIODS)) {
    let targetDate;

    if (label === "YTD") {
      targetDate = new Date(latestDate.getFullYear(), 0, 1);
    } else {
      targetDate = new Date(latestDate);
      targetDate.setDate(targetDate.getDate() - days);
    }

    const startPoint = findPointOnOrAfter(points, targetDate);
    result[label] = startPoint
      ? percentChange(startPoint.close, latestPoint.close)
      : null;
  }

  return result;
}

export class StockPeerComparisonService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  async getProfiles(symbols) {
    if (symbols.length === 0) {
      return [];
    }

    const stocks = await this.prisma.stocks.findMany({
      where: { stock_id: { in: symbols } },
      select: {
        stock_id: true,
        company_name: true,
        market_type: true,
        asset_type: true,
        industry_category: true,
        security_status: true,
      },
    });
    const order = new Map(symbols.map((symbol, index) => [symbol, index]));

    return stocks
      .map((stock) => ({
        ...stock,
        industry: stock.industry_category || getIndustry(stock.stock_id),
      }))
      .sort((a, b) => order.get(a.stock_id) - order.get(b.stock_id));
  }

  async resolvePeerSymbols({ symbol, mode = "peers", symbols = [], limit = DEFAULT_LIMIT }) {
    const anchorSymbol = normalizeSymbol(symbol || symbols[0]);
    const explicitSymbols = uniqueSymbols(symbols);
    const maxLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 2), MAX_COMPARE_SYMBOLS);

    if (!anchorSymbol && explicitSymbols.length > 0) {
      return explicitSymbols.slice(0, maxLimit);
    }

    const anchor = anchorSymbol
      ? await this.prisma.stocks.findUnique({
          where: { stock_id: anchorSymbol },
          select: {
            stock_id: true,
            asset_type: true,
            industry_category: true,
          },
        })
      : null;

    if (explicitSymbols.length > 0) {
      return this.filterComparableSymbols({
        anchor,
        symbols: explicitSymbols,
        mode,
        limit: maxLimit,
      });
    }

    if (!anchor) {
      return [];
    }

    if (mode === "etf" || anchor.asset_type === "ETF") {
      const rows = await this.prisma.$queryRaw`
        SELECT s.stock_id, COUNT(h.date) AS row_count, MAX(h.date) AS latest_date
        FROM stocks s
        LEFT JOIN historicalprices h ON h.stock_id = s.stock_id
        WHERE s.asset_type = 'ETF'
        GROUP BY s.stock_id
        ORDER BY CASE WHEN s.stock_id = ${anchor.stock_id} THEN 0 ELSE 1 END ASC,
                 row_count DESC,
                 s.stock_id ASC
        LIMIT ${maxLimit}
      `;

      return rows.map((row) => row.stock_id);
    }

    const industry = anchor.industry_category || getIndustry(anchor.stock_id);

    if (!industry) {
      return [anchor.stock_id];
    }

    if (anchor.industry_category) {
      const rows = await this.prisma.$queryRaw`
        SELECT s.stock_id, COUNT(h.date) AS row_count, MAX(h.date) AS latest_date
        FROM stocks s
        LEFT JOIN historicalprices h ON h.stock_id = s.stock_id
        WHERE s.asset_type = 'STOCK'
          AND s.industry_category = ${anchor.industry_category}
        GROUP BY s.stock_id
        ORDER BY CASE WHEN s.stock_id = ${anchor.stock_id} THEN 0 ELSE 1 END ASC,
                 row_count DESC,
                 s.stock_id ASC
        LIMIT ${maxLimit}
      `;

      return rows.map((row) => row.stock_id);
    }

    const sameIndustryIds = Object.entries(getCompanyData())
      .filter(([, info]) => info?.industry === industry)
      .map(([stockId]) => stockId);

    const rows = await this.prisma.$queryRaw`
      SELECT s.stock_id, COUNT(h.date) AS row_count, MAX(h.date) AS latest_date
      FROM stocks s
      LEFT JOIN historicalprices h ON h.stock_id = s.stock_id
      WHERE s.asset_type = 'STOCK'
        AND s.stock_id IN (${Prisma.join(sameIndustryIds)})
      GROUP BY s.stock_id
      ORDER BY CASE WHEN s.stock_id = ${anchor.stock_id} THEN 0 ELSE 1 END ASC,
               row_count DESC,
               s.stock_id ASC
      LIMIT ${maxLimit}
    `;

    return rows.map((row) => row.stock_id);
  }

  async filterComparableSymbols({ anchor, symbols, mode, limit }) {
    const profiles = await this.getProfiles(symbols);

    if (!anchor) {
      return profiles.slice(0, limit).map((profile) => profile.stock_id);
    }

    if (mode === "etf" || anchor.asset_type === "ETF") {
      return profiles
        .filter((profile) => profile.asset_type === "ETF")
        .slice(0, limit)
        .map((profile) => profile.stock_id);
    }

    const anchorIndustry = anchor.industry_category || getIndustry(anchor.stock_id);

    return profiles
      .filter(
        (profile) =>
          profile.asset_type === "STOCK" &&
          (!anchorIndustry || profile.industry === anchorIndustry)
      )
      .slice(0, limit)
      .map((profile) => profile.stock_id);
  }

  async getPriceRows(symbols) {
    if (symbols.length === 0) {
      return [];
    }

    return this.prisma.historicalprices.findMany({
      where: { stock_id: { in: symbols } },
      orderBy: [{ stock_id: "asc" }, { date: "asc" }],
      select: {
        stock_id: true,
        date: true,
        close_price: true,
        volume: true,
      },
    });
  }

  groupPriceRows(rows) {
    const grouped = new Map();

    for (const row of rows) {
      const stockId = row.stock_id;
      if (!grouped.has(stockId)) {
        grouped.set(stockId, []);
      }

      grouped.get(stockId).push({
        date: row.date,
        close: row.close_price === null ? null : Number(row.close_price),
        volume: row.volume === null ? null : Number(row.volume),
      });
    }

    for (const [stockId, points] of grouped.entries()) {
      grouped.set(stockId, adjustSplitJumps(points));
    }

    return grouped;
  }

  buildSymbolMetrics({ profile, points, range }) {
    const latestPoint = [...points]
      .reverse()
      .find((point) => point.close !== null);
    const firstPoint = points.find((point) => point.close !== null);
    const rangeReturn =
      firstPoint && latestPoint
        ? percentChange(firstPoint.close, latestPoint.close)
        : null;
    const latestVolume = latestPoint
      ? [...points].reverse().find((point) => point.volume !== null)?.volume
      : null;

    return {
      stock_id: profile.stock_id,
      company_name: profile.company_name,
      asset_type: profile.asset_type,
      market_type: profile.market_type,
      industry: profile.industry,
      range,
      current_price: latestPoint?.close ?? null,
      range_return: rangeReturn,
      max_drawdown: calculateMaxDrawdown(points),
      annualized_volatility: calculateAnnualizedVolatility(points),
      latest_volume: latestVolume,
      row_count: points.length,
      first_date: firstPoint ? formatDate(firstPoint.date) : null,
      latest_date: latestPoint ? formatDate(latestPoint.date) : null,
      returns: buildReturns(points, latestPoint),
    };
  }

  buildChartData(symbols, groupedRows, latestDate, range) {
    const startDate = startDateForRange(latestDate, range);
    const byDate = new Map();

    for (const symbol of symbols) {
      const points = (groupedRows.get(symbol) || []).filter(
        (point) => new Date(point.date).getTime() >= startDate.getTime()
      );
      const firstClose = points.find((point) => point.close !== null)?.close;

      if (!firstClose) {
        continue;
      }

      for (const point of points) {
        const dateKey = formatDate(point.date);
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, { date: dateKey });
        }

        byDate.get(dateKey)[symbol] =
          point.close === null ? null : round((point.close / firstClose) * 100);
      }
    }

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  async buildComparison({ symbol, mode = "peers", symbols = [], range = "1Y", limit }) {
    const isSupportedRange = Boolean(RANGE_DAYS[range]) || range === "YTD";
    const normalizedRange = isSupportedRange ? range : "1Y";
    const compareSymbols = await this.resolvePeerSymbols({
      symbol,
      mode,
      symbols,
      limit,
    });
    const profiles = await this.getProfiles(compareSymbols);
    const rows = await this.getPriceRows(compareSymbols);
    const groupedRows = this.groupPriceRows(rows);
    const latestDate = rows.reduce(
      (latest, row) =>
        !latest || new Date(row.date).getTime() > new Date(latest).getTime()
          ? row.date
          : latest,
      null
    );

    if (!latestDate) {
      return {
        mode,
        range: normalizedRange,
        anchor: normalizeSymbol(symbol),
        category: null,
        symbols: profiles,
        chartData: [],
        metrics: [],
      };
    }

    const startDate = startDateForRange(latestDate, normalizedRange);
    const profileMap = new Map(profiles.map((profile) => [profile.stock_id, profile]));
    const metrics = compareSymbols
      .map((compareSymbol) => {
        const profile = profileMap.get(compareSymbol);
        if (!profile) {
          return null;
        }

        const points = (groupedRows.get(compareSymbol) || []).filter(
          (point) => new Date(point.date).getTime() >= startDate.getTime()
        );

        return this.buildSymbolMetrics({
          profile,
          points,
          range: normalizedRange,
        });
      })
      .filter(Boolean);
    const anchorProfile = profiles.find(
      (profile) => profile.stock_id === normalizeSymbol(symbol)
    );
    const category =
      mode === "etf" || anchorProfile?.asset_type === "ETF"
        ? "ETF"
        : anchorProfile?.industry || null;

    return {
      mode: category === "ETF" ? "etf" : "peers",
      range: normalizedRange,
      anchor: normalizeSymbol(symbol),
      category,
      symbols: profiles,
      chartData: this.buildChartData(
        compareSymbols,
        groupedRows,
        latestDate,
        normalizedRange
      ),
      metrics,
    };
  }
}
