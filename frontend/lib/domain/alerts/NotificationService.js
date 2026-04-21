export class NotificationService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async persistTriggeredAlerts(triggeredAlerts) {
    const createdNotifications = [];

    for (const triggered of triggeredAlerts) {
      const created = await this.prisma.$transaction(async (tx) => {
        const notification = await tx.notifications.create({
          data: {
            user_id: BigInt(triggered.rule.userId),
            alert_rule_id: BigInt(triggered.rule.alertRuleId),
            stock_id: triggered.rule.stockId,
            title: triggered.notification.title,
            message: triggered.notification.message,
            is_read: false,
          },
        });

        await tx.alertrules.update({
          where: {
            alert_rule_id: BigInt(triggered.rule.alertRuleId),
          },
          data: {
            last_triggered_market_date: triggered.snapshot.marketDate,
          },
        });

        return notification;
      });

      createdNotifications.push(created);
    }

    return createdNotifications;
  }
}
