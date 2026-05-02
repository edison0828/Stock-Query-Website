import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  AdminAuthorizationPolicy,
  MarketDataStatusService,
  MarketDataSyncJob,
} from "@/lib/domain/admin";

export const runtime = "nodejs";
export const maxDuration = 1200;

const ALLOWED_SCOPES = new Set(["TSE_OTC", "ALL"]);

function errorResponse(error) {
  return NextResponse.json(
    {
      error: error.message || "市場資料同步失敗",
      result: error.result || null,
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
    const sections = {
      skipStocks: normalizeBoolean(body.skip_stocks),
      skipPrices: normalizeBoolean(body.skip_prices),
      skipFinancials: normalizeBoolean(body.skip_financials),
      skipDividends: normalizeBoolean(body.skip_dividends),
    };

    const syncJob = new MarketDataSyncJob();
    const result = await syncJob.run({ scope, sections });

    const statusService = new MarketDataStatusService(prisma);
    const status = await statusService.getCurrentStatus();

    return NextResponse.json({
      message: "市場資料同步完成",
      result,
      status: status.toJSON(),
    });
  } catch (error) {
    if (!error.status || error.status >= 500) {
      console.error("Admin market data sync failed:", error);
    }
    return errorResponse(error);
  }
}
