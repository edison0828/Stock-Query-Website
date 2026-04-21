import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  AlertDomainError,
  AlertMarketDataService,
  AlertValidationError,
  createAlertRule,
} from "@/lib/domain/alerts";

const marketDataService = new AlertMarketDataService(prisma);
const ALLOWED_RULE_TYPES = new Set([
  "PRICE_ABOVE",
  "PRICE_BELOW",
  "PERCENT_CHANGE_UP",
  "PERCENT_CHANGE_DOWN",
]);

function getSessionUserId(session) {
  if (!session?.user?.id) {
    throw new AlertValidationError("未授權：需要登入", { status: 401 });
  }

  return BigInt(session.user.id);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userIdAsBigInt = getSessionUserId(session);

    const rules = await prisma.alertrules.findMany({
      where: {
        user_id: userIdAsBigInt,
      },
      include: {
        stocks: {
          select: {
            company_name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const snapshots = await marketDataService.getSnapshots(
      rules.map((rule) => rule.stock_id)
    );

    const formattedRules = rules.map((rule) => {
      const domainRule = createAlertRule(rule);
      const snapshot = snapshots.get(rule.stock_id);

      return {
        alert_rule_id: Number(rule.alert_rule_id),
        stock_id: rule.stock_id,
        company_name: rule.stocks.company_name,
        rule_type: rule.rule_type,
        threshold_value: Number(rule.threshold_value),
        is_active: rule.is_active,
        condition_label: domainRule.getConditionLabel(),
        last_triggered_market_date: rule.last_triggered_market_date,
        created_at: rule.created_at,
        current_price: snapshot?.currentPrice ?? null,
        percent_change: snapshot?.getPercentChange() ?? 0,
        market_date: snapshot?.marketDate ?? null,
      };
    });

    return NextResponse.json(
      {
        items: formattedRules,
        active_count: formattedRules.filter((rule) => rule.is_active).length,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AlertDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("獲取 alert rules 失敗:", error);
    return NextResponse.json(
      { error: "獲取警示規則時發生錯誤" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const userIdAsBigInt = getSessionUserId(session);
    const body = await request.json();

    const stockId = body.stock_id?.toUpperCase();
    const ruleType = body.rule_type;
    const thresholdValue = Number(body.threshold_value);

    if (!stockId || !ruleType || !body.threshold_value) {
      throw new AlertValidationError("缺少必要的警示規則資訊");
    }

    if (!ALLOWED_RULE_TYPES.has(ruleType)) {
      throw new AlertValidationError("不支援的警示規則類型");
    }

    if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
      throw new AlertValidationError("門檻值必須大於 0");
    }

    const stock = await prisma.stocks.findUnique({
      where: { stock_id: stockId },
      select: {
        stock_id: true,
        company_name: true,
      },
    });

    if (!stock) {
      throw new AlertValidationError(`找不到股票代號 ${stockId}`, { status: 404 });
    }

    const rule = await prisma.alertrules.create({
      data: {
        user_id: userIdAsBigInt,
        stock_id: stockId,
        rule_type: ruleType,
        threshold_value: thresholdValue,
        is_active: true,
      },
    });

    const domainRule = createAlertRule({
      ...rule,
      stocks: {
        company_name: stock.company_name,
      },
    });

    return NextResponse.json(
      {
        alert_rule_id: Number(rule.alert_rule_id),
        stock_id: stock.stock_id,
        company_name: stock.company_name,
        rule_type: rule.rule_type,
        threshold_value: Number(rule.threshold_value),
        is_active: rule.is_active,
        condition_label: domainRule.getConditionLabel(),
        created_at: rule.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AlertDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("建立 alert rule 失敗:", error);
    return NextResponse.json(
      { error: "建立警示規則時發生錯誤" },
      { status: 500 }
    );
  }
}
