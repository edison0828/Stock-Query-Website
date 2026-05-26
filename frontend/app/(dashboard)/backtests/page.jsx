"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Play,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
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

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return `NT$${Number(value).toLocaleString("zh-TW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  const numericValue = Number(value);
  return `${numericValue >= 0 ? "+" : ""}${numericValue.toFixed(2)}%`;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return Number(value).toFixed(digits);
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString("zh-TW");
}

function getDefaultStartDate() {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  return oneYearAgo.toISOString().slice(0, 10);
}

function getDefaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function BacktestsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const stockFromQuery = useMemo(
    () => searchParams.get("stock")?.toUpperCase() || "",
    [searchParams]
  );

  const [form, setForm] = useState({
    stock_id: "",
    strategy_type: "MOVING_AVERAGE_CROSS",
    start_date: getDefaultStartDate(),
    end_date: getDefaultEndDate(),
    short_window: "5",
    long_window: "20",
    rsi_window: "14",
    oversold_threshold: "30",
    overbought_threshold: "70",
    lookback_window: "20",
    initial_capital: "100000",
    sizing_mode: "FULL_CAPITAL",
    position_size_percent: "100",
    fee_rate: "0.001425",
    sell_tax_rate: "0.003",
    slippage_rate: "0",
  });
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRuns = useCallback(async () => {
    setIsLoadingRuns(true);

    try {
      const response = await fetch("/api/backtests");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "無法載入回測紀錄");
      }

      setRuns(data.items || []);

      if (!selectedRunId && data.items?.length > 0) {
        setSelectedRunId(data.items[0].backtest_run_id);
      }
    } catch (error) {
      console.error("Error fetching backtests:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: error.message,
      });
      setRuns([]);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [selectedRunId, toast]);

  const fetchRunDetail = useCallback(
    async (runId) => {
      if (!runId) {
        return;
      }

      setIsLoadingDetail(true);

      try {
        const response = await fetch(`/api/backtests/${runId}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "無法載入回測細節");
        }

        setSelectedRun(data);
      } catch (error) {
        console.error("Error fetching backtest detail:", error);
        toast({
          variant: "destructive",
          title: "載入失敗",
          description: error.message,
        });
        setSelectedRun(null);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (!stockFromQuery) {
      return;
    }

    setForm((current) => ({
      ...current,
      stock_id: current.stock_id || stockFromQuery,
    }));
  }, [stockFromQuery]);

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetail(selectedRunId);
    }
  }, [fetchRunDetail, selectedRunId]);

  const handleCreateBacktest = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const strategyParameters = {
        MOVING_AVERAGE_CROSS: {
          shortWindow: Number(form.short_window),
          longWindow: Number(form.long_window),
        },
        RSI_REVERSION: {
          rsiWindow: Number(form.rsi_window),
          oversoldThreshold: Number(form.oversold_threshold),
          overboughtThreshold: Number(form.overbought_threshold),
        },
        BREAKOUT: {
          lookbackWindow: Number(form.lookback_window),
        },
      }[form.strategy_type];

      const response = await fetch("/api/backtests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock_id: form.stock_id.trim().toUpperCase(),
          strategy_type: form.strategy_type,
          start_date: form.start_date,
          end_date: form.end_date,
          initial_capital: Number(form.initial_capital),
          parameters: strategyParameters,
          execution_config: {
            sizingMode: form.sizing_mode,
            positionSizePercent: Number(form.position_size_percent),
            feeRate: Number(form.fee_rate),
            sellTaxRate: Number(form.sell_tax_rate),
            slippageRate: Number(form.slippage_rate),
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "建立回測失敗");
      }

      setRuns((current) => [
        {
          backtest_run_id: data.backtest_run_id,
          stock_id: data.stock_id,
          company_name: data.company_name,
          strategy_type: data.strategy_type,
          strategy_name: data.strategy_name,
          start_date: data.start_date,
          end_date: data.end_date,
          short_window: data.short_window,
          long_window: data.long_window,
          initial_capital: data.initial_capital,
          final_value: data.final_value,
          total_return_percent: data.total_return_percent,
          max_drawdown_percent: data.max_drawdown_percent,
          win_rate_percent: data.win_rate_percent,
          trade_count: data.trade_count,
          signal_count: data.signal_count,
          parameters: data.parameters,
          execution_config: data.execution_config,
          annualized_return_percent: data.annualized_return_percent,
          profit_factor: data.profit_factor,
          average_win_percent: data.average_win_percent,
          average_loss_percent: data.average_loss_percent,
          max_consecutive_losses: data.max_consecutive_losses,
          created_at: data.created_at,
        },
        ...current,
      ]);
      setSelectedRunId(data.backtest_run_id);
      setSelectedRun(data);

      toast({
        title: "回測完成",
        description: `${data.stock_id} ${data.strategy_name}`,
      });
    } catch (error) {
      console.error("Error creating backtest:", error);
      toast({
        variant: "destructive",
        title: "建立失敗",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReturn = Number(selectedRun?.total_return_percent ?? 0);
  const selectedParameters = selectedRun?.parameters || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">
            Strategy & Backtests
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            先用最小可運作版本把策略物件、回測引擎、績效報告串起來，目前支援均線交叉策略。
          </p>
        </div>
        <Badge className="border-blue-500/40 bg-blue-500/15 text-blue-100">
          已儲存回測 {runs.length}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-700 bg-slate-800 text-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Play className="h-5 w-5 text-emerald-400" />
              建立回測
            </CardTitle>
            <CardDescription className="text-slate-400">
              第一版先聚焦在單一股票、單一策略，但物件結構已經可擴充其他策略。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBacktest} className="space-y-4">
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
                <label className="text-sm text-slate-300">策略</label>
                <Select
                  value={form.strategy_type}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, strategy_type: value }))
                  }
                >
                  <SelectTrigger className="border-slate-600 bg-slate-900 text-slate-100">
                    <SelectValue placeholder="選擇策略" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                    <SelectItem value="MOVING_AVERAGE_CROSS">
                      均線交叉策略
                    </SelectItem>
                    <SelectItem value="RSI_REVERSION">RSI 反轉策略</SelectItem>
                    <SelectItem value="BREAKOUT">價格突破策略</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">開始日期</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        start_date: event.target.value,
                      }))
                    }
                    className="border-slate-600 bg-slate-900 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">結束日期</label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        end_date: event.target.value,
                      }))
                    }
                    className="border-slate-600 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>
              {form.strategy_type === "MOVING_AVERAGE_CROSS" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">短均線</label>
                    <Input
                      type="number"
                      min="2"
                      value={form.short_window}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          short_window: event.target.value,
                        }))
                      }
                      className="border-slate-600 bg-slate-900 text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">長均線</label>
                    <Input
                      type="number"
                      min="3"
                      value={form.long_window}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          long_window: event.target.value,
                        }))
                      }
                      className="border-slate-600 bg-slate-900 text-slate-100"
                    />
                  </div>
                </div>
              )}
              {form.strategy_type === "RSI_REVERSION" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">RSI 週期</label>
                    <Input
                      type="number"
                      min="2"
                      value={form.rsi_window}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          rsi_window: event.target.value,
                        }))
                      }
                      className="border-slate-600 bg-slate-900 text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">超賣門檻</label>
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={form.oversold_threshold}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          oversold_threshold: event.target.value,
                        }))
                      }
                      className="border-slate-600 bg-slate-900 text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">超買門檻</label>
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={form.overbought_threshold}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          overbought_threshold: event.target.value,
                        }))
                      }
                      className="border-slate-600 bg-slate-900 text-slate-100"
                    />
                  </div>
                </div>
              )}
              {form.strategy_type === "BREAKOUT" && (
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">突破觀察天數</label>
                  <Input
                    type="number"
                    min="2"
                    value={form.lookback_window}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lookback_window: event.target.value,
                      }))
                    }
                    className="border-slate-600 bg-slate-900 text-slate-100"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm text-slate-300">初始資金</label>
                <Input
                  type="number"
                  min="1000"
                  step="1000"
                  value={form.initial_capital}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      initial_capital: event.target.value,
                    }))
                  }
                  className="border-slate-600 bg-slate-900 text-slate-100"
                />
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Settings className="h-4 w-4 text-slate-400" />
                  交易設定
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">資金投入方式</label>
                    <Select
                      value={form.sizing_mode}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, sizing_mode: value }))
                      }
                    >
                      <SelectTrigger className="border-slate-600 bg-slate-950 text-slate-100">
                        <SelectValue placeholder="選擇投入方式" />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                        <SelectItem value="FULL_CAPITAL">滿倉投入</SelectItem>
                        <SelectItem value="PERCENT_OF_CASH">現金比例投入</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">投入比例 (%)</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={form.position_size_percent}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          position_size_percent: event.target.value,
                        }))
                      }
                      disabled={form.sizing_mode === "FULL_CAPITAL"}
                      className="border-slate-600 bg-slate-950 text-slate-100 disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">手續費率</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={form.fee_rate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          fee_rate: event.target.value,
                        }))
                      }
                      className="border-slate-600 bg-slate-950 text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">賣出交易稅</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={form.sell_tax_rate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          sell_tax_rate: event.target.value,
                        }))
                      }
                      className="border-slate-600 bg-slate-950 text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">滑價率</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={form.slippage_rate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          slippage_rate: event.target.value,
                        }))
                      }
                      className="border-slate-600 bg-slate-950 text-slate-100"
                    />
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                執行回測
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800 text-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Activity className="h-5 w-5 text-blue-400" />
              最近回測
            </CardTitle>
            <CardDescription className="text-slate-400">
              每次回測都會保存績效摘要，後面可再延伸成策略比較與參數優化。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRuns ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                載入回測紀錄中...
              </div>
            ) : runs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                還沒有回測紀錄。你可以從這裡直接建立第一筆，或從
                <Link href="/stocks" className="ml-1 text-blue-400 hover:underline">
                  個股頁
                </Link>
                帶入股票代號。
              </div>
            ) : (
              <div className="space-y-3">
                {runs.map((run) => (
                  <button
                    key={run.backtest_run_id}
                    type="button"
                    onClick={() => setSelectedRunId(run.backtest_run_id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      selectedRunId === run.backtest_run_id
                        ? "border-blue-500/40 bg-blue-500/10"
                        : "border-slate-700 bg-slate-900/40 hover:bg-slate-700/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-100">
                          {run.stock_id} {run.company_name ? `· ${run.company_name}` : ""}
                        </p>
                        <p className="text-sm text-slate-400">{run.strategy_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(run.start_date)} - {formatDate(run.end_date)}
                        </p>
                      </div>
                      <Badge
                        className={
                          Number(run.total_return_percent) >= 0
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-100"
                            : "border-rose-500/40 bg-rose-500/20 text-rose-100"
                        }
                      >
                        {formatPercent(run.total_return_percent)}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-800 text-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-100">回測結果</CardTitle>
          <CardDescription className="text-slate-400">
            這裡呈現策略績效、equity curve 與交易明細，對應 OOAD 的 report 與 trade objects。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              載入回測細節中...
            </div>
          ) : !selectedRun ? (
            <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
              選擇一筆回測紀錄，或先建立新的回測。
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <Card className="border-slate-700 bg-slate-900/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">總報酬率</p>
                    <p
                      className={`mt-2 flex items-center text-2xl font-semibold ${
                        selectedReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {selectedReturn >= 0 ? (
                        <ArrowUpRight className="mr-1 h-5 w-5" />
                      ) : (
                        <ArrowDownRight className="mr-1 h-5 w-5" />
                      )}
                      {formatPercent(selectedRun.total_return_percent)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-900/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">年化報酬率</p>
                    <p
                      className={`mt-2 text-2xl font-semibold ${
                        Number(selectedRun.annualized_return_percent ?? 0) >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {formatPercent(selectedRun.annualized_return_percent)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-900/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">最終資產</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">
                      {formatCurrency(selectedRun.final_value)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-900/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">最大回撤</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-300">
                      {formatPercent(-Math.abs(Number(selectedRun.max_drawdown_percent)))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-900/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">Profit Factor</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">
                      {formatNumber(selectedRun.profit_factor)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-900/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400">勝率 / 成交次數</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">
                      {formatPercent(selectedRun.win_rate_percent)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedRun.trade_count} 次平倉，{selectedRun.signal_count} 個訊號
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">
                      {selectedRun.stock_id} {selectedRun.company_name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {selectedRun.strategy_name} · {formatDate(selectedRun.start_date)} -{" "}
                      {formatDate(selectedRun.end_date)}
                    </p>
                  </div>
                  <Badge className="border-slate-600 bg-slate-700/60 text-slate-200">
                    {selectedRun.strategy_type === "MOVING_AVERAGE_CROSS"
                      ? `${selectedParameters.shortWindow ?? selectedRun.short_window}/${
                          selectedParameters.longWindow ?? selectedRun.long_window
                        } MA`
                      : selectedRun.strategy_type === "RSI_REVERSION"
                        ? `RSI ${selectedParameters.rsiWindow}`
                        : `突破 ${selectedParameters.lookbackWindow} 日`}
                  </Badge>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedRun.equity_curve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" minTickGap={24} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(label) => `日期 ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold text-slate-100">交易紀錄</h3>
                {selectedRun.trades.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
                    這段期間沒有產生有效交易。
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-700/30">
                        <TableHead className="text-slate-400">日期</TableHead>
                        <TableHead className="text-slate-400">動作</TableHead>
                        <TableHead className="text-slate-400">價格</TableHead>
                        <TableHead className="text-slate-400">數量</TableHead>
                        <TableHead className="text-slate-400">成本</TableHead>
                        <TableHead className="text-slate-400">損益</TableHead>
                        <TableHead className="text-slate-400">原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRun.trades.map((trade) => (
                        <TableRow
                          key={trade.backtest_trade_id}
                          className="border-slate-700 hover:bg-slate-700/30"
                        >
                          <TableCell className="text-slate-300">
                            {formatDate(trade.trade_date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                trade.trade_type === "BUY"
                                  ? "border-blue-500/40 bg-blue-500/20 text-blue-100"
                                  : "border-amber-500/40 bg-amber-500/20 text-amber-100"
                              }
                            >
                              {trade.trade_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-200">
                            {formatCurrency(trade.price)}
                          </TableCell>
                          <TableCell className="text-slate-200">
                            {Number(trade.quantity).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {trade.fee_amount === null && trade.tax_amount === null
                              ? "N/A"
                              : formatCurrency(
                                  Number(trade.fee_amount ?? 0) +
                                    Number(trade.tax_amount ?? 0)
                                )}
                          </TableCell>
                          <TableCell
                            className={
                              trade.pnl_amount === null
                                ? "text-slate-500"
                                : trade.pnl_amount >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                            }
                          >
                            {trade.pnl_amount === null
                              ? "N/A"
                              : `${trade.pnl_amount >= 0 ? "+" : ""}${formatCurrency(
                                  trade.pnl_amount
                                )}`}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {trade.reason || "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
