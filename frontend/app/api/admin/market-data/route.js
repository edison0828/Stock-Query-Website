import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  AdminAuthorizationPolicy,
  MarketDataQualityService,
  MarketDataStatusService,
  MarketDataSyncHistoryService,
} from "@/lib/domain/admin";

export const runtime = "nodejs";

function errorResponse(error) {
  return NextResponse.json(
    { error: error.message || "管理員市場資料服務發生錯誤" },
    { status: error.status || 500 }
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    new AdminAuthorizationPolicy(session).assertAdmin();

    const statusService = new MarketDataStatusService(prisma);
    const syncHistoryService = new MarketDataSyncHistoryService(prisma);
    const qualityService = new MarketDataQualityService(prisma);
    const status = await statusService.getCurrentStatus();
    const [recentSyncJobs, quality, assetQuality] = await Promise.all([
      syncHistoryService.listRecent(10),
      qualityService.getLatestSnapshot(200),
      qualityService.getAssetQualityOverview({ limit: 500 }),
    ]);

    return NextResponse.json({
      ...status.toJSON(),
      recent_sync_jobs: recentSyncJobs,
      quality,
      asset_quality: assetQuality,
    });
  } catch (error) {
    if (!error.status || error.status >= 500) {
      console.error("Admin market data status failed:", error);
    }
    return errorResponse(error);
  }
}
