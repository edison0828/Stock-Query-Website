// app/api/watchlist/[identifier]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  let userIdAsBigInt;
  try {
    userIdAsBigInt = BigInt(session.user.id);
  } catch (e) {
    return NextResponse.json(
      { error: "未授權：無效的用戶 ID" },
      { status: 401 }
    );
  }

  const { identifier: stockIdToRemove } = await params; // 'identifier' 是資料夾名稱 [identifier]

  if (!stockIdToRemove) {
    return NextResponse.json(
      { error: "請求無效：缺少股票標識符" },
      { status: 400 }
    );
  }

  try {
    const deleteResult = await prisma.watchlistitems.delete({
      where: {
        user_id_stock_id: {
          // 根據你的 Prisma schema 的 @@id([user_id, stock_id])
          user_id: userIdAsBigInt,
          stock_id: stockIdToRemove,
        },
      },
    });

    // delete 操作如果找不到記錄會拋出 PrismaClientKnownRequestError (P2025)
    // 如果執行到這裡，表示刪除成功 (或記錄本來就不存在但 Prisma 沒報錯，取決於配置)

    return NextResponse.json(
      { message: `${stockIdToRemove} 已成功從關注列表移除` },
      { status: 200 }
    );
  } catch (error) {
    console.error(`從關注列表移除 ${stockIdToRemove} 失敗:`, error);
    if (error.code === "P2025") {
      // Prisma: Record to delete not found.
      return NextResponse.json(
        { error: `股票 ${stockIdToRemove} 不在您的關注列表中或已被移除。` },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "伺服器內部錯誤，無法從關注列表移除股票。" },
      { status: 500 }
    );
  }
}
