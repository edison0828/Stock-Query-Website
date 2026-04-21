import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 20);

    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: userIdAsBigInt,
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });

    const unreadCount = await prisma.notifications.count({
      where: {
        user_id: userIdAsBigInt,
        is_read: false,
      },
    });

    return NextResponse.json(
      {
        items: notifications.map((notification) => ({
          notification_id: Number(notification.notification_id),
          alert_rule_id: notification.alert_rule_id
            ? Number(notification.alert_rule_id)
            : null,
          stock_id: notification.stock_id,
          title: notification.title,
          message: notification.message,
          is_read: notification.is_read,
          created_at: notification.created_at,
        })),
        unread_count: unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("獲取 notifications 失敗:", error);
    return NextResponse.json(
      { error: "獲取通知時發生錯誤" },
      { status: 500 }
    );
  }
}
