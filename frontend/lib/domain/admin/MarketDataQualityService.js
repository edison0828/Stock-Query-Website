function formatDate(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}

function serializeIssue(record) {
  return {
    quality_check_id: record.quality_check_id?.toString() || null,
    sync_job_id: record.sync_job_id?.toString() || null,
    check_type: record.check_type,
    stock_id: record.stock_id,
    severity: record.severity,
    message: record.message,
    observed_value: record.observed_value,
    created_at: record.created_at?.toISOString() || null,
  };
}

function serializeComputedIssue(issue) {
  return {
    check_type: issue.checkType,
    stock_id: issue.stockId || null,
    severity: issue.severity,
    message: issue.message,
    observed_value: issue.observedValue || null,
  };
}

function isLikelyEtf(stockId) {
  return /^00/.test(stockId || "");
}

function numberOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function round(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Number(Number(value).toFixed(digits));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isOnOrBefore(value, date) {
  return value && new Date(value) <= date;
}

function isOnOrAfter(value, date) {
  return value && new Date(value) >= date;
}

function daysBetween(start, end) {
  if (!start || !end) {
    return null;
  }

  return Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
  );
}

function severityRank(severity) {
  return {
    critical: 0,
    warning: 1,
    info: 2,
    ok: 3,
  }[severity] ?? 9;
}

function checkRank(type) {
  return {
    MISSING_PRICE_DATA: 0,
    STALE_PRICE_DATE: 1,
    OLD_SYMBOL_FEW_ROWS: 2,
    SPARSE_ACTIVE_HISTORY: 3,
    MISSING_COMPANY_NAME: 4,
  }[type] ?? 9;
}

export class MarketDataQualityService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  async getLatestPriceDate() {
    const aggregate = await this.prisma.historicalprices.aggregate({
      _max: { date: true },
    });

    return aggregate._max.date;
  }

  async computeIssues({ limitPerCheck = 50 } = {}) {
    const rows = await this.prisma.$queryRaw`
      SELECT s.stock_id, s.company_name, s.market_type,
             COUNT(h.date) AS row_count,
             MIN(h.date) AS first_date,
             MAX(h.date) AS last_date,
             DATEDIFF(MAX(h.date), MIN(h.date)) AS span_days
      FROM stocks s
      LEFT JOIN historicalprices h ON h.stock_id = s.stock_id
      GROUP BY s.stock_id, s.company_name, s.market_type
      ORDER BY s.stock_id
    `;

    const latestPriceDate = rows.reduce((latest, row) => {
      if (!row.last_date) {
        return latest;
      }

      const date = new Date(row.last_date);
      return !latest || date > latest ? date : latest;
    }, null);

    if (!latestPriceDate) {
      return [
        {
          checkType: "NO_PRICE_DATA",
          severity: "critical",
          message: "historicalprices 目前沒有任何價格資料。",
          observedValue: null,
        },
      ];
    }

    const staleCutoff = addDays(latestPriceDate, -5);
    const oneYearAgo = addDays(latestPriceDate, -365);
    const recentCutoff = addDays(latestPriceDate, -30);

    const missingPriceRows = rows
      .filter((row) => Number(row.row_count) === 0)
      .slice(0, limitPerCheck);
    const stalePriceRows = rows
      .filter(
        (row) =>
          Number(row.row_count) > 0 &&
          isOnOrBefore(row.last_date, staleCutoff) &&
          isOnOrAfter(row.last_date, oneYearAgo)
      )
      .sort((a, b) => new Date(a.last_date) - new Date(b.last_date))
      .slice(0, limitPerCheck);
    const fewOldRows = rows
      .filter(
        (row) =>
          Number(row.row_count) > 0 &&
          Number(row.row_count) <= 30 &&
          isOnOrBefore(row.first_date, oneYearAgo)
      )
      .sort(
        (a, b) =>
          Number(a.row_count) - Number(b.row_count) ||
          new Date(a.first_date) - new Date(b.first_date)
      )
      .slice(0, limitPerCheck);
    const sparseRows = rows
      .filter(
        (row) =>
          Number(row.row_count) > 0 &&
          Number(row.span_days || 0) >= 365 &&
          isOnOrAfter(row.last_date, recentCutoff) &&
          Number(row.row_count) < Number(row.span_days) * 0.2
      )
      .sort((a, b) => Number(a.row_count) - Number(b.row_count))
      .slice(0, limitPerCheck);
    const missingNameRows = rows
      .filter((row) => row.company_name === row.stock_id)
      .slice(0, limitPerCheck);

    return [
      ...missingPriceRows.map((row) => ({
        checkType: "MISSING_PRICE_DATA",
        stockId: row.stock_id,
        severity: "critical",
        message: `${row.stock_id} ${row.company_name} 沒有任何歷史價格資料。`,
        observedValue: JSON.stringify({ market_type: row.market_type }),
      })),
      ...stalePriceRows.map((row) => ({
        checkType: "STALE_PRICE_DATE",
        stockId: row.stock_id,
        severity: "warning",
        message: `${row.stock_id} ${row.company_name} 最新價格日落後。`,
        observedValue: JSON.stringify({
          rows: Number(row.row_count),
          last_date: formatDate(row.last_date),
          reference_latest_date: formatDate(latestPriceDate),
        }),
      })),
      ...fewOldRows.map((row) => ({
        checkType: "OLD_SYMBOL_FEW_ROWS",
        stockId: row.stock_id,
        severity: "warning",
        message: `${row.stock_id} ${row.company_name} 第一筆資料很早，但價格筆數偏少。`,
        observedValue: JSON.stringify({
          rows: Number(row.row_count),
          first_date: formatDate(row.first_date),
          last_date: formatDate(row.last_date),
        }),
      })),
      ...sparseRows.map((row) => ({
        checkType: "SPARSE_ACTIVE_HISTORY",
        stockId: row.stock_id,
        severity: "warning",
        message: `${row.stock_id} ${row.company_name} 近期仍有資料，但長期價格序列密度偏低。`,
        observedValue: JSON.stringify({
          rows: Number(row.row_count),
          first_date: formatDate(row.first_date),
          last_date: formatDate(row.last_date),
          span_days: Number(row.span_days),
        }),
      })),
      ...missingNameRows.map((row) => ({
        checkType: "MISSING_COMPANY_NAME",
        stockId: row.stock_id,
        severity: "info",
        message: `${row.stock_id} 的名稱目前仍等於代號，建議補公司或 ETF 名稱。`,
        observedValue: JSON.stringify({ market_type: row.market_type }),
      })),
    ];
  }

  buildAssetIssue(row, latestPriceDate) {
    const rowCount = Number(row.row_count || 0);
    const firstDate = row.first_date || null;
    const lastDate = row.last_date || null;
    const spanDays = numberOrNull(row.span_days);
    const latestLagDays = daysBetween(lastDate, latestPriceDate);
    const density = spanDays && spanDays > 0 ? rowCount / spanDays : null;
    const oneYearAgo = addDays(latestPriceDate, -365);
    const recentCutoff = addDays(latestPriceDate, -30);
    const staleCutoff = addDays(latestPriceDate, -5);
    const issues = [];

    if (rowCount === 0) {
      issues.push({
        check_type: "MISSING_PRICE_DATA",
        severity: "critical",
        message: "沒有任何歷史價格資料",
      });
    }

    if (
      rowCount > 0 &&
      isOnOrBefore(lastDate, staleCutoff) &&
      isOnOrAfter(lastDate, oneYearAgo)
    ) {
      issues.push({
        check_type: "STALE_PRICE_DATE",
        severity: "warning",
        message: `最新價格日落後 ${latestLagDays} 天`,
      });
    }

    if (
      rowCount > 0 &&
      rowCount <= 30 &&
      isOnOrBefore(firstDate, oneYearAgo)
    ) {
      issues.push({
        check_type: "OLD_SYMBOL_FEW_ROWS",
        severity: "warning",
        message: "第一筆資料很早，但價格筆數偏少",
      });
    }

    if (
      rowCount > 0 &&
      Number(spanDays || 0) >= 365 &&
      isOnOrAfter(lastDate, recentCutoff) &&
      rowCount < Number(spanDays) * 0.2
    ) {
      issues.push({
        check_type: "SPARSE_ACTIVE_HISTORY",
        severity: "warning",
        message: "近期仍有資料，但長期價格序列密度偏低",
      });
    }

    if (row.company_name === row.stock_id) {
      issues.push({
        check_type: "MISSING_COMPANY_NAME",
        severity: "info",
        message: "名稱目前仍等於代號",
      });
    }

    if (issues.length === 0) {
      return null;
    }

    const severity = issues
      .map((issue) => issue.severity)
      .sort((a, b) => severityRank(a) - severityRank(b))[0];

    return {
      stock_id: row.stock_id,
      company_name: row.company_name,
      asset_type: isLikelyEtf(row.stock_id) ? "ETF" : "STOCK",
      market_type: row.market_type,
      security_status: row.security_status,
      severity,
      row_count: rowCount,
      first_date: formatDate(firstDate),
      latest_date: formatDate(lastDate),
      reference_latest_date: formatDate(latestPriceDate),
      latest_lag_days: latestLagDays,
      span_days: spanDays,
      density: round(density),
      issues: issues.sort(
        (a, b) =>
          severityRank(a.severity) - severityRank(b.severity) ||
          checkRank(a.check_type) - checkRank(b.check_type)
      ),
    };
  }

  summarizeAssetIssues(assets) {
    const summary = {
      total_assets_with_issues: assets.length,
      critical: 0,
      warning: 0,
      info: 0,
      ETF: 0,
      STOCK: 0,
      by_check_type: {},
    };

    for (const asset of assets) {
      summary[asset.severity] = (summary[asset.severity] || 0) + 1;
      summary[asset.asset_type] = (summary[asset.asset_type] || 0) + 1;

      for (const issue of asset.issues) {
        summary.by_check_type[issue.check_type] =
          (summary.by_check_type[issue.check_type] || 0) + 1;
      }
    }

    return summary;
  }

  async getAssetQualityOverview({ limit = 500 } = {}) {
    const rows = await this.prisma.$queryRaw`
      SELECT s.stock_id, s.company_name, s.market_type, s.security_status,
             COUNT(h.date) AS row_count,
             MIN(h.date) AS first_date,
             MAX(h.date) AS last_date,
             DATEDIFF(MAX(h.date), MIN(h.date)) AS span_days
      FROM stocks s
      LEFT JOIN historicalprices h ON h.stock_id = s.stock_id
      GROUP BY s.stock_id, s.company_name, s.market_type, s.security_status
      ORDER BY s.stock_id
    `;

    const latestPriceDate = rows.reduce((latest, row) => {
      if (!row.last_date) {
        return latest;
      }

      const date = new Date(row.last_date);
      return !latest || date > latest ? date : latest;
    }, null);

    if (!latestPriceDate) {
      return {
        summary: {
          total_assets_with_issues: 0,
          critical: 0,
          warning: 0,
          info: 0,
          ETF: 0,
          STOCK: 0,
          by_check_type: {},
        },
        assets: [],
        reference_latest_date: null,
      };
    }

    const assets = rows
      .map((row) => this.buildAssetIssue(row, latestPriceDate))
      .filter(Boolean)
      .sort(
        (a, b) =>
          severityRank(a.severity) - severityRank(b.severity) ||
          checkRank(a.issues[0]?.check_type) - checkRank(b.issues[0]?.check_type) ||
          Number(a.row_count) - Number(b.row_count) ||
          a.stock_id.localeCompare(b.stock_id)
      );

    return {
      summary: this.summarizeAssetIssues(assets),
      assets: assets.slice(0, limit),
      reference_latest_date: formatDate(latestPriceDate),
    };
  }

  summarize(issues) {
    const summary = {};

    for (const issue of issues) {
      const type = issue.check_type || issue.checkType;
      summary[type] = (summary[type] || 0) + 1;
    }

    return summary;
  }

  async persistSnapshot({ syncJobId, issues }) {
    await this.prisma.marketdataqualitychecks.deleteMany({
      where: { sync_job_id: syncJobId ? BigInt(syncJobId) : null },
    });

    if (issues.length === 0) {
      return [];
    }

    await this.prisma.marketdataqualitychecks.createMany({
      data: issues.map((issue) => ({
        sync_job_id: syncJobId ? BigInt(syncJobId) : null,
        check_type: issue.checkType,
        stock_id: issue.stockId || null,
        severity: issue.severity,
        message: issue.message,
        observed_value: issue.observedValue || null,
      })),
    });

    return this.listForJob(syncJobId);
  }

  async listForJob(syncJobId, limit = 200) {
    const records = await this.prisma.marketdataqualitychecks.findMany({
      where: { sync_job_id: syncJobId ? BigInt(syncJobId) : null },
      orderBy: [{ severity: "asc" }, { check_type: "asc" }, { stock_id: "asc" }],
      take: limit,
    });

    return records.map(serializeIssue);
  }

  async getLatestSnapshot(limit = 200) {
    const latest = await this.prisma.marketdataqualitychecks.findFirst({
      orderBy: { created_at: "desc" },
      select: { sync_job_id: true, created_at: true },
    });

    if (!latest) {
      return {
        summary: {},
        issues: [],
        generated_at: null,
        sync_job_id: null,
      };
    }

    const issues = await this.listForJob(latest.sync_job_id, limit);

    return {
      summary: this.summarize(issues),
      issues,
      generated_at: latest.created_at?.toISOString() || null,
      sync_job_id: latest.sync_job_id?.toString() || null,
    };
  }

  async getCurrent({ limitPerCheck = 50 } = {}) {
    const issues = await this.computeIssues({ limitPerCheck });
    const serializedIssues = issues.map(serializeComputedIssue);

    return {
      summary: this.summarize(serializedIssues),
      issues: serializedIssues,
    };
  }
}
