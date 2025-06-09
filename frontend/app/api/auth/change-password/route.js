import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { verifyPassword, hashPassword } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  // 檢查用戶是否已登入
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  // 檢查是否為 credentials 用戶 (有本地密碼的用戶)
  if (session.user.provider !== "credentials") {
    return NextResponse.json(
      { error: "OAuth 用戶無法使用此功能修改密碼" },
      { status: 403 }
    );
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 驗證請求資料
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "缺少必要的密碼資訊" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "新密碼長度至少需要6個字元" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "新密碼不能與舊密碼相同" },
        { status: 400 }
      );
    }

    // 從資料庫獲取用戶資訊
    const user = await prisma.users.findUnique({
      where: { user_id: userIdAsBigInt },
      select: { user_id: true, password_hash: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "找不到用戶" }, { status: 404 });
    }

    if (!user.password_hash) {
      return NextResponse.json(
        { error: "此帳戶沒有設置本地密碼" },
        { status: 400 }
      );
    }

    // 驗證舊密碼
    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "目前密碼不正確" }, { status: 400 });
    }

    // 雜湊新密碼
    const newPasswordHash = await hashPassword(newPassword);

    // 更新密碼
    await prisma.users.update({
      where: { user_id: userIdAsBigInt },
      data: {
        password_hash: newPasswordHash,
      },
    });

    return NextResponse.json({ message: "密碼已成功更新" }, { status: 200 });
  } catch (error) {
    console.error("Change password API error:", error);
    return NextResponse.json(
      { error: "修改密碼時發生錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
