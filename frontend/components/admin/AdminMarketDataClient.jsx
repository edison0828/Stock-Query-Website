"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Database,
  FileText,
  Loader2,
  Play,
  RefreshCcw,
  ShieldCheck,
  Split,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

function formatCount(value) {
  return new Intl.NumberFormat("zh-TW").format(Number(value || 0));
}

function formatDate(value) {
  return value || "尚無資料";
}

function formatDuration(ms) {
  if (!ms && ms !== 0) {
    return "N/A";
  }

  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds} 秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} 分 ${remainingSeconds} 秒`;
}

function outputTail(value) {
  if (!value) {
    return "";
  }

  return value.split("\n").slice(-18).join("\n").trim();
}

export default function AdminMarketDataClient() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scope, setScope] = useState("TSE_OTC");
  const [skipOptions, setSkipOptions] = useState({
    skip_stocks: false,
    skip_prices: false,
    skip_financials: false,
    skip_dividends: false,
  });
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const statusItems = useMemo(
    () => [
      {
        label: "股票主檔",
        value: formatCount(status?.stock_count),
        detail: "stocks",
        icon: Database,
      },
      {
        label: "歷史股價",
        value: formatCount(status?.historical_price_count),
        detail: `最新日期 ${formatDate(status?.latest_price_date)}`,
        icon: TrendingUp,
      },
      {
        label: "財報資料",
        value: formatCount(status?.financial_report_count),
        detail: `最新季度 ${status?.latest_financial_label || "尚無資料"}`,
        icon: FileText,
      },
      {
        label: "股利資料",
        value: formatCount(status?.dividend_count),
        detail: `最新日期 ${formatDate(status?.latest_dividend_date)}`,
        icon: CalendarClock,
      },
      {
        label: "股票分割",
        value: formatCount(status?.stock_split_count),
        detail: "stocksplits",
        icon: Split,
      },
    ],
    [status]
  );

  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);

    try {
      const response = await fetch("/api/admin/market-data");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "無法載入市場資料狀態");
      }

      setStatus(data);
    } catch (error) {
      console.error("Error loading admin market data status:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: error.message,
      });
    } finally {
      setIsLoadingStatus(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSkipChange = (key, checked) => {
    setSkipOptions((current) => ({
      ...current,
      [key]: Boolean(checked),
    }));
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const response = await fetch("/api/admin/market-data/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope,
          ...skipOptions,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || "市場資料同步失敗");
        error.result = data.result;
        throw error;
      }

      setStatus(data.status);
      setLastSyncResult(data.result);
      toast({
        title: "同步完成",
        description: `耗時 ${formatDuration(data.result?.duration_ms)}`,
      });
    } catch (error) {
      console.error("Error syncing market data:", error);
      setLastSyncResult(error.result || null);
      toast({
        variant: "destructive",
        title: "同步失敗",
        description: error.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Admin
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              FinLab
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold text-slate-50">
            市場資料維護
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            管理股票主檔、歷史股價、財報與股利資料的匯入狀態。
          </p>
        </div>

        <Button
          variant="outline"
          className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
          onClick={fetchStatus}
          disabled={isLoadingStatus || isSyncing}
        >
          {isLoadingStatus ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          重新整理
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statusItems.map((item) => (
          <Card key={item.label} className="border-slate-700 bg-slate-900/70">
            <CardHeader className="space-y-0 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="text-slate-400">
                  {item.label}
                </CardDescription>
                <item.icon className="h-4 w-4 text-blue-300" />
              </div>
              <CardTitle className="text-2xl text-slate-50">
                {isLoadingStatus ? "..." : item.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="border-slate-700 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-slate-50">執行同步</CardTitle>
            <CardDescription className="text-slate-400">
              由管理員觸發既有 FinLab 匯入腳本。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300">匯入範圍</Label>
              <Select value={scope} onValueChange={setScope} disabled={isSyncing}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TSE_OTC">上市與上櫃</SelectItem>
                  <SelectItem value="ALL">全部 FinLab 範圍</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-300">略過項目</Label>
              {[
                ["skip_stocks", "股票主檔"],
                ["skip_prices", "歷史股價"],
                ["skip_financials", "財報資料"],
                ["skip_dividends", "股利資料"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-300"
                >
                  <Checkbox
                    checked={skipOptions[key]}
                    onCheckedChange={(checked) => handleSkipChange(key, checked)}
                    disabled={isSyncing}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  完整同步可能需要較久時間，且需要伺服器環境具備
                  `FINLAB_API_TOKEN`、`DATABASE_URL` 與 `uv`。
                </p>
              </div>
            </div>

            <Button
              className="w-full bg-blue-600 text-white hover:bg-blue-500"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isSyncing ? "同步中" : "同步市場資料"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-slate-50">最近一次同步結果</CardTitle>
            <CardDescription className="text-slate-400">
              顯示匯入指令、耗時與最後輸出。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastSyncResult ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-slate-700 bg-slate-800/60 p-3">
                    <p className="text-xs text-slate-500">Exit code</p>
                    <p className="mt-1 text-lg font-semibold text-slate-100">
                      {lastSyncResult.code}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-800/60 p-3">
                    <p className="text-xs text-slate-500">耗時</p>
                    <p className="mt-1 text-lg font-semibold text-slate-100">
                      {formatDuration(lastSyncResult.duration_ms)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-800/60 p-3">
                    <p className="text-xs text-slate-500">完成時間</p>
                    <p className="mt-1 text-sm font-medium text-slate-100">
                      {lastSyncResult.finished_at
                        ? new Date(lastSyncResult.finished_at).toLocaleString(
                            "zh-TW"
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-950 p-3">
                  <p className="mb-2 text-xs text-slate-500">Command</p>
                  <code className="break-all text-xs text-slate-300">
                    {lastSyncResult.command}
                  </code>
                </div>
                <pre className="max-h-80 overflow-auto rounded-md border border-slate-700 bg-slate-950 p-4 text-xs text-slate-300">
                  {outputTail(lastSyncResult.stderr) ||
                    outputTail(lastSyncResult.stdout) ||
                    "沒有輸出"}
                </pre>
              </>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-slate-700 text-sm text-slate-500">
                尚未執行同步
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
