"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Database,
  ExternalLink,
  Filter,
  FileText,
  History,
  Info,
  Loader2,
  Play,
  RefreshCcw,
  RotateCcw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString("zh-TW");
}

function severityClass(severity) {
  if (severity === "critical") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }
  if (severity === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }
  return "border-blue-500/30 bg-blue-500/10 text-blue-100";
}

function issueTypeLabel(type) {
  return (
    {
      MISSING_PRICE_DATA: "缺價格",
      STALE_PRICE_DATE: "日期落後",
      OLD_SYMBOL_FEW_ROWS: "舊標的少資料",
      SPARSE_ACTIVE_HISTORY: "長期密度低",
      MISSING_COMPANY_NAME: "名稱缺漏",
    }[type] || type
  );
}

const qualityFilters = [
  ["ALL", "全部"],
  ["STOCK", "股票"],
  ["ETF", "ETF"],
  ["MISSING_PRICE_DATA", "缺價格"],
  ["STALE_PRICE_DATE", "日期落後"],
  ["OLD_SYMBOL_FEW_ROWS", "舊標的少資料"],
  ["SPARSE_ACTIVE_HISTORY", "長期密度低"],
  ["MISSING_COMPANY_NAME", "名稱缺漏"],
];

export default function AdminMarketDataClient() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [source, setSource] = useState("AUTO");
  const [scope, setScope] = useState("TSE_OTC");
  const [qualityFilter, setQualityFilter] = useState("ALL");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [isUpdatingIgnore, setIsUpdatingIgnore] = useState(false);
  const [skipOptions, setSkipOptions] = useState({
    skip_stocks: false,
    skip_prices: false,
    skip_financials: false,
    skip_dividends: false,
  });
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const recentSyncJobs = status?.recent_sync_jobs || [];
  const quality = status?.quality || { summary: {}, issues: [] };
  const assetQuality = status?.asset_quality || { summary: {}, assets: [] };
  const assetQualityAssets = assetQuality.assets || [];
  const qualityIssueCount = quality.issues?.length || 0;
  const filteredAssetQualityAssets = useMemo(() => {
    if (qualityFilter === "ALL") {
      return assetQualityAssets;
    }

    if (qualityFilter === "STOCK" || qualityFilter === "ETF") {
      return assetQualityAssets.filter(
        (asset) => asset.asset_type === qualityFilter
      );
    }

    return assetQualityAssets.filter((asset) =>
      asset.issues?.some((issue) => issue.check_type === qualityFilter)
    );
  }, [assetQualityAssets, qualityFilter]);
  const selectedActiveAsset = selectedAsset
    ? assetQualityAssets.find((asset) => asset.stock_id === selectedAsset.stock_id)
    : null;
  const selectedAssetFromStatus = selectedActiveAsset || selectedAsset;
  const selectedIgnoredIssues = selectedAssetFromStatus
    ? (assetQuality.ignored || []).filter(
        (ignore) => ignore.stock_id === selectedAssetFromStatus.stock_id
      )
    : [];

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
          source,
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

      setStatus({
        ...data.status,
        recent_sync_jobs: data.recent_sync_jobs || [],
        quality: data.quality || { summary: {}, issues: [] },
        asset_quality: data.asset_quality || { summary: {}, assets: [] },
      });
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

  const updateAssetQuality = (assetQualityResult) => {
    setStatus((current) => ({
      ...current,
      asset_quality: assetQualityResult || { summary: {}, assets: [] },
    }));
  };

  const handleIgnoreIssue = async (asset, issue) => {
    setIsUpdatingIgnore(true);

    try {
      const response = await fetch("/api/admin/market-data/quality-ignores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock_id: asset.stock_id,
          check_type: issue.check_type,
          reason: ignoreReason,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "無法忽略資料品質問題");
      }

      updateAssetQuality(data.asset_quality);
      setIgnoreReason("");
      toast({
        title: "已標記忽略",
        description: `${asset.stock_id} ${issueTypeLabel(issue.check_type)}`,
      });
    } catch (error) {
      console.error("Error ignoring market data quality issue:", error);
      toast({
        variant: "destructive",
        title: "操作失敗",
        description: error.message,
      });
    } finally {
      setIsUpdatingIgnore(false);
    }
  };

  const handleUnignoreIssue = async (ignore) => {
    setIsUpdatingIgnore(true);

    try {
      const response = await fetch("/api/admin/market-data/quality-ignores", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock_id: ignore.stock_id,
          check_type: ignore.check_type,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "無法取消忽略資料品質問題");
      }

      updateAssetQuality(data.asset_quality);
      toast({
        title: "已取消忽略",
        description: `${ignore.stock_id} ${issueTypeLabel(ignore.check_type)}`,
      });
    } catch (error) {
      console.error("Error unignoring market data quality issue:", error);
      toast({
        variant: "destructive",
        title: "操作失敗",
        description: error.message,
      });
    } finally {
      setIsUpdatingIgnore(false);
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
              FinLab first + free fallback
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
              預設優先使用 FinLab，沒有 token 時自動改用免費資料源。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300">資料來源</Label>
              <Select value={source} onValueChange={setSource} disabled={isSyncing}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Auto：FinLab 優先，免費來源備援</SelectItem>
                  <SelectItem value="FINLAB">FinLab</SelectItem>
                  <SelectItem value="FREE">免費來源：FinMind + TWSE + TPEx</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">匯入範圍</Label>
              <Select value={scope} onValueChange={setScope} disabled={isSyncing}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TSE_OTC">上市上櫃股票</SelectItem>
                  <SelectItem value="ETF">ETF</SelectItem>
                  <SelectItem value="ALL">全部可用範圍</SelectItem>
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
                  `DATABASE_URL` 與 `uv`。Auto 模式有 `FINLAB_API_TOKEN`
                  會使用 FinLab，否則使用免費來源。
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
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-slate-700 bg-slate-800/60 p-3">
                    <p className="text-xs text-slate-500">來源</p>
                    <p className="mt-1 text-lg font-semibold text-slate-100">
                      {lastSyncResult.source || "N/A"}
                    </p>
                  </div>
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
                {lastSyncResult.fallback_reason && (
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                    <p className="text-xs text-blue-200">Fallback reason</p>
                    <p className="mt-1 text-sm text-blue-100">
                      {lastSyncResult.fallback_reason}
                    </p>
                  </div>
                )}
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-700 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-50">
              <History className="h-5 w-5 text-blue-300" />
              同步紀錄
            </CardTitle>
            <CardDescription className="text-slate-400">
              最近 10 次市場資料同步工作。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSyncJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">狀態</th>
                      <th className="py-2 pr-3">來源</th>
                      <th className="py-2 pr-3">範圍</th>
                      <th className="py-2 pr-3">開始時間</th>
                      <th className="py-2 pr-3">耗時</th>
                      <th className="py-2 pr-3">價格筆數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSyncJobs.map((job) => (
                      <tr
                        key={job.sync_job_id}
                        className="border-b border-slate-800 text-slate-300 last:border-0"
                      >
                        <td className="py-3 pr-3">
                          <Badge
                            className={
                              job.status === "SUCCESS"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                : job.status === "FAILED"
                                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                                  : "border-blue-500/30 bg-blue-500/10 text-blue-200"
                            }
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          {job.requested_source}
                          {job.resolved_source
                            ? ` -> ${job.resolved_source}`
                            : ""}
                        </td>
                        <td className="py-3 pr-3">{job.scope}</td>
                        <td className="py-3 pr-3">
                          {formatDateTime(job.started_at)}
                        </td>
                        <td className="py-3 pr-3">
                          {formatDuration(job.duration_ms)}
                        </td>
                        <td className="py-3 pr-3">
                          {job.historical_price_rows === null
                            ? "N/A"
                            : formatCount(job.historical_price_rows)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-slate-700 text-sm text-slate-500">
                尚無同步紀錄
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-50">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              資料品質異常
            </CardTitle>
            <CardDescription className="text-slate-400">
              檢查缺價格、日期落後、長期標的資料過少、密度偏低與名稱缺漏。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["異常標的", assetQuality.summary?.total_assets_with_issues || 0],
                ["Critical", assetQuality.summary?.critical || 0],
                ["ETF", assetQuality.summary?.ETF || 0],
                ["股票", assetQuality.summary?.STOCK || 0],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-slate-700 bg-slate-800/60 p-3"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-100">
                    {formatCount(value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
                <Filter className="h-4 w-4" />
                篩選
              </div>
              <div className="flex flex-wrap gap-2">
                {qualityFilters.map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={qualityFilter === value ? "default" : "outline"}
                    onClick={() => setQualityFilter(value)}
                    className={
                      qualityFilter === value
                        ? "h-8 bg-blue-600 text-white hover:bg-blue-500"
                        : "h-8 border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {filteredAssetQualityAssets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">標的</th>
                      <th className="py-2 pr-3">類型</th>
                      <th className="py-2 pr-3">嚴重度</th>
                      <th className="py-2 pr-3">價格筆數</th>
                      <th className="py-2 pr-3">資料範圍</th>
                      <th className="py-2 pr-3">落後</th>
                      <th className="py-2 pr-3">原因</th>
                      <th className="py-2 pr-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssetQualityAssets.slice(0, 80).map((asset) => (
                      <tr
                        key={asset.stock_id}
                        className="border-b border-slate-800 text-slate-300 last:border-0"
                      >
                        <td className="py-3 pr-3">
                          <div className="font-medium text-slate-100">
                            {asset.stock_id}
                          </div>
                          <div className="max-w-[220px] truncate text-xs text-slate-500">
                            {asset.company_name}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                          >
                            {asset.asset_type}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge className={severityClass(asset.severity)}>
                            {asset.severity}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          {formatCount(asset.row_count)}
                        </td>
                        <td className="py-3 pr-3">
                          <div>{formatDate(asset.first_date)}</div>
                          <div className="text-xs text-slate-500">
                            到 {formatDate(asset.latest_date)}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          {asset.latest_lag_days === null
                            ? "N/A"
                            : `${asset.latest_lag_days} 天`}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex max-w-[260px] flex-wrap gap-1">
                            {asset.issues.map((issue) => (
                              <Badge
                                key={issue.check_type}
                                variant="outline"
                                className="border-slate-600 text-slate-300"
                              >
                                {issueTypeLabel(issue.check_type)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAsset(asset);
                                setIgnoreReason("");
                              }}
                              className="h-8 border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-700"
                            >
                              詳細
                              <Info className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-700"
                            >
                              <Link href={`/stocks/${asset.stock_id}`}>
                                查看
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAssetQualityAssets.length > 80 && (
                  <p className="mt-3 text-xs text-slate-500">
                    目前顯示前 80 筆，請使用篩選器縮小範圍。
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-slate-700 text-sm text-slate-500">
                目前篩選條件下沒有資料品質問題
              </div>
            )}
            {qualityIssueCount > 0 && (
              <p className="text-xs text-slate-500">
                最近同步 snapshot 記錄 {formatCount(qualityIssueCount)} 筆問題；
                上方清單為目前資料庫即時計算結果。
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(selectedAssetFromStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAsset(null);
            setIgnoreReason("");
          }
        }}
      >
        <DialogContent className="max-w-3xl border-slate-700 bg-slate-900 text-slate-100">
          {selectedAssetFromStatus && (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-50">
                  {selectedAssetFromStatus.stock_id} 資料品質診斷
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {selectedAssetFromStatus.company_name}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["類型", selectedAssetFromStatus.asset_type],
                  ["市場", selectedAssetFromStatus.market_type],
                  ["狀態", selectedAssetFromStatus.security_status],
                  ["價格筆數", formatCount(selectedAssetFromStatus.row_count)],
                  ["第一筆", formatDate(selectedAssetFromStatus.first_date)],
                  ["最新日", formatDate(selectedAssetFromStatus.latest_date)],
                  [
                    "基準日",
                    formatDate(selectedAssetFromStatus.reference_latest_date),
                  ],
                  [
                    "落後天數",
                    selectedAssetFromStatus.latest_lag_days === null
                      ? "N/A"
                      : `${selectedAssetFromStatus.latest_lag_days} 天`,
                  ],
                  [
                    "密度",
                    selectedAssetFromStatus.density === null
                      ? "N/A"
                      : selectedAssetFromStatus.density,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-700 bg-slate-800/70 p-3"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-100">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300">忽略原因</Label>
                <Textarea
                  value={ignoreReason}
                  onChange={(event) => setIgnoreReason(event.target.value)}
                  placeholder="例如：已下市舊標的，保留在主檔但不需追補資料。"
                  className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-100">
                  目前問題
                </h4>
                {selectedActiveAsset?.issues?.length > 0 ? (
                  selectedActiveAsset.issues.map((issue) => (
                    <div
                      key={issue.check_type}
                      className="flex flex-col gap-3 rounded-md border border-slate-700 bg-slate-800/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge className={severityClass(issue.severity)}>
                            {issue.severity}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                          >
                            {issueTypeLabel(issue.check_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300">
                          {issue.message}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdatingIgnore}
                        onClick={() =>
                          handleIgnoreIssue(selectedAssetFromStatus, issue)
                        }
                        className="border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                      >
                        忽略此問題
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                    此標的目前沒有未忽略的資料品質問題。
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-100">
                  已忽略問題
                </h4>
                {selectedIgnoredIssues.length > 0 ? (
                  selectedIgnoredIssues.map((ignore) => (
                    <div
                      key={`${ignore.stock_id}-${ignore.check_type}`}
                      className="flex flex-col gap-3 rounded-md border border-slate-700 bg-slate-800/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <Badge
                          variant="outline"
                          className="mb-2 border-slate-600 text-slate-300"
                        >
                          {issueTypeLabel(ignore.check_type)}
                        </Badge>
                        <p className="text-sm text-slate-300">
                          {ignore.reason || "未填寫原因"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(ignore.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdatingIgnore}
                        onClick={() => handleUnignoreIssue(ignore)}
                        className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-700"
                      >
                        <RotateCcw className="h-4 w-4" />
                        取消忽略
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                    尚未忽略此標的的問題。
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  asChild
                  variant="outline"
                  className="border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800"
                >
                  <Link href={`/stocks/${selectedAssetFromStatus.stock_id}`}>
                    查看個股頁
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
