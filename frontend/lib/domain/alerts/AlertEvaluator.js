function isSameMarketDate(left, right) {
  if (!left || !right) {
    return false;
  }

  return new Date(left).toISOString().slice(0, 10) === new Date(right).toISOString().slice(0, 10);
}

export class AlertEvaluator {
  evaluate(rules, snapshotsByStock) {
    return rules.flatMap((rule) => {
      if (!rule.isActive) {
        return [];
      }

      const snapshot = snapshotsByStock.get(rule.stockId);

      if (!snapshot || !snapshot.hasCurrentPrice()) {
        return [];
      }

      if (isSameMarketDate(rule.lastTriggeredMarketDate, snapshot.marketDate)) {
        return [];
      }

      if (!rule.isTriggered(snapshot)) {
        return [];
      }

      return [
        {
          rule,
          snapshot,
          notification: rule.buildNotification(snapshot),
        },
      ];
    });
  }
}
