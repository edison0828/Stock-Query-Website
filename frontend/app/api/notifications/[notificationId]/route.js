import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(_request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { notificationId } = await params;
    const notificationIdAsBigInt = BigInt(notificationId);
    const userIdAsBigInt = BigInt(session.user.id);

    const notification = await prisma.notifications.findFirst({
      where: {
        notification_id: notificationIdAsBigInt,
        user_id: userIdAsBigInt,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "找不到指定通知或無權限" },
        { status: 404 }
      );
    }

    const updatedNotification = await prisma.notifications.update({
      where: {
        notification_id: notificationIdAsBigInt,
      },
      data: {
        is_read: true,
      },
    });

    return NextResponse.json(
      {
        notification_id: Number(updatedNotification.notification_id),
        is_read: updatedNotification.is_read,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("更新 notification 狀態失敗:", error);
    return NextResponse.json(
      { error: "更新通知狀態時發生錯誤" },
      { status: 500 }
    );
  }
}
