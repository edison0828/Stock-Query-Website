// app/(dashboard)/stocks/[symbol]/page.jsx
"use client";

import Link from "next/link";
import TradeDialog from "@/components/shared/TradeDialog"; // 模擬買入賣出對話框的組件
import CandlestickChart from "@/components/stocks/CandlestickChart";
import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation"; // 用於獲取動態路由參數
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // 引入 Tabs
import {
  Star,
  AlertTriangle,
  Bell,
  BarChart3,
  LineChart as BacktestIcon,
  CandlestickChart as CandlestickIcon,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Newspaper,
  FileText,
  DivideSquare,
  Landmark,
  ExternalLink,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"; // 用於主要圖表
import { useToast } from "@/hooks/use-toast"; // 引入 useToast
import { useWatchlist } from "@/contexts/WatchlistContext";
import { Badge } from "@/components/ui/badge";

// 時間區間按鈕
const timeRanges = ["5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];

function formatMetric(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return Number(value).toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  });
}

function formatLargeMetric(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  const number = Number(value);
  if (Math.abs(number) >= 1e9) return `${(number / 1e9).toFixed(1)}B`;
  if (Math.abs(number) >= 1e6) return `${(number / 1e6).toFixed(1)}M`;
  if (Math.abs(number) >= 1e3) return `${(number / 1e3).toFixed(1)}K`;
  return number.toLocaleString("zh-TW");
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return `${Number(value).toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  })}%`;
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  const number = Number(value);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  })}%`;
}

function percentColorClass(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "text-slate-300";
  }

  return Number(value) >= 0 ? "text-emerald-300" : "text-red-300";
}

function signalBadgeClass(value) {
  if (["偏多", "多頭排列"].includes(value)) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  if (["偏空", "空頭排列"].includes(value)) {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }

  return "border-slate-500/40 bg-slate-500/10 text-slate-200";
}

function qualityBadgeClass(status) {
  if (status === "ok") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "critical") {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }
  return "border-amber-500/40 bg-amber-500/10 text-amber-100";
}

function formatOptional(value) {
  if (value === null || value === undefined || value === "") return "待補充";
  return value;
}

function formatBooleanLabel(value) {
  if (value === true) return "是";
  if (value === false) return "否";
  return "待補充";
}

// 頁籤內容組件
const TabContentComponent = ({ title, children, icon: Icon }) => (
  <div className="mt-4 p-1">
    {Icon && (
      <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center">
        <Icon className="mr-2 h-5 w-5 text-blue-400" />
        {title}
      </h3>
    )}
    {children}
  </div>
);

// 為了能正確在 Suspense 中使用，我們需要一個內層的 Client Component 來使用 useParams
function StockDetailPageContent() {
  const params = useParams(); // 獲取動態路由參數 { symbol: 'AAPL' }
  const stockSymbol = params.symbol?.toUpperCase(); // 確保是大寫
  const { toast } = useToast();

  // 使用 Context 中的 refreshWatchlist 函數
  const { refreshWatchlist } = useWatchlist();

  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("1M"); // 預設時間區間
  const [selectedChartType, setSelectedChartType] = useState("candlestick");
  const [financialChartMode, setFinancialChartMode] = useState("earnings");
  const [isWatched, setIsWatched] = useState(false); // 模擬關注狀態
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false); // 模擬交易對話框狀態
  const [tradeDialogAction, setTradeDialogAction] = useState("BUY"); // 模擬交易動作

  useEffect(() => {
    if (!stockSymbol) return;

    const fetchStockData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 獲取股票詳細資訊
        const response = await fetch(`/api/stocks/${stockSymbol}`);
        if (!response.ok) {
          throw new Error(`無法獲取股票 ${stockSymbol} 的資訊`);
        }
        const data = await response.json();
        setStockData(data);

        // 檢查是否已關注（需要登入）
        try {
          const watchResponse = await fetch(
            `/api/stocks/${stockSymbol}/watchlist`
          );
          if (watchResponse.ok) {
            const watchData = await watchResponse.json();
            setIsWatched(watchData.isWatched);
          }
        } catch (watchErr) {
          // 如果未登入或其他錯誤，保持預設狀態
          console.log("無法檢查關注狀態:", watchErr);
        }
      } catch (err) {
        console.error("Error fetching stock data:", err);
        setError(err.message);
        toast({
          variant: "destructive",
          title: "錯誤",
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockData();
  }, [stockSymbol, toast]);

  // 更新關注列表處理函數
  const handleToggleWatchlist = async () => {
    const newWatchStatus = !isWatched;
    const originalStatus = isWatched;

    // 樂觀更新 UI
    setIsWatched(newWatchStatus);

    try {
      const method = newWatchStatus ? "POST" : "DELETE";
      const response = await fetch(`/api/stocks/${stockSymbol}/watchlist`, {
        method,
      });

      if (!response.ok) {
        throw new Error("操作失敗");
      }

      const data = await response.json();
      setIsWatched(data.isWatched);

      // 刷新側邊欄摘要
      refreshWatchlist();

      toast({
        title: newWatchStatus ? "已加入關注列表" : "已從關注列表移除",
        description: data.message,
      });
    } catch (err) {
      // 回滾 UI 狀態
      setIsWatched(originalStatus);
      toast({
        variant: "destructive",
        title: "操作失敗",
        description: err.message || "無法更新關注列表，請稍後再試。",
      });
    }
  };

  const handleOpenTradeDialog = (action) => {
    setTradeDialogAction(action);
    setIsTradeDialogOpen(true);
  };

  const handleTradeSuccess = () => {
    setIsTradeDialogOpen(false);
    // 可選：交易成功後刷新股票數據 (如果持倉影響了顯示) 或用戶餘額等
    // fetchStockData(); // 如果需要刷新當前股票頁面的某些數據
    toast({ title: "交易已提交", description: "您的模擬交易請求已發送。" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        載入股票資訊中...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-400 p-8">錯誤: {error}</div>;
  }

  if (!stockData) {
    return (
      <div className="text-center text-slate-400 p-8">
        找不到股票 {stockSymbol} 的資訊。
      </div>
    );
  }

  const currentChartData = stockData.historicalData[selectedTimeRange] || [];
  const priceQuality = stockData.priceQuality || {};
  const technicalSummary = stockData.technicalSummary || {};
  const performanceSummary = stockData.performanceSummary || {};
  const returnSummary = performanceSummary.returns || {};
  const financialTrend = stockData.financialTrend || [];
  const isEtf = stockData.isEtf || stockData.assetType === "ETF";
  const etfProfile = stockData.etfProfile;
  const etfNavHistory = stockData.etfNavHistory || [];
  const etfHoldings = stockData.etfHoldings || { items: [] };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 股票基本資訊 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
                {stockData.symbol} - {stockData.companyName}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {stockData.exchange}
                {isEtf ? " / ETF" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <Button
                variant={isWatched ? "outline" : "default"}
                size="sm"
                onClick={handleToggleWatchlist}
                className={
                  isWatched
                    ? "border-amber-500 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                    : "bg-slate-600 hover:bg-slate-500"
                }
              >
                <Star
                  className={`mr-2 h-4 w-4 ${
                    isWatched ? "fill-amber-500 text-amber-500" : ""
                  }`}
                />
                {isWatched ? "已關注" : "加入關注"}
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-blue-500/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:text-blue-100"
              >
                <Link href={`/alerts?stock=${encodeURIComponent(stockSymbol)}`}>
                  <Bell className="mr-2 h-4 w-4" />
                  建立提醒
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:text-emerald-100"
              >
                <Link href={`/backtests?stock=${encodeURIComponent(stockSymbol)}`}>
                  <BacktestIcon className="mr-2 h-4 w-4" />
                  執行回測
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 hover:text-cyan-50"
              >
                <Link
                  href={`/compare?mode=${isEtf ? "etf" : "peers"}&symbol=${encodeURIComponent(
                    stockSymbol
                  )}`}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  同類比較
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenTradeDialog("BUY")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                模擬買入
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenTradeDialog("SELL")}
                className="bg-red-600 hover:bg-red-700"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                模擬賣出
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <span
              className={`text-4xl font-bold ${
                stockData.isUp ? "text-green-400" : "text-red-400"
              }`}
            >
              ${stockData.currentPrice.toFixed(2)}
            </span>
            <span
              className={`ml-3 text-lg font-medium ${
                stockData.isUp ? "text-green-400" : "text-red-400"
              }`}
            >
              {stockData.isUp ? (
                <TrendingUp className="inline h-5 w-5 mr-1" />
              ) : (
                <TrendingDown className="inline h-5 w-5 mr-1" />
              )}
              {stockData.isUp ? "+" : ""}
              {stockData.priceChange.toFixed(2)} ({stockData.isUp ? "+" : ""}
              {stockData.percentChange.toFixed(2)}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            As of {stockData.lastUpdated}. {stockData.marketStatus}
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-slate-800 border-slate-700 text-slate-200">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-400">價格資料品質</p>
              <Badge className={qualityBadgeClass(priceQuality.status)}>
                {priceQuality.status === "ok" ? "OK" : "需檢查"}
              </Badge>
            </div>
            <p className="text-2xl font-semibold text-slate-50">
              {formatMetric(priceQuality.row_count)}
            </p>
            <p className="mt-1 text-xs text-slate-500">歷史價格筆數</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700 text-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-400">資料範圍</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {priceQuality.first_date || "N/A"} -{" "}
              {priceQuality.latest_date || "N/A"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              最新基準日 {priceQuality.reference_latest_date || "N/A"}
            </p>
          </CardContent>
        </Card>
        {[
          ["MA5", technicalSummary.ma5, "text-amber-300"],
          ["MA20", technicalSummary.ma20, "text-sky-300"],
          ["MA60", technicalSummary.ma60, "text-violet-300"],
        ].map(([label, value, className]) => (
          <Card
            key={label}
            className="bg-slate-800 border-slate-700 text-slate-200"
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-400">{label}</p>
              <p className={`mt-2 text-2xl font-semibold ${className}`}>
                {formatMetric(value)}
              </p>
              <p className="mt-1 text-xs text-slate-500">最新均線值</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {priceQuality.issues?.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/10 text-amber-100">
          <CardContent className="flex gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {priceQuality.issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-100">
                技術與績效指標
              </CardTitle>
              <CardDescription className="text-slate-400">
                RSI、MACD、均線狀態、52 週位置與各期間報酬。
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={signalBadgeClass(technicalSummary.ma_trend)}>
                {technicalSummary.ma_trend || "資料不足"}
              </Badge>
              <Badge className={signalBadgeClass(technicalSummary.macd_status)}>
                MACD {technicalSummary.macd_status || "資料不足"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["RSI 14", formatMetric(technicalSummary.rsi14), "相對強弱"],
              [
                "MACD 柱",
                formatMetric(technicalSummary.macd_histogram),
                `DIF ${formatMetric(technicalSummary.macd)} / DEA ${formatMetric(
                  technicalSummary.macd_signal
                )}`,
              ],
              [
                "量 MA20",
                formatLargeMetric(technicalSummary.volume_ma20),
                "20 日成交量均量",
              ],
              [
                "最大回撤",
                formatSignedPercent(performanceSummary.max_drawdown),
                "全期間 peak-to-trough",
              ],
            ].map(([label, value, detail]) => (
              <div
                key={label}
                className="rounded-md border border-slate-700 bg-slate-900/60 p-4"
              >
                <p className="text-xs font-medium text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="rounded-md border border-slate-700 bg-slate-900/60 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-100">
                52 週位置
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">52 週高點</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">
                    {formatMetric(technicalSummary.week52_high)}
                  </p>
                  <p className="text-xs text-slate-500">
                    距高點{" "}
                    <span
                      className={percentColorClass(
                        technicalSummary.distance_to_52w_high
                      )}
                    >
                      {formatSignedPercent(
                        technicalSummary.distance_to_52w_high
                      )}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">52 週低點</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">
                    {formatMetric(technicalSummary.week52_low)}
                  </p>
                  <p className="text-xs text-slate-500">
                    距低點{" "}
                    <span
                      className={percentColorClass(
                        technicalSummary.distance_to_52w_low
                      )}
                    >
                      {formatSignedPercent(technicalSummary.distance_to_52w_low)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">MA20 乖離</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${percentColorClass(
                      technicalSummary.bias_ma20
                    )}`}
                  >
                    {formatSignedPercent(technicalSummary.bias_ma20)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">MA60 乖離</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${percentColorClass(
                      technicalSummary.bias_ma60
                    )}`}
                  >
                    {formatSignedPercent(technicalSummary.bias_ma60)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-700 bg-slate-900/60 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-100">
                期間報酬
              </h4>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {["1M", "3M", "6M", "YTD", "1Y"].map((period) => (
                  <div
                    key={period}
                    className="min-w-0 rounded-md border border-slate-700 bg-slate-800/70 p-3"
                  >
                    <p className="text-xs text-slate-500">{period}</p>
                    <p
                      className={`mt-1 break-words text-base font-semibold ${percentColorClass(
                        returnSummary[period]
                      )}`}
                    >
                      {formatSignedPercent(returnSummary[period])}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* 歷史價格圖表 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-xl font-semibold text-slate-100 mb-2 sm:mb-0">
              歷史價格圖表
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-slate-600 bg-slate-900/40 p-1">
                <Button
                  type="button"
                  variant={
                    selectedChartType === "candlestick" ? "default" : "ghost"
                  }
                  size="sm"
                  onClick={() => setSelectedChartType("candlestick")}
                  className={
                    selectedChartType === "candlestick"
                      ? "h-8 bg-blue-600 px-3 text-white hover:bg-blue-700"
                      : "h-8 px-3 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                  }
                >
                  <CandlestickIcon className="mr-2 h-4 w-4" />
                  K線
                </Button>
                <Button
                  type="button"
                  variant={selectedChartType === "line" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedChartType("line")}
                  className={
                    selectedChartType === "line"
                      ? "h-8 bg-blue-600 px-3 text-white hover:bg-blue-700"
                      : "h-8 px-3 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                  }
                >
                  <BacktestIcon className="mr-2 h-4 w-4" />
                  線圖
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {timeRanges.map((range) => (
                  <Button
                    key={range}
                    variant={
                      selectedTimeRange === range ? "default" : "outline"
                    }
                    size="xs" // Smaller buttons
                    onClick={() => setSelectedTimeRange(range)}
                    className={
                      selectedTimeRange === range
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200"
                    }
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[400px] p-2 md:p-4">
          {selectedChartType === "candlestick" ? (
            <CandlestickChart data={currentChartData} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={currentChartData}
                margin={{ top: 5, right: 20, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 12 }} />
                <YAxis
                  stroke="#94A3B8"
                  tickFormatter={(value) =>
                    isEtf ? value.toFixed(0) : `$${value.toFixed(0)}`
                  }
                  tick={{ fontSize: 12 }}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(30, 41, 59, 0.9)",
                    border: "1px solid #475569",
                    borderRadius: "0.375rem",
                  }}
                  labelStyle={{ color: "#CBD5E1", fontWeight: "bold" }}
                  itemStyle={{ color: "#94A3B8" }}
                />
                <Legend wrapperStyle={{ color: "#E2E8F0" }} />
                <Line
                  type="monotone"
                  dataKey={isEtf ? "price_index" : "price"}
                  name={isEtf ? "淨值化走勢" : "Stock Price"}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                {!isEtf && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="ma5"
                      name="MA5"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="ma20"
                      name="MA20"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="ma60"
                      name="MA60"
                      stroke="#a78bfa"
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      {/* 資訊頁籤 */}
      <Tabs
        defaultValue={isEtf ? "etf-profile" : "basic-info"}
        className="w-full"
      >
        <TabsList
          className={`grid w-full ${
            isEtf ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-3"
          } bg-slate-700/50 p-1 h-auto`}
        >
          {isEtf ? (
            <>
              <TabsTrigger
                value="etf-profile"
                className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
              >
                ETF資料
              </TabsTrigger>
              <TabsTrigger
                value="etf-performance"
                className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
              >
                績效
              </TabsTrigger>
              <TabsTrigger
                value="etf-technical"
                className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
              >
                技術指標
              </TabsTrigger>
              <TabsTrigger
                value="dividends"
                className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
              >
                配息紀錄
              </TabsTrigger>
              <TabsTrigger
                value="data-quality"
                className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
              >
                資料品質
              </TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger
                value="basic-info"
                className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
              >
                基本資料
              </TabsTrigger>
              <TabsTrigger
                value="financials"
                className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
              >
                財務報告
              </TabsTrigger>
              <TabsTrigger
                value="dividends"
                className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
              >
                股息記錄
              </TabsTrigger>
            </>
          )}
          {/* <TabsTrigger
            value="splits"
            className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
          >
            分割記錄
          </TabsTrigger>
          <TabsTrigger
            value="news"
            className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-50 text-slate-300"
          >
            新聞
          </TabsTrigger> */}
        </TabsList>
        {!isEtf && (
          <TabsContent
            value="basic-info"
            className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
          >
          <TabContentComponent title="公司概況" icon={Landmark}>
            <p className="text-sm text-slate-300 leading-relaxed">
              {stockData.basicInfo.description}
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-slate-400">行業:</span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.sector}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">
                  實收資本額:
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.marketCap}
                </span>
              </div>
              {/* <div>
                <span className="font-semibold text-slate-400">董事長:</span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.chairman}
                </span>
              </div> */}
              <div>
                <span className="font-semibold text-slate-400">殖利率:</span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.dividendYield}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">本益比:</span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.peRatio}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">
                  股價淨值比:
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.pbRatio || "N/A"}
                </span>
              </div>
              {/* <div>
                <span className="font-semibold text-slate-400">子行業:</span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.industry}
                </span>
              </div> */}
              <div>
                <span className="font-semibold text-slate-400">
                  執行長/董事長:
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.ceo}
                </span>
              </div>
              {/* <div>
                <span className="font-semibold text-slate-400">員工人數:</span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.employees}
                </span>
              </div> */}
            </div>
          </TabContentComponent>
        </TabsContent>
        )}
        {!isEtf && (
          <TabsContent
            value="financials"
            className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
          >
          <TabContentComponent title="財務報告摘要" icon={FileText}>
            {financialTrend.length > 0 && (
              <div className="mb-6 rounded-md border border-slate-700 bg-slate-900/40 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-300" />
                    <h4 className="text-sm font-semibold text-slate-100">
                      財報趨勢
                    </h4>
                  </div>
                  <div className="flex w-full rounded-md border border-slate-600 bg-slate-900/50 p-1 sm:w-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        financialChartMode === "earnings" ? "default" : "ghost"
                      }
                      onClick={() => setFinancialChartMode("earnings")}
                      className={
                        financialChartMode === "earnings"
                          ? "h-8 flex-1 bg-blue-600 px-3 text-white hover:bg-blue-700 sm:flex-none"
                          : "h-8 flex-1 px-3 text-slate-300 hover:bg-slate-700 hover:text-slate-100 sm:flex-none"
                      }
                    >
                      損益
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        financialChartMode === "margins" ? "default" : "ghost"
                      }
                      onClick={() => setFinancialChartMode("margins")}
                      className={
                        financialChartMode === "margins"
                          ? "h-8 flex-1 bg-blue-600 px-3 text-white hover:bg-blue-700 sm:flex-none"
                          : "h-8 flex-1 px-3 text-slate-300 hover:bg-slate-700 hover:text-slate-100 sm:flex-none"
                      }
                    >
                      獲利率
                    </Button>
                  </div>
                </div>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={financialTrend}
                      margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="period"
                        stroke="#94A3B8"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="amount"
                        stroke="#94A3B8"
                        tickFormatter={formatLargeMetric}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="indicator"
                        orientation="right"
                        stroke="#f59e0b"
                        tickFormatter={
                          financialChartMode === "earnings"
                            ? formatMetric
                            : formatPercent
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.94)",
                          border: "1px solid #475569",
                          borderRadius: "0.375rem",
                        }}
                        labelStyle={{ color: "#CBD5E1", fontWeight: "bold" }}
                        formatter={(value, name) => [
                          ["EPS"].includes(name)
                            ? formatMetric(value)
                            : ["營益率", "淨利率"].includes(name)
                              ? formatPercent(value)
                              : formatLargeMetric(value),
                          name,
                        ]}
                      />
                      <Legend wrapperStyle={{ color: "#E2E8F0" }} />
                      <Bar
                        yAxisId="amount"
                        dataKey="revenue"
                        name="營收"
                        fill="#38bdf8"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                      {financialChartMode === "earnings" && (
                        <Bar
                          yAxisId="amount"
                          dataKey="net_income"
                          name="淨利"
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                        />
                      )}
                      {financialChartMode === "earnings" && (
                        <Line
                          yAxisId="indicator"
                          type="monotone"
                          dataKey="eps"
                          name="EPS"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          connectNulls
                        />
                      )}
                      {financialChartMode === "margins" && (
                        <Line
                          yAxisId="indicator"
                          type="monotone"
                          dataKey="operating_margin"
                          name="營益率"
                          stroke="#a78bfa"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          connectNulls
                        />
                      )}
                      {financialChartMode === "margins" && (
                        <Line
                          yAxisId="indicator"
                          type="monotone"
                          dataKey="net_margin"
                          name="淨利率"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          connectNulls
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {stockData.financialReports.map((report, index) => (
              <div
                key={index}
                className="mb-4 p-4 border border-slate-700 rounded-md bg-slate-700/30"
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-slate-100 text-lg">
                    {report.period} ({report.date})
                  </h4>
                  <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">
                    {report.periodType}
                  </span>
                </div>

                {/* 第一行：營收相關 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  <div className="bg-slate-800/50 p-3 rounded">
                    <p className="text-xs text-slate-400 mb-1">營業收入</p>
                    <p className="text-sm font-medium text-slate-200">
                      {report.revenue}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <p className="text-xs text-slate-400 mb-1">營業利益</p>
                    <p className="text-sm font-medium text-slate-200">
                      {report.income}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <p className="text-xs text-slate-400 mb-1">營業外收支</p>
                    <p className="text-sm font-medium text-slate-200">
                      {report.nonOperatingIncomeExpense}
                    </p>
                  </div>
                </div>

                {/* 第二行：獲利相關 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 p-3 rounded">
                    <p className="text-xs text-slate-400 mb-1">淨利</p>
                    <p className="text-sm font-medium text-slate-200">
                      {report.netIncome}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <p className="text-xs text-slate-400 mb-1">
                      每股盈餘 (EPS)
                    </p>
                    <p className="text-sm font-medium text-slate-200">
                      {report.eps}
                    </p>
                  </div>
                </div>

                {/* 計算一些比率（如果有足夠數據） */}
                {report.revenue && report.netIncome && (
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">淨利率:</span>
                      <span className="text-slate-300">
                        {(() => {
                          const revenue = parseFloat(
                            report.revenue.replace(/[^\d.-]/g, "")
                          );
                          const netIncome = parseFloat(
                            report.netIncome.replace(/[^\d.-]/g, "")
                          );
                          const margin = ((netIncome / revenue) * 100).toFixed(
                            2
                          );
                          return `${margin}%`;
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </TabContentComponent>
        </TabsContent>
        )}
        {isEtf && (
          <TabsContent
            value="etf-profile"
            className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
          >
            <TabContentComponent title="ETF 進階資料" icon={Layers}>
              {etfProfile ? (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["ETF分類", formatOptional(etfProfile.etfCategory)],
                      ["追蹤指數", formatOptional(etfProfile.trackingIndex)],
                      ["發行投信", formatOptional(etfProfile.issuer)],
                      [
                        "最新淨值",
                        etfProfile.latestNav?.nav
                          ? `${formatMetric(etfProfile.latestNav.nav)}`
                          : "待補充",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-md border border-slate-700 bg-slate-900/60 p-4"
                      >
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="mt-2 break-words text-lg font-semibold text-slate-100">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="rounded-md border border-slate-700 bg-slate-900/60 p-4">
                      <h4 className="mb-3 text-sm font-semibold text-slate-100">
                        基金資訊
                      </h4>
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        {[
                          ["基金全名", formatOptional(etfProfile.fundName)],
                          ["英文名稱", formatOptional(etfProfile.fundEnglishName)],
                          ["成立日", formatOptional(etfProfile.inceptionDate)],
                          ["上市日", formatOptional(etfProfile.listingDate)],
                          ["基金經理人", formatOptional(etfProfile.fundManager)],
                          ["保管機構", formatOptional(etfProfile.custodian)],
                          [
                            "含國外成分股",
                            formatBooleanLabel(etfProfile.hasForeignComponents),
                          ],
                          [
                            "自訂/需揭露指數",
                            formatOptional(etfProfile.isCustomIndex),
                          ],
                          [
                            "發行單位數",
                            etfProfile.unitsOutstanding
                              ? formatLargeMetric(etfProfile.unitsOutstanding)
                              : "待補充",
                          ],
                          ["資料基準日", formatOptional(etfProfile.sourceAsOfDate)],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="mt-1 break-words font-medium text-slate-200">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                      {etfProfile.detailUrl && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="mt-4 border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                        >
                          <a
                            href={etfProfile.detailUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            ETF官方詳情
                          </a>
                        </Button>
                      )}
                    </div>

                    <div className="rounded-md border border-slate-700 bg-slate-900/60 p-4">
                      <h4 className="mb-3 text-sm font-semibold text-slate-100">
                        淨值與折溢價
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          [
                            "日期",
                            formatOptional(etfProfile.latestNav?.date),
                          ],
                          [
                            "淨值",
                            etfProfile.latestNav?.nav
                              ? formatMetric(etfProfile.latestNav.nav)
                              : "待補充",
                          ],
                          [
                            "折溢價",
                            etfProfile.latestNav?.premiumDiscount === null ||
                            etfProfile.latestNav?.premiumDiscount === undefined
                              ? "待補充"
                              : formatSignedPercent(
                                  etfProfile.latestNav.premiumDiscount
                                ),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-md border border-slate-700 bg-slate-800/70 p-3"
                          >
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="mt-1 break-words text-base font-semibold text-slate-100">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 h-[220px]">
                        {etfNavHistory.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={etfNavHistory}
                              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#475569"
                              />
                              <XAxis
                                dataKey="date"
                                stroke="#94A3B8"
                                tick={{ fontSize: 11 }}
                              />
                              <YAxis
                                yAxisId="nav"
                                stroke="#38bdf8"
                                tick={{ fontSize: 11 }}
                                domain={["auto", "auto"]}
                              />
                              <YAxis
                                yAxisId="premium"
                                orientation="right"
                                stroke="#f59e0b"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "rgba(15, 23, 42, 0.94)",
                                  border: "1px solid #475569",
                                  borderRadius: "0.375rem",
                                }}
                                formatter={(value, name) => [
                                  name === "折溢價"
                                    ? formatSignedPercent(value)
                                    : formatMetric(value),
                                  name,
                                ]}
                              />
                              <Legend wrapperStyle={{ color: "#E2E8F0" }} />
                              <Line
                                yAxisId="nav"
                                type="monotone"
                                dataKey="nav"
                                name="淨值"
                                stroke="#38bdf8"
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                              />
                              <Line
                                yAxisId="premium"
                                type="monotone"
                                dataKey="premiumDiscount"
                                name="折溢價"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">
                            尚無淨值歷史資料。
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-700 bg-slate-900/60 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-100">
                      費用率與成分股
                    </h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        [
                          "總費用率",
                          etfProfile.expenseRatio === null ||
                          etfProfile.expenseRatio === undefined
                            ? "待接入"
                            : `${formatMetric(etfProfile.expenseRatio)}%`,
                        ],
                        [
                          "管理費",
                          etfProfile.managementFeeRate === null ||
                          etfProfile.managementFeeRate === undefined
                            ? "待接入"
                            : `${formatMetric(etfProfile.managementFeeRate)}%`,
                        ],
                        [
                          "保管費",
                          etfProfile.custodianFeeRate === null ||
                          etfProfile.custodianFeeRate === undefined
                            ? "待接入"
                            : `${formatMetric(etfProfile.custodianFeeRate)}%`,
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-md border border-slate-700 bg-slate-800/70 p-3"
                        >
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-1 text-base font-semibold text-slate-100">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      費用資料來源：{formatOptional(etfProfile.feeSource)}
                    </p>

                    <div className="mt-5">
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h5 className="text-sm font-semibold text-slate-100">
                            前大成分股
                          </h5>
                          <p className="text-xs text-slate-500">
                            共 {formatMetric(etfHoldings.totalCount || 0)} 檔
                            {etfHoldings.snapshotDate
                              ? `・快照 ${etfHoldings.snapshotDate}`
                              : ""}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">
                          顯示權重排序前 {etfHoldings.items?.length || 0} 檔
                        </p>
                      </div>
                      {etfHoldings.items?.length > 0 ? (
                        <div className="overflow-x-auto rounded-md border border-slate-700">
                          <table className="min-w-full divide-y divide-slate-700 text-sm">
                            <thead className="bg-slate-800/80 text-xs text-slate-400">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">
                                  代號
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  名稱
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                  權重
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                  股數
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 bg-slate-900/40">
                              {etfHoldings.items.map((holding) => (
                                <tr key={holding.symbol}>
                                  <td className="px-3 py-2 font-semibold text-blue-300">
                                    {holding.symbol}
                                  </td>
                                  <td className="px-3 py-2 text-slate-200">
                                    {holding.name}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-100">
                                    {holding.weight === null ||
                                    holding.weight === undefined
                                      ? "N/A"
                                      : `${formatMetric(holding.weight)}%`}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-300">
                                    {holding.shares === null ||
                                    holding.shares === undefined
                                      ? "N/A"
                                      : formatLargeMetric(holding.shares)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="rounded-md border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-400">
                          尚未同步成分股快照。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  尚未同步 ETF 進階資料，請先執行 ETF 資料同步。
                </p>
              )}
            </TabContentComponent>
          </TabsContent>
        )}
        {isEtf && (
          <TabsContent
            value="etf-performance"
            className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
          >
            <TabContentComponent title="ETF 績效摘要" icon={TrendingUp}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["1M", returnSummary["1M"]],
                  ["3M", returnSummary["3M"]],
                  ["6M", returnSummary["6M"]],
                  ["YTD", returnSummary.YTD],
                  ["1Y", returnSummary["1Y"]],
                  ["最大回撤", performanceSummary.max_drawdown],
                  ["距 52 週高點", technicalSummary.distance_to_52w_high],
                  ["距 52 週低點", technicalSummary.distance_to_52w_low],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-700 bg-slate-900/60 p-4"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p
                      className={`mt-2 text-xl font-semibold ${percentColorClass(
                        value
                      )}`}
                    >
                      {formatSignedPercent(value)}
                    </p>
                  </div>
                ))}
              </div>
            </TabContentComponent>
          </TabsContent>
        )}
        {isEtf && (
          <TabsContent
            value="etf-technical"
            className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
          >
            <TabContentComponent title="ETF 技術指標" icon={BacktestIcon}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["RSI 14", formatMetric(technicalSummary.rsi14)],
                  ["MACD 柱", formatMetric(technicalSummary.macd_histogram)],
                  ["MA 趨勢", technicalSummary.ma_trend || "資料不足"],
                  ["成交量 MA20", formatLargeMetric(technicalSummary.volume_ma20)],
                  ["MA20 乖離", formatSignedPercent(technicalSummary.bias_ma20)],
                  ["MA60 乖離", formatSignedPercent(technicalSummary.bias_ma60)],
                  ["52 週高點", formatMetric(technicalSummary.week52_high)],
                  ["52 週低點", formatMetric(technicalSummary.week52_low)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-700 bg-slate-900/60 p-4"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-100">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </TabContentComponent>
          </TabsContent>
        )}
        <TabsContent
          value="dividends"
          className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
        >
          <TabContentComponent title={isEtf ? "配息紀錄" : "股息記錄"} icon={Landmark}>
            {" "}
            {/* 可以換個更適合股息的圖示 */}
            {stockData.dividends.length > 0 ? (
              stockData.dividends.map((div, index) => (
                <p key={index} className="text-sm text-slate-300 mb-1">
                  支付日期: {div.date} - 每股股息: {div.amount}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-400">尚無配息資料。</p>
            )}
          </TabContentComponent>
        </TabsContent>
        {isEtf && (
          <TabsContent
            value="data-quality"
            className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
          >
            <TabContentComponent title="資料品質" icon={AlertTriangle}>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["價格筆數", formatMetric(priceQuality.row_count)],
                  ["第一筆", priceQuality.first_date || "N/A"],
                  ["最新日", priceQuality.latest_date || "N/A"],
                  ["全市場基準日", priceQuality.reference_latest_date || "N/A"],
                  [
                    "落後天數",
                    priceQuality.latest_lag_days === null ||
                    priceQuality.latest_lag_days === undefined
                      ? "N/A"
                      : `${priceQuality.latest_lag_days} 天`,
                  ],
                  ["資料密度", formatMetric(priceQuality.density)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-700 bg-slate-900/60 p-4"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-100">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              {priceQuality.issues?.length > 0 && (
                <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {priceQuality.issues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              )}
            </TabContentComponent>
          </TabsContent>
        )}
        {/* 暫時註解掉，尚未實作 */}
        {/*
        <TabsContent
          value="splits"
          className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
        >
          <TabContentComponent title="股票分割記錄" icon={DivideSquare}>
            {stockData.splits.map((split, index) => (
              <p key={index} className="text-sm text-slate-300 mb-1">
                分割日期: {split.date} - 比例: {split.ratio}
              </p>
            ))}
          </TabContentComponent>
        </TabsContent>
        <TabsContent
          value="news"
          className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
        >
          <TabContentComponent title="相關新聞" icon={Newspaper}>
            {stockData.news.map((item, index) => (
              <div key={index} className="mb-3">
                <h4 className="font-semibold text-slate-100 hover:text-blue-400 cursor-pointer">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400">
                  {item.date} - {item.source}
                </p>
              </div>
            ))}
          </TabContentComponent>
        </TabsContent>
        */}
      </Tabs>
      {/* 渲染 TradeDialog */}
      {stockData && ( // 確保 stockData 存在才渲染 Dialog
        <TradeDialog
          isOpen={isTradeDialogOpen}
          onClose={() => setIsTradeDialogOpen(false)}
          initialSelectedStock={{
            // <<<<< 主要修改在這裡
            stock_id: stockData.symbol, // 假設用 symbol 作為 stock_id (或者 API 返回的真實 stock_id)
            symbol: stockData.symbol,
            name: stockData.companyName,
            current_price: stockData.currentPrice,
            is_up: stockData.isUp,
            change_amount: stockData.priceChange,
            change_percent: stockData.percentChange,
            // 其他 TradeDialog 可能需要的股票資訊
          }}
          // portfolioId={/* 你需要一個方法來決定預設選哪個 portfolioId, 或讓用戶在彈窗選擇 */}
          // 例如，可以讓用戶在個人設定中設置一個預設的交易組合
          // 或者總是讓 TradeDialog 內部去獲取並讓用戶選擇
          initialAction={tradeDialogAction}
          onTradeSubmitSuccess={handleTradeSuccess} // <<<< 確保有這個回呼
        />
      )}
    </div>
  );
}

// 包裹一層 Suspense 以處理 useParams 的 client component 需求
export default function StockDetailPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64 text-slate-400">
          正在準備股票資訊...
        </div>
      }
    >
      <StockDetailPageContent />
    </Suspense>
  );
}
