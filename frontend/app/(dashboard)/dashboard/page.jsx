// app/(dashboard)/dashboard/page.jsx
"use client"; // 因為迷你圖表等可能需要客戶端 JS

import Link from "next/link";
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

// 模擬數據 (之後會從 API 獲取)
const mockWatchlist = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    price: "$170.34",
    change: "+$2.10 (+1.25%)",
    isUp: true,
    trendData: [
      { uv: 10 },
      { uv: 15 },
      { uv: 13 },
      { uv: 17 },
      { uv: 20 },
      { uv: 22 },
    ],
  },
  {
    ticker: "2330",
    name: "台積電",
    price: "NT$600.00",
    change: "-$5.00 (-0.83%)",
    isUp: false,
    trendData: [
      { uv: 30 },
      { uv: 25 },
      { uv: 28 },
      { uv: 22 },
      { uv: 20 },
      { uv: 18 },
    ],
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    price: "$290.75",
    change: "+$3.50 (+1.22%)",
    isUp: true,
    trendData: [
      { uv: 5 },
      { uv: 7 },
      { uv: 6 },
      { uv: 9 },
      { uv: 12 },
      { uv: 15 },
    ],
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: "$220.15",
    change: "-$1.10 (-0.49%)",
    isUp: false,
    trendData: [
      { uv: 40 },
      { uv: 35 },
      { uv: 33 },
      { uv: 30 },
      { uv: 28 },
      { uv: 25 },
    ],
  },
  {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    price: "$115.60",
    change: "+$0.80 (+0.70%)",
    isUp: true,
    trendData: [
      { uv: 12 },
      { uv: 10 },
      { uv: 14 },
      { uv: 16 },
      { uv: 15 },
      { uv: 18 },
    ],
  },
];

const mockMarketOverview = [
  { name: "TAIEX", value: "16,500.75", change: "+120.50 (+0.73%)", isUp: true },
  {
    name: "S&P 500",
    value: "4,450.30",
    change: "-22.11 (-0.49%)",
    isUp: false,
  },
  { name: "NASDAQ", value: "13,780.92", change: "+55.60 (+0.40%)", isUp: true },
];

const mockRecentTransactions = [
  { type: "BUY", ticker: "AAPL", shares: 10, date: "Oct 25, 2023" },
  { type: "SELL", ticker: "2330", shares: 500, date: "Oct 24, 2023" },
  { type: "BUY", ticker: "GOOGL", shares: 5, date: "Oct 23, 2023" },
];

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
  // --- Session Handling ---
  const { data: session, status } = useSession({
    required: true, // 如果未認證，會自動觸發 onUnauthenticated 或跳轉到 signIn page
    onUnauthenticated() {
      // 當 required: true 且檢測到用戶未認證時執行的回呼
      redirect("/login?callbackUrl=/dashboard"); // 明確指定 callbackUrl
    },
  });

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
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/30">
                  <TableHead className="text-slate-400">TICKER/NAME</TableHead>
                  <TableHead className="text-slate-400">PRICE</TableHead>
                  <TableHead className="text-slate-400">CHANGE</TableHead>
                  <TableHead className="text-slate-400 w-[100px]">
                    1-DAY TREND
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockWatchlist.map((stock) => (
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
                      className={stock.isUp ? "text-green-400" : "text-red-400"}
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
            <div className="text-xs text-slate-400">Total Portfolio Value</div>
            <div className="text-3xl font-bold text-slate-50">$125,876.50</div>
            <div className="mt-3 text-xs text-slate-400">Today's P&L</div>
            <div className="flex items-center text-lg font-semibold text-green-400">
              <ArrowUpRight className="h-5 w-5 mr-1" />
              +$1,234.56 (+0.99%)
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Number of Portfolios Managed
            </div>
            <div className="text-2xl font-bold text-slate-100">3</div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Market Overview and Recent Transactions */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Market Overview */}
        <Card className="bg-slate-800 border-slate-700 text-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-100">
              Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockMarketOverview.map((market) => (
              <div
                key={market.name}
                className="flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-slate-100">
                    {market.name}
                  </div>
                  <div className="text-sm text-slate-300">{market.value}</div>
                </div>
                <div
                  className={market.isUp ? "text-green-400" : "text-red-400"}
                >
                  {market.change}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Transactions (Col Span 2) */}
        <Card className="md:col-span-2 bg-slate-800 border-slate-700 text-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-100">
              Recent Transactions
            </CardTitle>
            {/* <CardDescription className="text-slate-400">Your latest buy and sell activities.</CardDescription> */}
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {mockRecentTransactions.map((tx, index) => (
                  <TableRow
                    key={index}
                    className="border-slate-700 hover:bg-slate-700/30"
                  >
                    <TableCell>
                      <Badge
                        variant={tx.type === "BUY" ? "default" : "destructive"}
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
                      {tx.ticker}
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
