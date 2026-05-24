import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  AdminAuthorizationPolicy,
  MarketDataQualityService,
  MarketDataStatusService,
  MarketDataSyncHistoryService,
  MarketDataSyncJob,
} from "@/lib/domain/admin";

export const runtime = "nodejs";
export const maxDuration = 1200;

const ALLOWED_SCOPES = new Set(["TSE_OTC", "ETF", "ALL"]);
const ALLOWED_SOURCES = new Set(["AUTO", "FINLAB", "FREE"]);

function errorResponse(error) {
  return NextResponse.json(
    {
      error: error.message || "市場資料同步失敗",
      result: error.result || null,
      sync_record: error.syncRecord || null,
    },
    { status: error.status || 500 }
  );
}

function normalizeBoolean(value) {
  return value === true;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    new AdminAuthorizationPolicy(session).assertAdmin();

    const body = await request.json().catch(() => ({}));
    const scope = ALLOWED_SCOPES.has(body.scope) ? body.scope : "TSE_OTC";
    const source = ALLOWED_SOURCES.has(body.source) ? body.source : "AUTO";
    const sections = {
      skipStocks: normalizeBoolean(body.skip_stocks),
      skipPrices: normalizeBoolean(body.skip_prices),
      skipFinancials: normalizeBoolean(body.skip_financials),
      skipDividends: normalizeBoolean(body.skip_dividends),
    };

    const syncHistoryService = new MarketDataSyncHistoryService(prisma);
    const qualityService = new MarketDataQualityService(prisma);
    const syncRecord = await syncHistoryService.start({
      requestedSource: source,
      scope,
      sections,
      userId: session.user?.id,
    });

    const syncJob = new MarketDataSyncJob();
    let result;

    try {
      result = await syncJob.run({ scope, source, sections });
      await syncHistoryService.complete(syncRecord.sync_job_id, result);
    } catch (error) {
      const failedRecord = await syncHistoryService.fail(
        syncRecord.sync_job_id,
        error
      );
      error.syncRecord = failedRecord;
      throw error;
    }

    const qualityIssues = await qualityService.computeIssues({ limitPerCheck: 50 });
    const persistedQuality = await qualityService.persistSnapshot({
      syncJobId: syncRecord.sync_job_id,
      issues: qualityIssues,
    });

    const statusService = new MarketDataStatusService(prisma);
    const status = await statusService.getCurrentStatus();
    const [recentSyncJobs, assetQuality] = await Promise.all([
      syncHistoryService.listRecent(10),
      qualityService.getAssetQualityOverview({ limit: 500 }),
    ]);

    return NextResponse.json({
      message: "市場資料同步完成",
      result,
      status: status.toJSON(),
      sync_record: recentSyncJobs[0],
      recent_sync_jobs: recentSyncJobs,
      quality: {
        summary: qualityService.summarize(persistedQuality),
        issues: persistedQuality,
      },
      asset_quality: assetQuality,
    });
  } catch (error) {
    if (!error.status || error.status >= 500) {
      console.error("Admin market data sync failed:", error);
    }
    return errorResponse(error);
  }
}
