function tail(value, maxLines = 18) {
  if (!value) {
    return null;
  }

  return value.split("\n").slice(-maxLines).join("\n").trim() || null;
}

function toBigIntOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return BigInt(Math.round(Number(value)));
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}

function serializeJob(record) {
  return {
    sync_job_id: record.sync_job_id.toString(),
    requested_source: record.requested_source,
    resolved_source: record.resolved_source,
    scope: record.scope,
    status: record.status,
    started_at: record.started_at?.toISOString() || null,
    finished_at: record.finished_at?.toISOString() || null,
    duration_ms:
      record.duration_ms === null || record.duration_ms === undefined
        ? null
        : Number(record.duration_ms),
    command: record.command,
    skip_stocks: record.skip_stocks,
    skip_prices: record.skip_prices,
    skip_financials: record.skip_financials,
    skip_dividends: record.skip_dividends,
    stock_rows: record.stock_rows === null ? null : Number(record.stock_rows),
    historical_price_rows:
      record.historical_price_rows === null
        ? null
        : Number(record.historical_price_rows),
    financial_report_rows:
      record.financial_report_rows === null
        ? null
        : Number(record.financial_report_rows),
    dividend_rows:
      record.dividend_rows === null ? null : Number(record.dividend_rows),
    latest_price_date: formatDate(record.latest_price_date),
    fallback_reason: record.fallback_reason,
    stdout_tail: record.stdout_tail,
    stderr_tail: record.stderr_tail,
    error_message: record.error_message,
    created_by_user_id: record.created_by_user_id?.toString() || null,
  };
}

export class MarketDataSyncHistoryService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  async start({ requestedSource, scope, sections, userId }) {
    const record = await this.prisma.marketdatasyncjobs.create({
      data: {
        requested_source: requestedSource,
        scope,
        skip_stocks: Boolean(sections.skipStocks),
        skip_prices: Boolean(sections.skipPrices),
        skip_financials: Boolean(sections.skipFinancials),
        skip_dividends: Boolean(sections.skipDividends),
        created_by_user_id: userId ? BigInt(userId) : null,
      },
    });

    return serializeJob(record);
  }

  async complete(syncJobId, result) {
    const summary = result.summary || {};
    const record = await this.prisma.marketdatasyncjobs.update({
      where: { sync_job_id: BigInt(syncJobId) },
      data: {
        status: "SUCCESS",
        resolved_source: result.source || summary.source || null,
        finished_at: new Date(),
        duration_ms: toBigIntOrNull(result.duration_ms),
        command: result.command || null,
        stock_rows: toBigIntOrNull(summary.stocks),
        historical_price_rows: toBigIntOrNull(summary.historicalprices),
        financial_report_rows: toBigIntOrNull(summary.financialreports),
        dividend_rows: toBigIntOrNull(summary.dividends),
        latest_price_date: summary.latest_price_date
          ? new Date(summary.latest_price_date)
          : null,
        fallback_reason: result.fallback_reason || null,
        stdout_tail: tail(result.stdout),
        stderr_tail: tail(result.stderr),
        error_message: null,
      },
    });

    return serializeJob(record);
  }

  async fail(syncJobId, error) {
    const result = error.result || {};
    const record = await this.prisma.marketdatasyncjobs.update({
      where: { sync_job_id: BigInt(syncJobId) },
      data: {
        status: "FAILED",
        resolved_source: result.source || null,
        finished_at: new Date(),
        duration_ms: toBigIntOrNull(result.duration_ms),
        command: result.command || null,
        fallback_reason: result.fallback_reason || null,
        stdout_tail: tail(result.stdout),
        stderr_tail: tail(result.stderr),
        error_message: error.message || "市場資料同步失敗",
      },
    });

    return serializeJob(record);
  }

  async listRecent(limit = 10) {
    const records = await this.prisma.marketdatasyncjobs.findMany({
      orderBy: { started_at: "desc" },
      take: limit,
    });

    return records.map(serializeJob);
  }
}
