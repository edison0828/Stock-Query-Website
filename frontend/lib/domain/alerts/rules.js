import { AlertValidationError } from "./errors";

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

export class AlertRule {
  constructor({
    alertRuleId,
    userId,
    stockId,
    companyName = null,
    ruleType,
    thresholdValue,
    isActive = true,
    lastTriggeredMarketDate = null,
    createdAt = null,
  }) {
    this.alertRuleId = alertRuleId;
    this.userId = userId;
    this.stockId = stockId;
    this.companyName = companyName || stockId;
    this.ruleType = ruleType;
    this.thresholdValue = Number(thresholdValue);
    this.isActive = isActive;
    this.lastTriggeredMarketDate = lastTriggeredMarketDate
      ? new Date(lastTriggeredMarketDate)
      : null;
    this.createdAt = createdAt ? new Date(createdAt) : null;
  }

  isTriggered(_snapshot) {
    throw new Error("Subclasses must implement isTriggered");
  }

  getConditionLabel() {
    throw new Error("Subclasses must implement getConditionLabel");
  }

  buildNotification(snapshot) {
    return {
      title: `${this.stockId} 觸發提醒`,
      message: `${this.companyName} 達成警示條件：${this.getConditionLabel()}。目前價格 ${formatNumber(
        snapshot.currentPrice ?? 0
      )}，單日漲跌幅 ${formatNumber(snapshot.getPercentChange())}%`,
    };
  }
}

export class PriceAboveAlertRule extends AlertRule {
  isTriggered(snapshot) {
    return snapshot.hasCurrentPrice() && snapshot.currentPrice >= this.thresholdValue;
  }

  getConditionLabel() {
    return `價格高於 ${formatNumber(this.thresholdValue)}`;
  }
}

export class PriceBelowAlertRule extends AlertRule {
  isTriggered(snapshot) {
    return snapshot.hasCurrentPrice() && snapshot.currentPrice <= this.thresholdValue;
  }

  getConditionLabel() {
    return `價格低於 ${formatNumber(this.thresholdValue)}`;
  }
}

export class PercentChangeUpAlertRule extends AlertRule {
  isTriggered(snapshot) {
    return snapshot.getPercentChange() >= this.thresholdValue;
  }

  getConditionLabel() {
    return `單日漲幅至少 ${formatNumber(this.thresholdValue)}%`;
  }
}

export class PercentChangeDownAlertRule extends AlertRule {
  isTriggered(snapshot) {
    return snapshot.getPercentChange() <= -this.thresholdValue;
  }

  getConditionLabel() {
    return `單日跌幅至少 ${formatNumber(this.thresholdValue)}%`;
  }
}

export function createAlertRule(ruleRecord) {
  const baseInput = {
    alertRuleId: ruleRecord.alert_rule_id,
    userId: ruleRecord.user_id,
    stockId: ruleRecord.stock_id,
    companyName: ruleRecord.stocks?.company_name,
    ruleType: ruleRecord.rule_type,
    thresholdValue: ruleRecord.threshold_value,
    isActive: ruleRecord.is_active,
    lastTriggeredMarketDate: ruleRecord.last_triggered_market_date,
    createdAt: ruleRecord.created_at,
  };

  switch (ruleRecord.rule_type) {
    case "PRICE_ABOVE":
      return new PriceAboveAlertRule(baseInput);
    case "PRICE_BELOW":
      return new PriceBelowAlertRule(baseInput);
    case "PERCENT_CHANGE_UP":
      return new PercentChangeUpAlertRule(baseInput);
    case "PERCENT_CHANGE_DOWN":
      return new PercentChangeDownAlertRule(baseInput);
    default:
      throw new AlertValidationError("不支援的警示規則類型");
  }
}
