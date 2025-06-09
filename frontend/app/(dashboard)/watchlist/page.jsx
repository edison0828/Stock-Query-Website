// app/(dashboard)/watchlist/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  Info,
  TrendingUp,
  TrendingDown,
  Loader2 as Spinner,
  PlusCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // 確保路徑正確
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AddWatchlistItemDialog from "@/components/shared/AddWatchlistItemDialog"; // 確保路徑正確
import { useWatchlist } from "@/contexts/WatchlistContext";

// 添加圖表組件
import { ResponsiveContainer, LineChart, Line } from "recharts";
// 迷你圖表組件 (與 dashboard 相同)
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

export default function MyWatchlistPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingItemId, setRemovingItemId] = useState(null);
  const { toast } = useToast();

  // 使用 Context 中的 refreshWatchlist 函數
  const { refreshWatchlist } = useWatchlist();

  const fetchWatchlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/watchlist`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "無法獲取關注列表數據");
      }
      const data = await response.json();
      setWatchlistItems(data);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: error.message || "無法獲取關注列表數據，請稍後再試。",
      });
      setWatchlistItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleWatchlistUpdated = () => {
    fetchWatchlist(); // 當 AddWatchlistItemDialog 成功加入股票後，調用此函數來刷新主列表
    refreshWatchlist(); // 刷新側邊欄的摘要
  };

  const handleRemoveFromWatchlist = async (
    itemSymbol,
    itemId,
    stockIdToRemove
  ) => {
    // itemId 是前端用於追蹤 spinner 的標識 (例如 'user_id_stock_id')
    // stockIdToRemove 是實際傳給後端 API 的股票 ID (即 tickerSymbol)
    setRemovingItemId(itemId);
    try {
      // --- 替換為真實 API 呼叫 ---
      // API 端點 `/api/watchlist/[identifier]`，其中 identifier 是 stock_id (tickerSymbol)
      const response = await fetch(
        `/api/watchlist/${encodeURIComponent(stockIdToRemove)}`,
        {
          method: "DELETE",
          // 如果 API 需要認證，NextAuth.js 會自動處理 cookie
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `無法從關注列表移除 ${itemSymbol}`);
      }
      // 成功後，從前端 state 中移除
      // 注意：如果 itemId 和 stockIdToRemove 不同，這裡的 filter 條件要正確
      setWatchlistItems((prevItems) =>
        prevItems.filter((item) => item.stock_id !== stockIdToRemove)
      );
      // 刷新側邊欄摘要
      refreshWatchlist();
      toast({
        title: "成功",
        description: `${itemSymbol} 已從您的關注列表移除。`,
      });
      // --- 結束替換 ---
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      toast({
        variant: "destructive",
        title: "移除失敗",
        description: error.message,
      });
    } finally {
      setRemovingItemId(null);
    }
  };

  const getCurrencySymbol = (currencyCode) => {
    if (currencyCode === "USD") return "$";
    if (currencyCode === "TWD") return "NT$";
    return currencyCode ? currencyCode + " " : ""; // 如果有其他貨幣碼，直接顯示
  };

  // 根據漲跌生成趨勢數據 (與 dashboard 相同的備用函數)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-50">My Watchlist</h1>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          新增關注
        </Button>
      </div>

      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">您關注的股票</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Spinner className="h-8 w-8 animate-spin text-blue-500" />
              <p className="ml-3 text-slate-400">載入關注列表中...</p>
            </div>
          ) : watchlistItems.length === 0 ? (
            <div className="text-center py-10">
              <Info className="mx-auto h-12 w-12 text-slate-500 mb-3" />
              <p className="text-slate-400">您的關注列表是空的。</p>
              <Button variant="link" asChild className="mt-2 text-blue-400">
                <Link href="/stocks">去搜尋並加入股票</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/30">
                  <TableHead className="text-slate-400 w-[200px]">
                    TICKER/NAME
                  </TableHead>
                  <TableHead className="text-slate-400 w-[120px]">
                    CURRENT PRICE
                  </TableHead>
                  <TableHead className="text-slate-400 w-[140px]">
                    CHANGE
                  </TableHead>
                  <TableHead className="text-slate-400 w-[100px] px-4">
                    5-DAY TREND
                  </TableHead>
                  <TableHead className="text-slate-400 w-[100px] px-4">
                    VOLUME
                  </TableHead>
                  <TableHead className="text-right text-slate-400 w-[120px]">
                    ACTIONS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlistItems.map((item) => (
                  <TableRow
                    key={item.id || item.stock_id}
                    className="border-slate-700 hover:bg-slate-700/30"
                  >
                    <TableCell>
                      <Link
                        href={`/stocks/${item.symbol}`}
                        className="hover:underline"
                      >
                        <div className="font-medium text-slate-100">
                          {item.symbol}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.name}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {getCurrencySymbol(item.currency)}
                      {(item.current_price || 0).toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={item.is_up ? "text-green-400" : "text-red-400"}
                    >
                      {item.is_up ? (
                        <TrendingUp className="inline h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="inline h-4 w-4 mr-1" />
                      )}
                      {item.is_up ? "+" : ""}
                      {(item.change_amount || 0).toFixed(2)} (
                      {item.is_up ? "+" : ""}
                      {(item.change_percent || 0).toFixed(2)}%)
                    </TableCell>
                    <TableCell>
                      {/* 使用趨勢圖表替代 MARKET CAP */}
                      <MiniTrendChart
                        data={
                          item.trend_data && item.trend_data.length >= 2
                            ? item.trend_data
                            : generateTrendData(item.is_up)
                        }
                        isUp={item.is_up}
                      />
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {item.volume || "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={
                              removingItemId === (item.id || item.stock_id)
                            }
                            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-70"
                          >
                            {removingItemId === (item.id || item.stock_id) ? (
                              <Spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="ml-1.5 hidden sm:inline">
                              {removingItemId === (item.id || item.stock_id)
                                ? "移除中..."
                                : "移除關注"}
                            </span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-800 border-slate-700 text-slate-200">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-slate-50">
                              確認移除
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              您確定要從關注列表中移除 {item.symbol} (
                              {item.name}) 嗎？此操作無法復原。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-4 flex justify-end gap-2">
                            <AlertDialogCancel className="border-slate-600 hover:bg-slate-700 text-slate-700">
                              取消
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRemoveFromWatchlist(
                                  item.symbol,
                                  item.id || item.stock_id,
                                  item.stock_id
                                )
                              }
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              確認移除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <AddWatchlistItemDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onWatchlistUpdate={handleWatchlistUpdated}
      />
    </div>
  );
}
