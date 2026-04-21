"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, BellRing, Loader2, PlusCircle, RefreshCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RULE_TYPE_OPTIONS = [
  { value: "PRICE_ABOVE", label: "價格高於" },
  { value: "PRICE_BELOW", label: "價格低於" },
  { value: "PERCENT_CHANGE_UP", label: "單日漲幅至少" },
  { value: "PERCENT_CHANGE_DOWN", label: "單日跌幅至少" },
];

function formatDateTime(value) {
  if (!value) {
    return "尚未觸發";
  }

  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return Number(value).toFixed(digits);
}

export default function AlertsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const stockFromQuery = useMemo(
    () => searchParams.get("stock")?.toUpperCase() || "",
    [searchParams]
  );

  const [form, setForm] = useState({
    stock_id: "",
    rule_type: "PRICE_ABOVE",
    threshold_value: "",
  });
  const [rules, setRules] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState(null);
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  const [readingNotificationId, setReadingNotificationId] = useState(null);

  const fetchRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const response = await fetch("/api/alerts");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "無法載入警示規則");
      }

      setRules(data.items || []);
      setActiveCount(data.active_count || 0);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: error.message,
      });
      setRules([]);
      setActiveCount(0);
    } finally {
      setIsLoadingRules(false);
    }
  }, [toast]);

  const fetchNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const response = await fetch("/api/notifications?limit=20");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "無法載入通知");
      }

      setNotifications(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: error.message,
      });
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [toast]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchRules(), fetchNotifications()]);
  }, [fetchNotifications, fetchRules]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!stockFromQuery) {
      return;
    }

    setForm((current) => ({
      ...current,
      stock_id: current.stock_id || stockFromQuery,
    }));
  }, [stockFromQuery]);

  const handleCreateRule = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock_id: form.stock_id.trim().toUpperCase(),
          rule_type: form.rule_type,
          threshold_value: form.threshold_value,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "建立警示規則失敗");
      }

      toast({
        title: "已建立警示規則",
        description: `${data.stock_id} ${data.condition_label}`,
      });

      setForm((current) => ({
        ...current,
        threshold_value: "",
      }));

      await fetchRules();
    } catch (error) {
      console.error("Error creating alert rule:", error);
      toast({
        variant: "destructive",
        title: "建立失敗",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRule = async (rule) => {
    setTogglingRuleId(rule.alert_rule_id);

    try {
      const response = await fetch(`/api/alerts/${rule.alert_rule_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !rule.is_active,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "更新警示狀態失敗");
      }

      setRules((current) =>
        current.map((item) =>
          item.alert_rule_id === rule.alert_rule_id ? { ...item, ...data } : item
        )
      );
      setActiveCount((current) => current + (data.is_active ? 1 : -1));

      toast({
        title: data.is_active ? "警示已啟用" : "警示已停用",
        description: `${data.stock_id} ${data.condition_label}`,
      });
    } catch (error) {
      console.error("Error toggling alert rule:", error);
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error.message,
      });
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleDeleteRule = async (rule) => {
    setDeletingRuleId(rule.alert_rule_id);

    try {
      const response = await fetch(`/api/alerts/${rule.alert_rule_id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "刪除警示規則失敗");
      }

      setRules((current) =>
        current.filter((item) => item.alert_rule_id !== rule.alert_rule_id)
      );
      if (rule.is_active) {
        setActiveCount((current) => Math.max(0, current - 1));
      }

      toast({
        title: "警示規則已刪除",
        description: `${rule.stock_id} ${rule.condition_label}`,
      });
    } catch (error) {
      console.error("Error deleting alert rule:", error);
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: error.message,
      });
    } finally {
      setDeletingRuleId(null);
    }
  };

  const handleEvaluateRules = async () => {
    setIsEvaluating(true);

    try {
      const response = await fetch("/api/notifications/evaluate", {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "執行警示評估失敗");
      }

      await Promise.all([fetchRules(), fetchNotifications()]);

      toast({
        title: "警示評估完成",
        description:
          data.created_notifications > 0
            ? `已新增 ${data.created_notifications} 則通知`
            : "本次沒有新的觸發結果",
      });
    } catch (error) {
      console.error("Error evaluating alert rules:", error);
      toast({
        variant: "destructive",
        title: "評估失敗",
        description: error.message,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    setReadingNotificationId(notificationId);

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "更新通知狀態失敗");
      }

      setNotifications((current) =>
        current.map((item) =>
          item.notification_id === notificationId ? { ...item, ...data } : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error.message,
      });
    } finally {
      setReadingNotificationId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">
            Alerts & Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            讓股價條件、漲跌幅條件變成可持續評估的規則物件，而不是單純查資料。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-600/20 text-blue-200 border-blue-500/40">
            啟用規則 {activeCount}
          </Badge>
          <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40">
            未讀通知 {unreadCount}
          </Badge>
          <Button
            onClick={handleEvaluateRules}
            disabled={isEvaluating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isEvaluating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            立即評估規則
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-700 bg-slate-800 text-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Bell className="h-5 w-5 text-blue-400" />
              建立警示規則
            </CardTitle>
            <CardDescription className="text-slate-400">
              先從最小可運作版本開始：到價提醒與單日漲跌幅提醒。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRule} className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">股票代號</label>
                <Input
                  value={form.stock_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stock_id: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="例如 2330"
                  className="border-slate-600 bg-slate-900 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">規則類型</label>
                <Select
                  value={form.rule_type}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, rule_type: value }))
                  }
                >
                  <SelectTrigger className="border-slate-600 bg-slate-900 text-slate-100">
                    <SelectValue placeholder="選擇規則類型" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                    {RULE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">門檻值</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.threshold_value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      threshold_value: event.target.value,
                    }))
                  }
                  placeholder="例如 100 或 3"
                  className="border-slate-600 bg-slate-900 text-slate-100"
                />
              </div>
              <div className="md:col-span-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  新增警示規則
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800 text-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <BellRing className="h-5 w-5 text-amber-400" />
              最近通知
            </CardTitle>
            <CardDescription className="text-slate-400">
              這裡顯示評估流程實際產生的結果，能直接對應到 OOAD 的 notification object。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                載入通知中...
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                還沒有通知。先建立規則，再執行一次評估。
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`rounded-lg border px-4 py-3 ${
                    notification.is_read
                      ? "border-slate-700 bg-slate-900/40"
                      : "border-amber-500/40 bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-100">
                          {notification.title}
                        </p>
                        <Badge
                          className={
                            notification.is_read
                              ? "border-slate-600 bg-slate-700/60 text-slate-200"
                              : "border-amber-500/40 bg-amber-500/20 text-amber-100"
                          }
                        >
                          {notification.is_read ? "已讀" : "未讀"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.notification_id)}
                        disabled={readingNotificationId === notification.notification_id}
                        className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700"
                      >
                        {readingNotificationId === notification.notification_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "標示已讀"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-800 text-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-100">規則清單</CardTitle>
          <CardDescription className="text-slate-400">
            規則目前支援啟用、停用、刪除，並顯示最新市場快照，讓 rule evaluation 可視化。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRules ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              載入警示規則中...
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
              尚未建立任何警示規則。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/30">
                  <TableHead className="text-slate-400">股票</TableHead>
                  <TableHead className="text-slate-400">條件</TableHead>
                  <TableHead className="text-slate-400">最新價格</TableHead>
                  <TableHead className="text-slate-400">單日漲跌幅</TableHead>
                  <TableHead className="text-slate-400">最後觸發</TableHead>
                  <TableHead className="text-slate-400">狀態</TableHead>
                  <TableHead className="text-right text-slate-400">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow
                    key={rule.alert_rule_id}
                    className="border-slate-700 hover:bg-slate-700/30"
                  >
                    <TableCell>
                      <div className="font-medium text-slate-100">{rule.stock_id}</div>
                      <div className="text-xs text-slate-400">{rule.company_name}</div>
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {rule.condition_label}
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {formatNumber(rule.current_price)}
                    </TableCell>
                    <TableCell
                      className={
                        Number(rule.percent_change) >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {Number(rule.percent_change) >= 0 ? "+" : ""}
                      {formatNumber(rule.percent_change)}%
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {formatDateTime(rule.last_triggered_market_date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          rule.is_active
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-100"
                            : "border-slate-600 bg-slate-700/60 text-slate-200"
                        }
                      >
                        {rule.is_active ? "啟用中" : "已停用"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRule(rule)}
                          disabled={togglingRuleId === rule.alert_rule_id}
                          className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700"
                        >
                          {togglingRuleId === rule.alert_rule_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : rule.is_active ? (
                            "停用"
                          ) : (
                            "啟用"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRule(rule)}
                          disabled={deletingRuleId === rule.alert_rule_id}
                        >
                          {deletingRuleId === rule.alert_rule_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
