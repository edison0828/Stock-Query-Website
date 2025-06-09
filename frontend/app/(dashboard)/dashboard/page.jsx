// app/(dashboard)/dashboard/page.jsx
"use client"; // 因為迷你圖表等可能需要客戶端 JS

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp as TrendIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"; // 用於迷你圖表
import { Button } from "@/components/ui/button";

// --- NextAuth.js Imports ---
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation"; // For App Router

// 迷你圖表組件
const MiniTrendChart = ({ data, isUp }) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data}>
      <Line
        type="monotone"
        dataKey="uv"
        stroke={isUp ? "#10B981" : "#F43F5E"}
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
  </ResponsiveContainer>
);

export default function DashboardPage() {
  // 新增狀態管理
  const [watchlistSummary, setWatchlistSummary] = useState([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  // 新增投資組合狀態
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  // 新增交易記錄狀態
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  // 新增市場概覽狀態
  const [marketOverview, setMarketOverview] = useState([]);
  const [isLoadingMarketOverview, setIsLoadingMarketOverview] = useState(true);
  const { toast } = useToast();

  // Session handling
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/login?callbackUrl=/dashboard");
    },
  });

  // 獲取關注列表摘要的函數
  const fetchWatchlistSummary = useCallback(async () => {
    if (!session?.user) return;

    setIsLoadingWatchlist(true);
    try {
      const response = await fetch("/api/watchlist");
      if (!response.ok) {
        throw new Error("無法獲取關注列表");
      }

      const data = await response.json();

      // 只取前5筆作為摘要顯示，並生成趨勢圖數據
      const formattedData = data.slice(0, 5).map((item) => ({
        ticker: item.symbol,
        name: item.name,
        price: formatPrice(item.current_price, item.currency),
        change: formatChange(
          item.change_amount,
          item.change_percent,
          item.is_up
        ),
        isUp: item.is_up,
        // 使用真實趨勢數據，如果沒有則回退到模擬數據
        trendData:
          item.trend_data && item.trend_data.length >= 2
            ? item.trend_data
            : generateTrendData(item.is_up),
      }));

      setWatchlistSummary(formattedData);
    } catch (error) {
      console.error("Error fetching watchlist summary:", error);
      toast({
        variant: "destructive",
        title: "載入錯誤",
        description: "無法載入關注列表摘要",
      });
      setWatchlistSummary([]);
    } finally {
      setIsLoadingWatchlist(false);
    }
  }, [session, toast]);

  // 格式化價格顯示
  const formatPrice = (price, currency) => {
    if (price === null || price === undefined || price === 0) return "N/A";
    const symbol = currency === "USD" ? "$" : currency === "TWD" ? "NT$" : "";
    return `${symbol}${price.toFixed(2)}`;
  };

  // 格式化漲跌幅顯示
  const formatChange = (changeAmount, changePercent, isUp) => {
    if (changeAmount === null || changePercent === null || changeAmount === 0)
      return "N/A";
    const sign = isUp ? "+" : "";
    return `${sign}${changeAmount.toFixed(2)} (${sign}${changePercent.toFixed(
      2
    )}%)`;
  };

  // 根據漲跌生成趨勢數據
  const generateTrendData = (isUp) => {
    const baseValue = 15;
    const variation = 5;
    const trend = isUp ? 1 : -1;

    return Array.from({ length: 6 }, (_, index) => ({
      uv:
        baseValue +
        index * trend * 2 +
        (Math.random() * variation - variation / 2),
    }));
  };

  // 獲取投資組合摘要的函數
  const fetchPortfolioSummary = useCallback(async () => {
    if (!session?.user) return;

    setIsLoadingPortfolio(true);
    try {
      const response = await fetch("/api/portfolios?summary=true");
      if (!response.ok) {
        throw new Error("無法獲取投資組合摘要");
      }

      const data = await response.json();
      setPortfolioSummary(data.summary);
    } catch (error) {
      console.error("Error fetching portfolio summary:", error);
      toast({
        variant: "destructive",
        title: "載入錯誤",
        description: "無法載入投資組合摘要",
      });
      setPortfolioSummary(null);
    } finally {
      setIsLoadingPortfolio(false);
    }
  }, [session, toast]);

  // 獲取最近交易記錄的函數
  const fetchRecentTransactions = useCallback(async () => {
    if (!session?.user) return;

    setIsLoadingTransactions(true);
    try {
      const response = await fetch("/api/portfolios?recent_transactions=5");
      if (!response.ok) {
        throw new Error("無法獲取最近交易記錄");
      }

      const data = await response.json();
      setRecentTransactions(data);
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      toast({
        variant: "destructive",
        title: "載入錯誤",
        description: "無法載入最近交易記錄",
      });
      setRecentTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [session, toast]);

  // 獲取市場概覽數據的函數
  const fetchMarketOverview = useCallback(async () => {
    setIsLoadingMarketOverview(true);
    try {
      const response = await fetch("/api/market-overview");
      if (!response.ok) {
        throw new Error("無法獲取市場概覽");
      }

      const data = await response.json();
      setMarketOverview(data);
    } catch (error) {
      console.error("Error fetching market overview:", error);
      toast({
        variant: "destructive",
        title: "載入錯誤",
        description: "無法載入市場概覽",
      });
      setMarketOverview([]);
    } finally {
      setIsLoadingMarketOverview(false);
    }
  }, [toast]);

  // 當 session 可用時獲取數據
  useEffect(() => {
    if (session?.user) {
      fetchWatchlistSummary();
      fetchPortfolioSummary();
      fetchRecentTransactions(); // 添加這行
    }
    // 市場概覽不需要登入就可以查看
    fetchMarketOverview();
  }, [
    session,
    fetchWatchlistSummary,
    fetchPortfolioSummary,
    fetchRecentTransactions,
    fetchMarketOverview,
  ]);

  // 1. 處理載入狀態
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.24))]">
        {" "}
        {/* 簡易置中 */}
        <p className="text-slate-400">儀表板載入中...</p>
        {/* 或者使用骨架屏 (Skeleton UI) 組件 */}
      </div>
    );
  }

  // 2. 處理未認證狀態 (理論上 required: true 和 onUnauthenticated 已經處理，但作為雙重保險)
  //    或者如果 onUnauthenticated 由於某些原因沒有成功重定向
  if (status === "unauthenticated" || !session || !session.user) {
    // redirect('/login?callbackUrl=/dashboard'); // onUnauthenticated 應該已經處理了
    // 可以返回 null 或者一個提示信息，因為重定向應該已經發生或即將發生
    return (
      <p className="text-slate-400">需要登入才能查看儀表板。正在重新導向...</p>
    );
  }

  // --- 到這裡，可以安全地假設 session 和 session.user 存在 ---
  // 你可以在這裡使用 session.user 的信息，例如：
  // const userName = session.user.name;
  // const userRole = session.user.role;
  // 格式化價格顯示的輔助函數
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatChangeAmount = (amount, isUp) => {
    if (amount === null || amount === undefined) return "N/A";
    const sign = isUp ? "+" : "";
    return `${sign}${formatCurrency(amount)}`;
  };
  // 格式化數字顯示
  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  };

  const formatTradingAmount = (amount) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    return amount.toLocaleString();
  };

  return (
    <div className="grid gap-6 md:gap-8">
      {/* 可以考慮在這裡顯示用戶名等 */}
      {/* <h2 className="text-2xl font-semibold text-slate-100 mb-2">歡迎回來, {session.user.name}!</h2> */}
      {/* Row 1: Watchlist and Portfolio Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Watchlist Overview (Col Span 2) */}
        <Card className="md:col-span-2 bg-slate-800 border-slate-700 text-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-semibold text-slate-100">
              個人關注列表摘要
            </CardTitle>
            <Button
              asChild
              variant="link"
              className="text-sm text-blue-400 hover:text-blue-300 px-0"
            >
              <Link href="/watchlist">View All Watchlist</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingWatchlist ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-slate-400">載入關注列表中...</div>
              </div>
            ) : watchlistSummary.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">您的關注列表是空的</p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-slate-600"
                >
                  <Link href="/stocks">去搜尋股票</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/30">
                    <TableHead className="text-slate-400">
                      TICKER/NAME
                    </TableHead>
                    <TableHead className="text-slate-400">PRICE</TableHead>
                    <TableHead className="text-slate-400">CHANGE</TableHead>
                    <TableHead className="text-slate-400 w-[100px]">
                      5-DAY TREND
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlistSummary.map((stock) => (
                    <TableRow
                      key={stock.ticker}
                      className="border-slate-700 hover:bg-slate-700/30"
                    >
                      <TableCell>
                        <Link
                          href={`/stocks/${stock.ticker}`}
                          className="hover:underline"
                        >
                          <div className="font-medium text-slate-100">
                            {stock.ticker}
                          </div>
                          <div className="text-xs text-slate-400">
                            {stock.name}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {stock.price}
                      </TableCell>
                      <TableCell
                        className={
                          stock.isUp ? "text-green-400" : "text-red-400"
                        }
                      >
                        {stock.change}
                      </TableCell>
                      <TableCell>
                        <MiniTrendChart
                          data={stock.trendData}
                          isUp={stock.isUp}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* Portfolio Summary */}
        <Card className="bg-slate-800 border-slate-700 text-slate-200 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-semibold text-slate-100">
              投資組合總覽
            </CardTitle>
            <Button
              asChild
              variant="link"
              className="text-sm text-blue-400 hover:text-blue-300 px-0"
            >
              <Link href="/portfolios">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-grow">
            {isLoadingPortfolio ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-slate-400">載入投資組合中...</div>
              </div>
            ) : portfolioSummary ? (
              <>
                <div className="text-xs text-slate-400">
                  Total Portfolio Value
                </div>
                <div className="text-3xl font-bold text-slate-50">
                  {formatCurrency(portfolioSummary.total_portfolio_value)}
                </div>
                <div className="mt-3 text-xs text-slate-400">Today's P&L</div>
                <div
                  className={`flex items-center text-lg font-semibold ${
                    portfolioSummary.is_total_pnl_up
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {portfolioSummary.is_total_pnl_up ? (
                    <ArrowUpRight className="h-5 w-5 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 mr-1" />
                  )}
                  {formatChangeAmount(
                    portfolioSummary.total_today_pnl,
                    portfolioSummary.is_total_pnl_up
                  )}
                  ({portfolioSummary.is_total_pnl_up ? "+" : ""}
                  {portfolioSummary.total_today_pnl_percent.toFixed(2)}%)
                </div>
                <div className="mt-4 text-xs text-slate-400">
                  Number of Portfolios Managed
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {portfolioSummary.portfolio_count}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">尚未建立投資組合</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/portfolios">建立投資組合</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Market Overview and Recent Transactions */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Market Overview */}
        <Card className="bg-slate-800 border-slate-700 text-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-100">
              熱門交易股票 Top 5
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              依交易量×股價排序
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingMarketOverview ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-slate-400">載入市場數據中...</div>
              </div>
            ) : marketOverview.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">暫無市場數據</p>
              </div>
            ) : (
              marketOverview.map((stock, index) => (
                <div
                  key={stock.stock_id}
                  className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <Link
                        href={`/stocks/${stock.stock_id}`}
                        className="font-medium text-slate-100 hover:text-blue-400 hover:underline"
                      >
                        {stock.stock_id}
                      </Link>
                      <div className="text-xs text-slate-400 truncate max-w-[120px]">
                        {stock.company_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-100">
                      {stock.currency === "USD" ? "$" : "NT$"}
                      {stock.current_price.toFixed(2)}
                    </div>
                    <div
                      className={`text-xs ${
                        stock.is_up ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {stock.is_up ? "+" : ""}
                      {stock.percent_change.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400">
                      量: {formatVolume(stock.volume)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions (Col Span 2) */}
        <Card className="md:col-span-2 bg-slate-800 border-slate-700 text-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-100">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-slate-400">載入交易記錄中...</div>
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">尚無交易記錄</p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-slate-600"
                >
                  <Link href="/portfolios">開始第一筆交易</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow
                      key={tx.transaction_id}
                      className="border-slate-700 hover:bg-slate-700/30"
                    >
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === "BUY" ? "default" : "destructive"
                          }
                          className={
                            tx.type === "BUY"
                              ? "bg-green-600/80 hover:bg-green-600 text-green-50"
                              : "bg-red-600/80 hover:bg-red-600 text-red-50"
                          }
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-100">
                        <Link
                          href={`/stocks/${tx.ticker}`}
                          className="hover:underline"
                        >
                          {tx.ticker}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {tx.shares} shares
                      </TableCell>
                      <TableCell className="text-right text-slate-400">
                        {tx.date}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full hover:bg-slate-700 text-blue-400 hover:text-blue-300"
            >
              <Link href="/portfolios">View All Transactions</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
