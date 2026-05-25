"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const RANGE_OPTIONS = ["1M", "3M", "6M", "YTD", "1Y", "3Y"];
const LINE_COLORS = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#f472b6",
  "#14b8a6",
  "#fb7185",
  "#eab308",
];

function formatMetric(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return Number(value).toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
  });
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  const number = Number(value);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  })}%`;
}

function percentClass(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "text-slate-300";
  }

  return Number(value) >= 0 ? "text-emerald-300" : "text-red-300";
}

function buildQuery({ mode, symbol, symbols, range }) {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (symbol) params.set("symbol", symbol);
  if (symbols.length > 0) params.set("symbols", symbols.join(","));
  if (range) params.set("range", range);
  return params.toString();
}

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSymbol = (searchParams.get("symbol") || "2330").toUpperCase();
  const initialMode = searchParams.get("mode") || "peers";
  const initialRange = searchParams.get("range") || "1Y";
  const initialSymbols = (searchParams.get("symbols") || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const [mode, setMode] = useState(initialMode);
  const [anchorSymbol, setAnchorSymbol] = useState(initialSymbol);
  const [symbols, setSymbols] = useState(initialSymbols);
  const [range, setRange] = useState(initialRange);
  const [newSymbol, setNewSymbol] = useState("");
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchComparison = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const query = buildQuery({
      mode,
      symbol: anchorSymbol,
      symbols,
      range,
    });

    router.replace(`/compare?${query}`, { scroll: false });

    try {
      const response = await fetch(`/api/stocks/compare?${query}`);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setComparison(data);
    } catch (err) {
      console.error("載入比較資料失敗:", err);
      setComparison(null);
      setError("無法載入同類比較資料。");
    } finally {
      setIsLoading(false);
    }
  }, [anchorSymbol, mode, range, router, symbols]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const comparableSymbols = useMemo(
    () => comparison?.symbols?.map((item) => item.stock_id) || [],
    [comparison]
  );

  const addSymbol = () => {
    const normalized = newSymbol.trim().toUpperCase();
    if (!normalized || comparableSymbols.includes(normalized)) {
      setNewSymbol("");
      return;
    }

    setSymbols((current) => [...new Set([...comparableSymbols, normalized])]);
    setNewSymbol("");
  };

  const removeSymbol = (symbol) => {
    const nextSymbols = comparableSymbols.filter((item) => item !== symbol);
    setSymbols(nextSymbols);
    if (anchorSymbol === symbol) {
      setAnchorSymbol(nextSymbols[0] || "");
    }
  };

  const resetPeers = () => {
    setSymbols([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">同類別比較</h1>
          <p className="mt-1 text-sm text-slate-400">
            ETF 只和 ETF 比，個股依產業分組比較。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === "peers" ? "default" : "outline"}
            onClick={() => {
              setMode("peers");
              setSymbols([]);
            }}
            className={
              mode === "peers"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
            }
          >
            個股同業
          </Button>
          <Button
            type="button"
            variant={mode === "etf" ? "default" : "outline"}
            onClick={() => {
              setMode("etf");
              setSymbols([]);
            }}
            className={
              mode === "etf"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
            }
          >
            ETF 比較
          </Button>
        </div>
      </div>

      <Card className="border-slate-700 bg-slate-800 text-slate-200">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <div>
            <label
              htmlFor="compare-anchor"
              className="text-sm font-medium text-slate-300"
            >
              基準標的
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="compare-anchor"
                value={anchorSymbol}
                onChange={(event) =>
                  setAnchorSymbol(event.target.value.toUpperCase())
                }
                className="border-slate-600 bg-slate-700 pl-10 text-slate-100"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={range === option ? "default" : "outline"}
                onClick={() => setRange(option)}
                className={
                  range === option
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                }
              >
                {option}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            onClick={fetchComparison}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重新比較
          </Button>
        </CardContent>
      </Card>

      {comparison && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-slate-600 bg-slate-700 text-slate-100">
            {comparison.category || "未分類"}
          </Badge>
          {comparison.symbols.map((item) => (
            <Badge
              key={item.stock_id}
              className="border-slate-600 bg-slate-800 text-slate-200"
            >
              <Link href={`/stocks/${item.stock_id}`} className="hover:underline">
                {item.stock_id} {item.company_name}
              </Link>
              <button
                type="button"
                className="ml-2 text-slate-400 hover:text-slate-100"
                onClick={() => removeSymbol(item.stock_id)}
                aria-label={`移除 ${item.stock_id}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <div className="flex min-w-[220px] items-center gap-2">
            <Input
              value={newSymbol}
              onChange={(event) => setNewSymbol(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addSymbol();
              }}
              placeholder="加入同類代號"
              className="h-8 border-slate-600 bg-slate-800 text-slate-100"
            />
            <Button type="button" size="sm" onClick={addSymbol}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetPeers}
              className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              重置
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-blue-400" />
          載入比較資料中...
        </div>
      ) : error ? (
        <Card className="border-red-500/30 bg-red-500/10 text-red-100">
          <CardContent className="p-4">{error}</CardContent>
        </Card>
      ) : (
        comparison && (
          <>
            <Card className="border-slate-700 bg-slate-800 text-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-100">
                  <BarChart3 className="h-5 w-5 text-blue-300" />
                  淨值化比較走勢
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[360px] p-2 md:p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={comparison.chartData}
                    margin={{ top: 8, right: 20, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis
                      dataKey="date"
                      stroke="#94A3B8"
                      tick={{ fontSize: 12 }}
                      minTickGap={28}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatMetric(value, 0)}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.94)",
                        border: "1px solid #475569",
                        borderRadius: "0.375rem",
                      }}
                      labelStyle={{ color: "#CBD5E1", fontWeight: "bold" }}
                    />
                    <Legend wrapperStyle={{ color: "#E2E8F0" }} />
                    {comparison.symbols.map((item, index) => (
                      <Line
                        key={item.stock_id}
                        type="monotone"
                        dataKey={item.stock_id}
                        name={item.stock_id}
                        stroke={LINE_COLORS[index % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-slate-800 text-slate-200">
              <CardHeader>
                <CardTitle className="text-xl text-slate-100">
                  比較指標
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        <th className="px-3 py-3">標的</th>
                        <th className="px-3 py-3">分類</th>
                        <th className="px-3 py-3 text-right">現價</th>
                        <th className="px-3 py-3 text-right">{comparison.range}</th>
                        <th className="px-3 py-3 text-right">YTD</th>
                        <th className="px-3 py-3 text-right">1Y</th>
                        <th className="px-3 py-3 text-right">最大回撤</th>
                        <th className="px-3 py-3 text-right">年化波動</th>
                        <th className="px-3 py-3 text-right">價格筆數</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.metrics.map((item) => (
                        <tr
                          key={item.stock_id}
                          className="border-b border-slate-700/70 hover:bg-slate-700/30"
                        >
                          <td className="px-3 py-3">
                            <Link
                              href={`/stocks/${item.stock_id}`}
                              className="font-medium text-blue-300 hover:underline"
                            >
                              {item.stock_id}
                            </Link>
                            <div className="mt-1 text-xs text-slate-400">
                              {item.company_name}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {item.asset_type === "ETF" ? "ETF" : item.industry || "未分類"}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-100">
                            {formatMetric(item.current_price)}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-semibold ${percentClass(
                              item.range_return
                            )}`}
                          >
                            {formatPercent(item.range_return)}
                          </td>
                          <td
                            className={`px-3 py-3 text-right ${percentClass(
                              item.returns?.YTD
                            )}`}
                          >
                            {formatPercent(item.returns?.YTD)}
                          </td>
                          <td
                            className={`px-3 py-3 text-right ${percentClass(
                              item.returns?.["1Y"]
                            )}`}
                          >
                            {formatPercent(item.returns?.["1Y"])}
                          </td>
                          <td
                            className={`px-3 py-3 text-right ${percentClass(
                              item.max_drawdown
                            )}`}
                          >
                            {formatPercent(item.max_drawdown)}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-100">
                            {formatPercent(item.annualized_volatility)}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-300">
                            {formatMetric(item.row_count, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-slate-400">
          載入比較頁面中...
        </div>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}
