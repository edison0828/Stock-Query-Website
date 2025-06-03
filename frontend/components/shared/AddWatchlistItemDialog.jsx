// components/watchlist/AddWatchlistItemDialog.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  // DialogClose, // Dialog 本身會處理關閉，除非特定按鈕需要
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusCircle,
  Search,
  Loader2 as Spinner,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // 確保路徑正確
import { debounce } from "lodash";

export default function AddWatchlistItemDialog({
  isOpen,
  onClose,
  onWatchlistUpdate,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(null);
  const [addedStockIds, setAddedStockIds] = useState(new Set());
  const { toast } = useToast();

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setIsLoadingSearch(false);
        return;
      }
      setIsLoadingSearch(true);
      try {
        // --- 替換為真實 API 呼叫 ---
        const response = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // 嘗試解析錯誤訊息
          throw new Error(errorData.error || "搜尋股票失敗");
        }
        const data = await response.json();
        // API 應返回 [{ stock_id: 'xyz', symbol: 'AAPL', name: 'Apple Inc.' }, ...]
        // 確保 API 返回的 stock_id 是 Prisma Stocks 表中的 stock_id (通常是 tickerSymbol)
        setSearchResults(
          data.map((stock) => ({
            stock_id: stock.stock_id,
            symbol: stock.tickerSymbol || stock.stock_id,
            name: stock.companyName || stock.company_name,
            // 不顯示價格資訊，保持介面簡潔
          }))
        );
        // --- 結束替換 ---
      } catch (error) {
        console.error("Error searching stocks:", error);
        toast({
          variant: "destructive",
          title: "搜尋失敗",
          description: error.message || "無法搜尋股票，請稍後再試。",
        });
        setSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 500),
    [toast]
  );

  useEffect(() => {
    if (isOpen) {
      // 只在彈窗打開時執行搜尋邏輯
      debouncedSearch(searchQuery);
    }
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch, isOpen]); // 加入 isOpen 作為依賴

  const handleAddStockToWatchlist = async (stock) => {
    // stock 參數應該包含 stock_id (即 Prisma Stocks 表的 stock_id，也是 tickerSymbol)
    if (!stock || !stock.stock_id) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "無效的股票資訊。",
      });
      return;
    }
    setIsAddingStock(stock.stock_id);
    try {
      // --- 替換為真實 API 呼叫 ---
      const response = await fetch(`/api/watchlist`, {
        // 指向 POST /api/watchlist
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 如果 API 需要認證，NextAuth.js 會自動處理 cookie，
          // 如果你用的是 token-based auth, 你需要手動加入 Authorization header
        },
        body: JSON.stringify({ stock_id: stock.stock_id }), // 發送 Prisma Stocks.stock_id
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // 後端 P2002 錯誤 (唯一約束衝突) 會被轉換為 409
        if (
          response.status === 409 ||
          (errorData.error &&
            errorData.error.toLowerCase().includes("已在您的關注列表中"))
        ) {
          setAddedStockIds((prev) => new Set(prev).add(stock.stock_id)); // 標記為已加入
          toast({
            title: "提示",
            description: `${stock.symbol} 已在您的關注列表中。`,
          });
        } else {
          throw new Error(
            errorData.error || `無法將 ${stock.symbol} 加入關注列表`
          );
        }
      } else {
        // const newWatchlistItem = await response.json(); // API 應該返回新創建的項目或成功訊息
        setAddedStockIds((prev) => new Set(prev).add(stock.stock_id));
        toast({
          title: "成功",
          description: `${stock.symbol} 已成功加入您的關注列表。`,
        });
        if (onWatchlistUpdate) {
          onWatchlistUpdate();
        }
      }
      // --- 結束替換 ---
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

  const handleDialogClose = () => {
    if (isLoadingSearch) {
      // 如果正在搜尋，取消它
      debouncedSearch.cancel();
    }
    setSearchQuery("");
    setSearchResults([]);
    // addedStockIds 不需要在此處重置，因為 onWatchlistUpdate 會刷新主列表，
    // 主列表的數據才是判斷是否「已關注」的最終來源。
    // 如果不刷新主列表，則需要某種機制同步 addedStockIds 到主列表。
    // 但既然有 onWatchlistUpdate，最好是讓主列表刷新。
    onClose();
  };

  // 當彈窗從關閉變為打開時，重置 addedStockIds，以便重新檢查（如果主列表沒刷新的話）
  useEffect(() => {
    if (isOpen) {
      setAddedStockIds(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700 text-slate-200 p-0">
        {/* ... (DialogHeader, Input, ScrollArea 和按鈕的 JSX 基本不變) ... */}
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
                    key={stock.stock_id} // 使用從 API 獲取的唯一 stock_id
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-700/50"
                  >
                    <div>
                      <p className="font-medium text-slate-100">
                        {stock.symbol} {/* 顯示 tickerSymbol */}
                      </p>
                      <p className="text-xs text-slate-400">{stock.name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={
                        addedStockIds.has(stock.stock_id) ? "ghost" : "outline"
                      }
                      onClick={
                        () =>
                          !addedStockIds.has(stock.stock_id) &&
                          handleAddStockToWatchlist(stock) // 傳遞整個 stock 物件
                      }
                      disabled={
                        isAddingStock === stock.stock_id ||
                        addedStockIds.has(stock.stock_id)
                      }
                      className={
                        addedStockIds.has(stock.stock_id)
                          ? "text-green-500 border-transparent hover:bg-transparent cursor-default"
                          : "border-slate-600 hover:bg-slate-600 text-slate-700 disabled:opacity-70"
                      }
                    >
                      {isAddingStock === stock.stock_id ? (
                        <Spinner className="h-4 w-4 animate-spin" />
                      ) : addedStockIds.has(stock.stock_id) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <PlusCircle className="h-4 w-4" />
                      )}
                      <span className="ml-1.5">
                        {" "}
                        {/* 移除 text-slate-800，讓其繼承按鈕文字顏色 */}
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
            className="border-slate-600 hover:bg-slate-700 text-slate-700" // 調整關閉按鈕文字顏色
          >
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
