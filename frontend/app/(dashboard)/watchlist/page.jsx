// app/(dashboard)/watchlist/page.jsx
"use client";

import AddWatchlistItemDialog from "@/components/shared/AddWatchlistItemDialog";
import { useState, useEffect } from "react";
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
} from "lucide-react"; // 引入圖示
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog"; // 引入 Alert Dialog
import { useCallback } from "react";

// 模擬的關注列表數據 (之後會從 API 獲取)
const mockInitialWatchlist = [
  {
    id: "AAPL_watchlist_item",
    stock_id: "AAPL_stock_id",
    symbol: "AAPL",
    name: "Apple Inc.",
    current_price: 170.34,
    currency: "USD",
    change_amount: 2.1,
    change_percent: 1.25,
    is_up: true,
    market_cap: "2.75T",
    volume: "55.3M",
  },
  {
    id: "2330_watchlist_item",
    stock_id: "2330_stock_id",
    symbol: "2330",
    name: "台積電",
    current_price: 600.0,
    currency: "TWD",
    change_amount: -5.0,
    change_percent: -0.83,
    is_up: false,
    market_cap: "15.56T",
    volume: "25.1M",
  },
  {
    id: "MSFT_watchlist_item",
    stock_id: "MSFT_stock_id",
    symbol: "MSFT",
    name: "Microsoft Corp.",
    current_price: 290.75,
    currency: "USD",
    change_amount: 3.5,
    change_percent: 1.22,
    is_up: true,
    market_cap: "2.15T",
    volume: "20.8M",
  },
  {
    id: "NVDA_watchlist_item",
    stock_id: "NVDA_stock_id",
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    current_price: 220.15,
    currency: "USD",
    change_amount: -1.1,
    change_percent: -0.49,
    is_up: false,
    market_cap: "550.2B",
    volume: "30.5M",
  },
  {
    id: "GOOGL_watchlist_item",
    stock_id: "GOOGL_stock_id",
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    current_price: 2700.5,
    currency: "USD",
    change_amount: 12.3,
    change_percent: 0.5,
    is_up: true,
    market_cap: "1.80T",
    volume: "1.2M",
  },
];

export default function MyWatchlistPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingItemId, setRemovingItemId] = useState(null); // 追蹤正在移除的項目 ID
  const { toast } = useToast();

  const handleWatchlistUpdated = () => {
    // 彈窗告知列表已更新，觸發主列表刷新
    // 理想情況下，如果新增成功，API會返回新的item，直接加到現有列表
    // 這裡我們先簡單地重新觸發 fetchWatchlist
    // 這需要將 fetchWatchlist 提取出來，以便可以被手動調用
    fetchWatchlist(); // 假設 fetchWatchlist 函數已定義在 MyWatchlistPage 作用域內
  };

  // 將 fetchWatchlist 的邏輯提取成一個可以被重用的函數
  const fetchWatchlist = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: 呼叫 API 獲取用戶的關注列表數據
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/watchlist`
      // // , { headers: { 'Authorization': `Bearer ${token}` } }
      // );
      // if (!response.ok) throw new Error('Failed to fetch watchlist');
      // const data = await response.json();
      // setWatchlistItems(data); // API 應該返回類似 mockInitialWatchlist 的結構

      // 使用模擬數據
      await new Promise((resolve) => setTimeout(resolve, 700)); // 模擬網路延遲
      setWatchlistItems(mockInitialWatchlist);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "無法獲取關注列表數據，請稍後再試。",
      });
      setWatchlistItems([]); // 出錯時清空列表
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]); // 初始載入

  const handleRemoveFromWatchlist = async (itemSymbol, itemId) => {
    setRemovingItemId(itemId); // 開始移除，設置 ID 以顯示 spinner
    // TODO: 呼叫 API 從後端移除關注列表項目
    // try {
    //   const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/watchlist/${itemSymbolOrId}`, { // 或者使用 watchlist item ID
    //     method: 'DELETE',
    //     // headers: { 'Authorization': `Bearer ${token}` },
    //   });
    //   if (!response.ok) {
    //     throw new Error(`Failed to remove ${itemSymbol} from watchlist`);
    //   }
    //   // 成功後，從前端 state 中移除
    //   setWatchlistItems(prevItems => prevItems.filter(item => item.id !== itemId)); // 假設每個 item 有唯一 id
    //   toast({ title: "成功", description: `${itemSymbol} 已從您的關注列表移除。` });
    // } catch (error) {
    //   console.error("Error removing from watchlist:", error);
    //   toast({ variant: "destructive", title: "移除失敗", description: error.message });
    // } finally {
    //    setRemovingItemId(null);
    // }

    // 模擬 API 呼叫
    await new Promise((resolve) => setTimeout(resolve, 500));
    setWatchlistItems((prevItems) =>
      prevItems.filter((item) => item.id !== itemId)
    );
    toast({
      title: "成功",
      description: `${itemSymbol} 已從您的關注列表移除。`,
    });
    setRemovingItemId(null);
  };

  const getCurrencySymbol = (currencyCode) => {
    if (currencyCode === "USD") return "$";
    if (currencyCode === "TWD") return "NT$";
    return ""; // 其他貨幣可擴展
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
          {/* <CardDescription className="text-slate-400">追蹤您感興趣的市場動態。</CardDescription> */}
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
                  <TableHead className="text-slate-400">
                    CURRENT PRICE
                  </TableHead>
                  <TableHead className="text-slate-400">CHANGE</TableHead>
                  <TableHead className="text-slate-400">MARKET CAP</TableHead>
                  <TableHead className="text-slate-400">VOLUME</TableHead>
                  <TableHead className="text-right text-slate-400">
                    ACTIONS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlistItems.map((item) => (
                  <TableRow
                    key={item.id || item.symbol}
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
                      {item.current_price.toFixed(2)}
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
                      {item.change_amount.toFixed(2)} ({item.is_up ? "+" : ""}
                      {item.change_percent.toFixed(2)}%)
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {item.market_cap}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {item.volume}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={removingItemId === item.id}
                            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-70"
                          >
                            {removingItemId === item.id ? (
                              <Spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="ml-1.5 hidden sm:inline">
                              {removingItemId === item.id
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
                            <AlertDialogCancel className="border-slate-600 hover:bg-slate-500 text-slate-800">
                              取消
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRemoveFromWatchlist(item.symbol, item.id)
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
        onWatchlistUpdate={handleWatchlistUpdated} // 傳遞回呼函數
      />
    </div>
  );
}
