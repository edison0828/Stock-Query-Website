// components/watchlist/AddWatchlistItemDialog.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area"; // 用於搜尋結果列表
import {
  PlusCircle,
  Search,
  Loader2 as Spinner,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "lodash"; // 用於搜尋防抖

export default function AddWatchlistItemDialog({
  isOpen,
  onClose,
  onWatchlistUpdate, // 新增成功後觸發的回呼，用於刷新主列表
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(null); // 追蹤哪個股票正在被加入
  const [addedStockIds, setAddedStockIds] = useState(new Set()); // 追蹤已加入的股票 ID，避免重複加入按鈕
  const { toast } = useToast();

  // 防抖搜尋函數
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        // 至少輸入2個字元才搜尋
        setSearchResults([]);
        setIsLoadingSearch(false);
        return;
      }
      setIsLoadingSearch(true);
      try {
        // TODO: 呼叫 API 搜尋股票
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/stocks/search?q=${encodeURIComponent(query)}`);
        // if (!response.ok) throw new Error('Failed to search stocks');
        // const data = await response.json();
        // setSearchResults(data); // API 應返回 [{ stock_id: 'xyz', symbol: 'AAPL', name: 'Apple Inc.' }, ...]

        // 模擬 API 搜尋
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockResults = [
          { stock_id: "AAPL_stock_id", symbol: "AAPL", name: "Apple Inc." },
          { stock_id: "TSLA_stock_id", symbol: "TSLA", name: "Tesla, Inc." },
          {
            stock_id: "AMZN_stock_id",
            symbol: "AMZN",
            name: "Amazon.com, Inc.",
          },
          {
            stock_id: "META_stock_id",
            symbol: "META",
            name: "Meta Platforms, Inc.",
          },
        ].filter(
          (stock) =>
            stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
            stock.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(mockResults);
      } catch (error) {
        console.error("Error searching stocks:", error);
        toast({
          variant: "destructive",
          title: "搜尋失敗",
          description: "無法搜尋股票，請稍後再試。",
        });
        setSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 500), // 500ms 防抖
    [toast]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    // 清理 debounce
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  const handleAddStockToWatchlist = async (stock) => {
    setIsAddingStock(stock.stock_id);
    try {
      // TODO: 呼叫 API 將股票加入關注列表
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/watchlist`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     // 'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ stock_id: stock.stock_id }), // 或 stock_symbol
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.detail || `無法將 ${stock.symbol} 加入關注列表`);
      // }

      // 模擬 API 呼叫
      await new Promise((resolve) => setTimeout(resolve, 500));

      setAddedStockIds((prev) => new Set(prev).add(stock.stock_id)); // 標記為已加入
      toast({
        title: "成功",
        description: `${stock.symbol} 已成功加入您的關注列表。`,
      });
      if (onWatchlistUpdate) {
        onWatchlistUpdate(); // 通知主頁面刷新列表
      }
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      toast({
        variant: "destructive",
        title: "加入失敗",
        description: error.message,
      });
    } finally {
      setIsAddingStock(null);
    }
  };

  // 當彈窗關閉時重置狀態
  const handleDialogClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setAddedStockIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700 text-slate-200 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700">
          <DialogTitle className="text-xl font-semibold text-slate-50">
            新增股票到關注列表
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            搜尋股票代號或公司名稱，然後點擊加入。
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="搜尋股票 (例如：AAPL 或 Apple)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
            />
          </div>

          <ScrollArea className="h-[250px] border border-slate-700 rounded-md">
            {isLoadingSearch ? (
              <div className="flex justify-center items-center h-full">
                <Spinner className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="p-2 space-y-1">
                {searchResults.map((stock) => (
                  <div
                    key={stock.stock_id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-700/50"
                  >
                    <div>
                      <p className="font-medium text-slate-100">
                        {stock.symbol}
                      </p>
                      <p className="text-xs text-slate-400">{stock.name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={
                        addedStockIds.has(stock.stock_id) ? "ghost" : "outline"
                      }
                      onClick={() =>
                        !addedStockIds.has(stock.stock_id) &&
                        handleAddStockToWatchlist(stock)
                      }
                      disabled={
                        isAddingStock === stock.stock_id ||
                        addedStockIds.has(stock.stock_id)
                      }
                      className={
                        addedStockIds.has(stock.stock_id)
                          ? "text-green-500 border-transparent hover:bg-transparent cursor-default"
                          : "border-slate-600 hover:bg-slate-600 text-slate-300 disabled:opacity-70"
                      }
                    >
                      {isAddingStock === stock.stock_id ? (
                        <Spinner className="h-4 w-4 animate-spin" />
                      ) : addedStockIds.has(stock.stock_id) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <PlusCircle className="h-4 w-4" />
                      )}
                      <span className="ml-1.5 text-slate-800">
                        {isAddingStock === stock.stock_id
                          ? "加入中..."
                          : addedStockIds.has(stock.stock_id)
                          ? "已加入"
                          : "加入"}
                      </span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 && !isLoadingSearch ? (
              <div className="flex justify-center items-center h-full text-slate-400 text-sm p-4 text-center">
                找不到符合 "{searchQuery}" 的股票。
              </div>
            ) : (
              <div className="flex justify-center items-center h-full text-slate-500 text-sm p-4 text-center">
                請輸入至少2個字元開始搜尋。
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={handleDialogClose}
            className="border-slate-600 hover:bg-slate-700 text-slate-800"
          >
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
