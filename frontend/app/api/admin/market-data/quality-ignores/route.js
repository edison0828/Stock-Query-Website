import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  AdminAuthorizationPolicy,
  MarketDataQualityService,
} from "@/lib/domain/admin";

export const runtime = "nodejs";

function errorResponse(error) {
  return NextResponse.json(
    { error: error.message || "資料品質忽略規則服務發生錯誤" },
    { status: error.status || 500 }
  );
}

function assertIgnorePayload(body) {
  const stockId = String(body.stock_id || "").trim();
  const checkType = String(body.check_type || "").trim();

  if (!stockId || !checkType) {
    const error = new Error("缺少 stock_id 或 check_type");
    error.status = 400;
    throw error;
  }

  return {
    stockId,
    checkType,
    reason: String(body.reason || "").trim() || null,
  };
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    new AdminAuthorizationPolicy(session).assertAdmin();

    const body = await request.json().catch(() => ({}));
    const payload = assertIgnorePayload(body);
    const qualityService = new MarketDataQualityService(prisma);
    const ignore = await qualityService.ignoreIssue({
      ...payload,
      userId: session.user?.id,
    });
    const assetQuality = await qualityService.getAssetQualityOverview({
      limit: 500,
    });

    return NextResponse.json({
      message: "已忽略資料品質問題",
      ignore,
      asset_quality: assetQuality,
    });
  } catch (error) {
    if (!error.status || error.status >= 500) {
      console.error("Create market data quality ignore failed:", error);
    }
    return errorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    new AdminAuthorizationPolicy(session).assertAdmin();

    const body = await request.json().catch(() => ({}));
    const payload = assertIgnorePayload(body);
    const qualityService = new MarketDataQualityService(prisma);
    await qualityService.unignoreIssue(payload);
    const assetQuality = await qualityService.getAssetQualityOverview({
      limit: 500,
    });

    return NextResponse.json({
      message: "已取消忽略資料品質問題",
      asset_quality: assetQuality,
    });
  } catch (error) {
    if (!error.status || error.status >= 500) {
      console.error("Delete market data quality ignore failed:", error);
    }
    return errorResponse(error);
  }
}
