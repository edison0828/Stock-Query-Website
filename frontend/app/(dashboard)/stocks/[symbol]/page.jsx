// app/(dashboard)/stocks/[symbol]/page.jsx
"use client";

import TradeDialog from "@/components/shared/TradeDialog"; // 模擬買入賣出對話框的組件
import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation"; // 用於獲取路由參數和查詢參數
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
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Newspaper,
  FileText,
  DivideSquare,
  Landmark,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"; // 用於主要圖表
import { useToast } from "@/hooks/use-toast"; // 引入 useToast

// 模擬的股票詳細數據 (之後會從 API 獲取)
const mockStockDetail = {
  symbol: "AAPL",
  companyName: "Apple Inc.",
  exchange: "NASDAQ",
  currentPrice: 170.34,
  priceChange: 2.1,
  percentChange: 1.25,
  isUp: true,
  lastUpdated: "Oct 26, 2023, 4:00 PM EDT",
  marketStatus: "Market closed.",
  isWatched: false, // 假設初始未關注
  historicalData: {
    // 不同時間區間的數據
    "1D": [
      { date: "9:30", price: 169.5 },
      { date: "10:00", price: 170.0 },
      { date: "12:00", price: 170.5 },
      { date: "14:00", price: 170.2 },
      { date: "16:00", price: 170.34 },
    ],
    "5D": [
      { date: "Mon", price: 168.0 },
      { date: "Tue", price: 169.5 },
      { date: "Wed", price: 171.0 },
      { date: "Thu", price: 170.34 },
      { date: "Fri", price: 170.8 },
    ],
    "1M": Array.from({ length: 30 }, (_, i) => ({
      date: `Day ${i + 1}`,
      price: 165 + Math.random() * 10,
    })),
    "6M": Array.from({ length: 180 }, (_, i) => ({
      date: `Day ${i + 1}`,
      price: 150 + Math.random() * 25,
    })),
    YTD: Array.from({ length: 200 }, (_, i) => ({
      date: `Day ${i + 1}`,
      price: 140 + Math.random() * 35,
    })),
    "1Y": Array.from({ length: 250 }, (_, i) => ({
      date: `Day ${i + 1}`,
      price: 130 + Math.random() * 45,
    })),
    "5Y": Array.from({ length: 300 }, (_, i) => ({
      date: `Day ${i + 1}`,
      price: 100 + Math.random() * 80,
    })),
    MAX: Array.from({ length: 500 }, (_, i) => ({
      date: `Day ${i + 1}`,
      price: 50 + Math.random() * 150,
    })),
  },
  basicInfo: {
    description:
      "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. It also sells various related services.",
    sector: "Technology",
    industry: "Consumer Electronics",
    marketCap: "2.65T",
    peRatio: "28.50",
    dividendYield: "0.55%",
    employees: "164,000",
    ceo: "Timothy D. Cook",
    website: "https://www.apple.com",
  },
  financialReports: [
    {
      period: "Q3 2023",
      date: "Jul 2023",
      revenue: "$81.8B",
      netIncome: "$19.88B",
      eps: "$1.26",
    },
    {
      period: "Q2 2023",
      date: "Apr 2023",
      revenue: "$94.8B",
      netIncome: "$24.16B",
      eps: "$1.52",
    },
  ],
  dividends: [
    { date: "Aug 17, 2023", amount: "$0.24" },
    { date: "May 18, 2023", amount: "$0.24" },
  ],
  splits: [
    { date: "Aug 31, 2020", ratio: "4-for-1" },
    { date: "Jun 09, 2014", ratio: "7-for-1" },
  ],
  news: [
    {
      title: "Apple Unveils New iPhone Lineup",
      date: "Sep 12, 2023",
      source: "Apple Newsroom",
    },
    {
      title: "Analysts Bullish on Apple Stock Ahead of Earnings",
      date: "Oct 20, 2023",
      source: "MarketWatch",
    },
  ],
};

// 時間區間按鈕
const timeRanges = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];

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

  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("1M"); // 預設時間區間
  const [isWatched, setIsWatched] = useState(mockStockDetail.isWatched); // 模擬關注狀態
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false); // 模擬交易對話框狀態
  const [tradeDialogAction, setTradeDialogAction] = useState("BUY"); // 模擬交易動作

  useEffect(() => {
    if (!stockSymbol) return;

    const fetchStockData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: 替換為真實的 API 呼叫
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/stocks/${stockSymbol}`);
        // if (!response.ok) throw new Error(`Failed to fetch data for ${stockSymbol}`);
        // const data = await response.json();
        // setStockData(data);
        // setIsWatched(data.isWatchedByUser); // API 應該返回用戶是否已關注

        // 使用模擬數據
        if (stockSymbol === mockStockDetail.symbol) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // 模擬網路延遲
          setStockData(mockStockDetail);
          setIsWatched(mockStockDetail.isWatched);
        } else {
          throw new Error(`No data found for symbol ${stockSymbol}`);
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

  const handleToggleWatchlist = async () => {
    // TODO: 呼叫 API 更新關注列表狀態
    const newWatchStatus = !isWatched;
    setIsWatched(newWatchStatus); // 立即更新 UI
    toast({
      title: newWatchStatus ? "已加入關注列表" : "已從關注列表移除",
      description: `${stockSymbol} ${
        newWatchStatus ? "成功加入您的關注列表。" : "已從您的關注列表移除。"
      }`,
    });
    // try {
    //   const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/watchlist/${stockSymbol}`, {
    //     method: newWatchStatus ? 'POST' : 'DELETE',
    //     // headers: { 'Authorization': `Bearer ${token}` },
    //   });
    //   if (!response.ok) {
    //     // 如果 API 失敗，則回滾 UI 狀態並顯示錯誤
    //     setIsWatched(!newWatchStatus);
    //     toast({ variant: "destructive", title: "操作失敗", description: "無法更新關注列表，請稍後再試。" });
    //   }
    // } catch (err) {
    //   setIsWatched(!newWatchStatus);
    //   toast({ variant: "destructive", title: "操作失敗", description: "網路錯誤，請稍後再試。" });
    // }
  };

  const handleOpenTradeDialog = (action) => {
    setTradeDialogAction(action);
    setIsTradeDialogOpen(true);
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
      {/* 歷史價格圖表 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl font-semibold text-slate-100 mb-2 sm:mb-0">
              歷史價格圖表
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              {timeRanges.map((range) => (
                <Button
                  key={range}
                  variant={selectedTimeRange === range ? "default" : "outline"}
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
        </CardHeader>
        <CardContent className="h-[300px] md:h-[400px] p-2 md:p-4">
          {" "}
          {/* 給圖表一個固定高度 */}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={currentChartData}
              margin={{ top: 5, right: 20, left: -25, bottom: 5 }}
            >
              {" "}
              {/* 調整 margin */}
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />{" "}
              {/* 格線顏色 */}
              <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 12 }} />
              <YAxis
                stroke="#94A3B8"
                tickFormatter={(value) => `$${value.toFixed(0)}`}
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
                dataKey="price"
                name="Stock Price"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {/* 資訊頁籤 */}
      <Tabs defaultValue="basic-info" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 bg-slate-700/50 p-1 h-auto">
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
          <TabsTrigger
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
          </TabsTrigger>
        </TabsList>
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
                <span className="font-semibold text-slate-400">
                  行業 (Sector):
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.sector}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">
                  子行業 (Industry):
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.industry}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">
                  市值 (Market Cap):
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.marketCap}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">
                  本益比 (P/E Ratio):
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.peRatio}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">
                  股息率 (Yield):
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.dividendYield}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">員工人數:</span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.employees}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">
                  執行長 (CEO):
                </span>{" "}
                <span className="text-slate-200">
                  {stockData.basicInfo.ceo}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">公司網站:</span>{" "}
                <a
                  href={stockData.basicInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {stockData.basicInfo.website}
                </a>
              </div>
            </div>
          </TabContentComponent>
        </TabsContent>
        <TabsContent
          value="financials"
          className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
        >
          <TabContentComponent title="財務報告摘要" icon={FileText}>
            {stockData.financialReports.map((report, index) => (
              <div
                key={index}
                className="mb-3 p-3 border border-slate-700 rounded-md bg-slate-700/30"
              >
                <p className="font-semibold text-slate-100">
                  {report.period} ({report.date})
                </p>
                <p className="text-sm text-slate-300">
                  營收: {report.revenue} | 淨利: {report.netIncome} | EPS:{" "}
                  {report.eps}
                </p>
              </div>
            ))}
          </TabContentComponent>
        </TabsContent>
        <TabsContent
          value="dividends"
          className="bg-slate-800 border border-slate-700 rounded-b-md p-4 md:p-6"
        >
          <TabContentComponent title="股息記錄" icon={Landmark}>
            {" "}
            {/* 可以換個更適合股息的圖示 */}
            {stockData.dividends.map((div, index) => (
              <p key={index} className="text-sm text-slate-300 mb-1">
                支付日期: {div.date} - 每股股息: {div.amount}
              </p>
            ))}
          </TabContentComponent>
        </TabsContent>
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
                </h4>{" "}
                {/* 假設新聞標題可以點擊 */}
                <p className="text-xs text-slate-400">
                  {item.date} - {item.source}
                </p>
              </div>
            ))}
          </TabContentComponent>
        </TabsContent>
      </Tabs>
      {stockData && ( // 確保 stockData 存在才渲染 Dialog
        <TradeDialog
          isOpen={isTradeDialogOpen}
          onClose={() => setIsTradeDialogOpen(false)}
          stockSymbol={stockData.symbol}
          stockName={stockData.companyName}
          currentPrice={stockData.currentPrice}
          priceChange={stockData.priceChange}
          percentChange={stockData.percentChange}
          isUp={stockData.isUp}
          initialAction={tradeDialogAction}
          // portfolioId={selectedPortfolioId} // 如果需要指定投資組合
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
