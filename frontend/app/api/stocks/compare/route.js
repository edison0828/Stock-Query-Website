import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { StockPeerComparisonService } from "@/lib/domain/stocks";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "";
    const mode = searchParams.get("mode") || "peers";
    const range = searchParams.get("range") || "1Y";
    const limit = Number(searchParams.get("limit") || "6");
    const symbols = (searchParams.get("symbols") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const service = new StockPeerComparisonService(prisma);
    const comparison = await service.buildComparison({
      symbol,
      mode,
      range,
      limit,
      symbols,
    });

    return NextResponse.json(comparison, { status: 200 });
  } catch (error) {
    console.error("建立同類比較失敗:", error);
    return NextResponse.json(
      { error: "建立同類比較時發生錯誤" },
      { status: 500 }
    );
  }
}
