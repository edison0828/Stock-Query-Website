import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);
    const body = await request.json();
    const { stock_ids } = body;

    // 驗證請求資料
    if (!Array.isArray(stock_ids) || stock_ids.length === 0) {
      return NextResponse.json(
        { error: "請求無效：stock_ids 必須是非空陣列" },
        { status: 400 }
      );
    }

    // 批次查詢關注列表中的股票
    const watchedItems = await prisma.watchlistitems.findMany({
      where: {
        user_id: userIdAsBigInt,
        stock_id: {
          in: stock_ids, // 使用 Prisma 的 in 操作符批次查詢
        },
      },
      select: {
        stock_id: true,
      },
    });

    // 提取已關注的股票 ID 列表
    const watched_stock_ids = watchedItems.map((item) => item.stock_id);

    return NextResponse.json(
      {
        watched_stock_ids,
        total_checked: stock_ids.length,
        total_watched: watched_stock_ids.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("批次檢查關注狀態失敗:", error);
    return NextResponse.json(
      { error: "伺服器內部錯誤，無法檢查關注狀態" },
      { status: 500 }
    );
  }
}
