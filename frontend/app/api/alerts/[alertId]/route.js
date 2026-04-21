import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAlertRule } from "@/lib/domain/alerts";

async function getOwnedRule(alertId, userIdAsBigInt) {
  return prisma.alertrules.findFirst({
    where: {
      alert_rule_id: alertId,
      user_id: userIdAsBigInt,
    },
    include: {
      stocks: {
        select: {
          company_name: true,
        },
      },
    },
  });
}

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { alertId } = params;
    const alertRuleId = BigInt(alertId);
    const userIdAsBigInt = BigInt(session.user.id);
    const body = await request.json();
    const isActive = body?.is_active;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "is_active 必須是布林值" },
        { status: 400 }
      );
    }

    const existingRule = await getOwnedRule(alertRuleId, userIdAsBigInt);

    if (!existingRule) {
      return NextResponse.json(
        { error: "找不到指定的警示規則或無權限" },
        { status: 404 }
      );
    }

    const updatedRule = await prisma.alertrules.update({
      where: {
        alert_rule_id: alertRuleId,
      },
      data: {
        is_active: isActive,
      },
      include: {
        stocks: {
          select: {
            company_name: true,
          },
        },
      },
    });

    const domainRule = createAlertRule(updatedRule);

    return NextResponse.json(
      {
        alert_rule_id: Number(updatedRule.alert_rule_id),
        stock_id: updatedRule.stock_id,
        company_name: updatedRule.stocks.company_name,
        rule_type: updatedRule.rule_type,
        threshold_value: Number(updatedRule.threshold_value),
        is_active: updatedRule.is_active,
        condition_label: domainRule.getConditionLabel(),
        last_triggered_market_date: updatedRule.last_triggered_market_date,
        created_at: updatedRule.created_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("更新 alert rule 失敗:", error);
    return NextResponse.json(
      { error: "更新警示規則時發生錯誤" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { alertId } = params;
    const alertRuleId = BigInt(alertId);
    const userIdAsBigInt = BigInt(session.user.id);

    const existingRule = await getOwnedRule(alertRuleId, userIdAsBigInt);

    if (!existingRule) {
      return NextResponse.json(
        { error: "找不到指定的警示規則或無權限" },
        { status: 404 }
      );
    }

    await prisma.alertrules.delete({
      where: {
        alert_rule_id: alertRuleId,
      },
    });

    return NextResponse.json(
      { message: "警示規則已成功刪除" },
      { status: 200 }
    );
  } catch (error) {
    console.error("刪除 alert rule 失敗:", error);
    return NextResponse.json(
      { error: "刪除警示規則時發生錯誤" },
      { status: 500 }
    );
  }
}
