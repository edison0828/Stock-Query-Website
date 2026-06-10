import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { evaluateAlertRules } from "@/lib/domain/alerts/evaluateAlertRules";

export const runtime = "nodejs";
export const maxDuration = 300;

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function isAuthorizedCronRequest(request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const bearerToken = getBearerToken(request);
  const headerToken = request.headers.get("x-cron-secret");

  return bearerToken === cronSecret || headerToken === cronSecret;
}

async function handleCronEvaluation(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "未授權：cron secret 無效" },
      { status: 401 }
    );
  }

  try {
    const result = await evaluateAlertRules({ prisma });

    return NextResponse.json(
      {
        message: "警示排程評估完成",
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("執行 cron notification evaluation 失敗:", error);
    return NextResponse.json(
      { error: "執行警示排程評估時發生錯誤" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handleCronEvaluation(request);
}

export async function POST(request) {
  return handleCronEvaluation(request);
}
