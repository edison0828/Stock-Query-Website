import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  AlertEvaluator,
  AlertMarketDataService,
  NotificationService,
  createAlertRule,
} from "@/lib/domain/alerts";

const marketDataService = new AlertMarketDataService(prisma);
const evaluator = new AlertEvaluator();
const notificationService = new NotificationService(prisma);

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const userIdAsBigInt = BigInt(session.user.id);

    const rules = await prisma.alertrules.findMany({
      where: {
        user_id: userIdAsBigInt,
        is_active: true,
      },
      include: {
        stocks: {
          select: {
            company_name: true,
          },
        },
      },
    });

    if (rules.length === 0) {
      return NextResponse.json(
        {
          checked_rules: 0,
          created_notifications: 0,
          items: [],
        },
        { status: 200 }
      );
    }

    const domainRules = rules.map(createAlertRule);
    const snapshots = await marketDataService.getSnapshots(
      domainRules.map((rule) => rule.stockId)
    );
    const triggeredAlerts = evaluator.evaluate(domainRules, snapshots);
    const createdNotifications =
      await notificationService.persistTriggeredAlerts(triggeredAlerts);

    return NextResponse.json(
      {
        checked_rules: domainRules.length,
        created_notifications: createdNotifications.length,
        items: triggeredAlerts.map((triggered, index) => ({
          notification_id: createdNotifications[index]
            ? Number(createdNotifications[index].notification_id)
            : null,
          stock_id: triggered.rule.stockId,
          title: triggered.notification.title,
          message: triggered.notification.message,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("執行 notification evaluation 失敗:", error);
    return NextResponse.json(
      { error: "執行警示評估時發生錯誤" },
      { status: 500 }
    );
  }
}
