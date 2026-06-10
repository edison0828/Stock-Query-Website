import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { evaluateAlertRules } from "@/lib/domain/alerts/evaluateAlertRules";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const result = await evaluateAlertRules({
      prisma,
      userId: session.user.id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("執行 notification evaluation 失敗:", error);
    return NextResponse.json(
      { error: "執行警示評估時發生錯誤" },
      { status: 500 }
    );
  }
}
