import {
  AlertEvaluator,
  AlertMarketDataService,
  NotificationService,
  createAlertRule,
} from "@/lib/domain/alerts";

const RULE_INCLUDE = {
  stocks: {
    select: {
      company_name: true,
    },
  },
};

function serializeTriggeredAlert(triggered, notification) {
  return {
    notification_id: notification ? Number(notification.notification_id) : null,
    alert_rule_id: Number(triggered.rule.alertRuleId),
    user_id: Number(triggered.rule.userId),
    stock_id: triggered.rule.stockId,
    title: triggered.notification.title,
    message: triggered.notification.message,
  };
}

export async function evaluateAlertRules({ prisma, userId = null } = {}) {
  const where = {
    is_active: true,
  };

  if (userId) {
    where.user_id = BigInt(userId);
  }

  const rules = await prisma.alertrules.findMany({
    where,
    include: RULE_INCLUDE,
  });

  if (rules.length === 0) {
    return {
      checked_rules: 0,
      triggered_rules: 0,
      created_notifications: 0,
      items: [],
    };
  }

  const domainRules = rules.map(createAlertRule);
  const marketDataService = new AlertMarketDataService(prisma);
  const evaluator = new AlertEvaluator();
  const notificationService = new NotificationService(prisma);

  const snapshots = await marketDataService.getSnapshots(
    domainRules.map((rule) => rule.stockId)
  );
  const triggeredAlerts = evaluator.evaluate(domainRules, snapshots);
  const createdNotifications =
    await notificationService.persistTriggeredAlerts(triggeredAlerts);

  return {
    checked_rules: domainRules.length,
    triggered_rules: triggeredAlerts.length,
    created_notifications: createdNotifications.length,
    items: triggeredAlerts.map((triggered, index) =>
      serializeTriggeredAlert(triggered, createdNotifications[index])
    ),
  };
}
