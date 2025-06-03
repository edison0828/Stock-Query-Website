// components/shared/TradeDialog.jsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X as CloseIcon,
  Search,
  TrendingUp,
  TrendingDown,
  Loader2 as Spinner,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "lodash";

export default function TradeDialog({
  isOpen,
  onClose,
  initialSelectedStock, // 可選的，用於預填股票
  portfolioId, // 交易到哪個投資組合 (現在是必須的)
  initialAction = "BUY",
  onTradeSubmitSuccess, // 交易成功後的回呼
}) {
  const [actionType, setActionType] = useState(initialAction);
  const [quantity, setQuantity] = useState(10);

  const [selectedStock, setSelectedStock] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    portfolioId || ""
  ); // 優先使用傳入的 portfolioId
  const [isFetchingPortfolios, setIsFetchingPortfolios] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setActionType(initialAction);
  }, [initialAction]);

  useEffect(() => {
    if (isOpen) {
      // 重置或設置股票信息
      if (initialSelectedStock) {
        setSelectedStock(initialSelectedStock);
        setSearchQuery(
          `${initialSelectedStock.symbol} - ${initialSelectedStock.name}`
        );
        setShowSearchResults(false);
        setSearchResults([]);
      } else {
        setSelectedStock(null);
        setSearchQuery("");
        setSearchResults([]);
        setShowSearchResults(false);
      }

      // 獲取投資組合列表
      const fetchPortfolios = async () => {
        setIsFetchingPortfolios(true);
        try {
          const response = await fetch("/api/portfolios");
          if (!response.ok) {
            throw new Error("無法獲取投資組合列表");
          }
          const data = await response.json();
          setPortfolios(data);

          if (portfolioId) {
            setSelectedPortfolioId(portfolioId.toString());
          } else if (data.length > 0) {
            setSelectedPortfolioId(data[0].portfolio_id.toString());
          } else {
            setSelectedPortfolioId("");
          }
        } catch (err) {
          console.error("Error fetching portfolios:", err);
          toast({
            variant: "destructive",
            title: "錯誤",
            description: "無法獲取投資組合列表。",
          });
          setPortfolios([]);
        } finally {
          setIsFetchingPortfolios(false);
        }
      };
      fetchPortfolios();
    }
  }, [isOpen, initialSelectedStock, portfolioId, toast]);

  const currentPriceForCalc = selectedStock?.current_price || 0;
  const effectivePrice = currentPriceForCalc; // 簡化為市價

  const totalValue = useMemo(() => {
    const numQuantity = parseInt(quantity, 10);
    if (!isNaN(numQuantity) && numQuantity > 0 && effectivePrice > 0) {
      return (numQuantity * effectivePrice).toFixed(2);
    }
    return "0.00";
  }, [quantity, effectivePrice]);

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setQuantity(value === "" ? "" : parseInt(value, 10));
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 1) {
        setSearchResults([]);
        setShowSearchResults(false);
        setIsLoadingSearch(false);
        return;
      }
      if (
        selectedStock &&
        `${selectedStock.symbol} - ${selectedStock.name}` === query
      ) {
        // 如果搜尋框內容與已選股票一致，則不重新搜尋
        setShowSearchResults(false);
        setIsLoadingSearch(false);
        return;
      }

      setIsLoadingSearch(true);
      setShowSearchResults(true);
      try {
        // 使用現有的股票搜尋 API
        const response = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
          throw new Error("搜尋請求失敗");
        }
        const searchData = await response.json();

        // 為每個搜尋結果獲取價格資訊
        const resultsWithPrice = await Promise.all(
          searchData.slice(0, 5).map(async (stock) => {
            // 限制前5個結果
            try {
              const priceResponse = await fetch(
                `/api/stocks/${stock.stock_id}`
              );
              if (priceResponse.ok) {
                const stockDetail = await priceResponse.json();
                return {
                  stock_id: stock.stock_id,
                  symbol: stock.stock_id, // 使用 stock_id 作為 symbol
                  name: stock.company_name,
                  current_price: stockDetail.currentPrice || 0,
                  is_up: stockDetail.isUp || false,
                  change_amount: stockDetail.priceChange || 0,
                  change_percent: stockDetail.percentChange || 0,
                };
              } else {
                // 如果無法獲取價格，返回基本資訊
                return {
                  stock_id: stock.stock_id,
                  symbol: stock.stock_id,
                  name: stock.company_name,
                  current_price: 0,
                  is_up: false,
                  change_amount: 0,
                  change_percent: 0,
                };
              }
            } catch (error) {
              console.error(`獲取 ${stock.stock_id} 價格失敗:`, error);
              return {
                stock_id: stock.stock_id,
                symbol: stock.stock_id,
                name: stock.company_name,
                current_price: 0,
                is_up: false,
                change_amount: 0,
                change_percent: 0,
              };
            }
          })
        );

        setSearchResults(resultsWithPrice);
      } catch (error) {
        setSearchResults([]);
        toast({
          variant: "destructive",
          title: "搜尋錯誤",
          description: "搜尋股票時發生問題。",
        });
      } finally {
        setIsLoadingSearch(false);
      }
    }, 300),
    [toast, selectedStock] // 加入 selectedStock 到依賴
  );

  useEffect(() => {
    // 如果用戶手動清空搜尋框，或修改了已選中股票的搜尋框內容，則清空已選中股票
    if (
      searchQuery === "" ||
      (selectedStock &&
        `${selectedStock.symbol} - ${selectedStock.name}` !== searchQuery)
    ) {
      if (selectedStock) setSelectedStock(null); // 只有在之前有選中股票時才清空
    }
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, selectedStock, debouncedSearch]);

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setSearchQuery(`${stock.symbol} - ${stock.name}`);
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleSubmitTrade = async () => {
    setIsLoading(true);
    if (!selectedStock) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "請選擇一支股票。",
      });
      setIsLoading(false);
      return;
    }
    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "數量必須是正整數。",
      });
      setIsLoading(false);
      return;
    }
    if (!selectedPortfolioId) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "請選擇一個投資組合。",
      });
      setIsLoading(false);
      return;
    }

    // TODO: 呼叫後端 API 記錄模擬交易
    console.log("Submitting trade:", {
      stock_id: selectedStock.stock_id,
      portfolio_id: parseInt(selectedPortfolioId, 10),
      transaction_type: actionType,
      quantity: numQuantity,
      price_per_share: effectivePrice,
    });
    try {
      const transactionData = {
        stock_id: selectedStock.stock_id,
        portfolio_id: parseInt(selectedPortfolioId, 10),
        transaction_type: actionType,
        quantity: numQuantity,
        price_per_share: effectivePrice,
      };

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "交易提交失敗");
      }

      const result = await response.json();

      toast({
        title: "模擬交易成功",
        description: `${
          actionType === "BUY" ? "買入" : "賣出"
        } ${numQuantity} 股 ${selectedStock.symbol} 成功。`,
      });

      if (onTradeSubmitSuccess) {
        onTradeSubmitSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      console.error("交易提交失敗:", err);
      toast({
        variant: "destructive",
        title: "交易失敗",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClose = () => {
    setActionType(initialAction); // 回到初始動作
    setQuantity(10);
    setSelectedStock(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    // setSelectedPortfolioId(portfolioId || ""); // 根據是否希望保留上次選擇或用 prop 重置
    // setPortfolios([]); // 通常不需要重置 portfolio 列表，除非它很動態
    setIsLoading(false);
    setIsLoadingSearch(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-200 p-0 overflow-hidden">
        {/* <DialogClose asChild className="absolute right-3 top-3 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100"
          >
            <CloseIcon className="h-5 w-5" />
          </Button>
        </DialogClose> */}

        <DialogHeader className="bg-slate-800 px-6 pt-6 pb-4 border-b border-slate-700">
          <DialogTitle className="text-xl font-semibold text-slate-50">
            新增交易
          </DialogTitle>
          {selectedStock ? (
            <>
              <div className="text-sm text-slate-400">
                {selectedStock.name} ({selectedStock.symbol})
              </div>
              <div>
                <span
                  className={`text-2xl font-bold ${
                    selectedStock.is_up ? "text-green-400" : "text-red-400"
                  }`}
                >
                  ${(selectedStock.current_price || 0).toFixed(2)}
                </span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    selectedStock.is_up ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {selectedStock.is_up ? (
                    <TrendingUp className="inline h-4 w-4" />
                  ) : (
                    <TrendingDown className="inline h-4 w-4" />
                  )}
                  {selectedStock.is_up ? "+" : ""}
                  {(selectedStock.change_amount || 0).toFixed(2)} (
                  {selectedStock.is_up ? "+" : ""}
                  {(selectedStock.change_percent || 0).toFixed(2)}%)
                </span>
              </div>
            </>
          ) : (
            <DialogDescription className="text-slate-400">
              搜尋並選擇股票以進行交易。
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[calc(80vh-160px)] overflow-y-auto">
          {" "}
          {/* 調整最大高度 */}
          <div className="space-y-1 relative">
            <Label htmlFor="stock-search" className="text-slate-300">
              股票
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <Input
                id="stock-search"
                type="text"
                placeholder="輸入代號或名稱"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() =>
                  searchQuery &&
                  searchResults.length > 0 &&
                  setShowSearchResults(true)
                }
                className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            {showSearchResults && (
              <ScrollArea className="absolute z-10 w-full mt-1 max-h-40 bg-slate-700 border border-slate-600 rounded-md shadow-lg">
                {isLoadingSearch && (
                  <div className="p-2 text-center text-slate-400">
                    <Spinner className="inline animate-spin h-4 w-4 mr-2" />
                    搜尋中...
                  </div>
                )}
                {!isLoadingSearch &&
                  searchResults.length > 0 &&
                  searchResults.map((stock) => (
                    <div
                      key={stock.stock_id}
                      onClick={() => handleSelectStock(stock)}
                      className="p-2 hover:bg-slate-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                    >
                      <p className="font-medium text-slate-100">
                        {stock.symbol} - {stock.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        價格: ${(stock.current_price || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                {!isLoadingSearch &&
                  searchResults.length === 0 &&
                  searchQuery.length >= 1 && (
                    <div className="p-2 text-center text-slate-400">
                      找不到結果。
                    </div>
                  )}
              </ScrollArea>
            )}
          </div>
          {selectedStock && (
            <>
              <Tabs
                value={actionType}
                onValueChange={setActionType}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-slate-700 p-1 h-auto">
                  <TabsTrigger
                    value="BUY"
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 py-2"
                  >
                    買入
                  </TabsTrigger>
                  <TabsTrigger
                    value="SELL"
                    className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-300 py-2"
                  >
                    賣出
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="quantity" className="text-slate-300">
                    數量
                  </Label>
                  <Input
                    id="quantity"
                    type="text"
                    inputMode="numeric"
                    value={quantity}
                    onChange={handleQuantityChange}
                    className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">預估總額 (市價)</Label>
                  <Input
                    value={`$${totalValue}`}
                    readOnly
                    disabled
                    className="bg-slate-700/50 border-slate-600 text-slate-100 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="portfolio-select-trade"
                  className="text-slate-300"
                >
                  投資組合
                </Label>
                {isFetchingPortfolios ? (
                  <Input
                    value="載入中..."
                    disabled
                    className="bg-slate-700 border-slate-600"
                  />
                ) : portfolios.length > 0 ? (
                  <Select
                    value={selectedPortfolioId}
                    onValueChange={setSelectedPortfolioId}
                    disabled={portfolios.length === 0}
                  >
                    <SelectTrigger
                      id="portfolio-select-trade"
                      className="w-full bg-slate-700 border-slate-600 text-slate-100"
                    >
                      <SelectValue placeholder="選擇投資組合" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                      {portfolios.map((p) => (
                        <SelectItem
                          key={p.portfolio_id}
                          value={p.portfolio_id.toString()}
                          className="hover:bg-slate-700 focus:bg-slate-700"
                        >
                          {p.name || p.portfolio_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-slate-400">
                    沒有可用的投資組合。
                    <Button
                      variant="link"
                      className="p-0 ml-1 h-auto text-blue-400"
                      asChild
                    >
                      <Link href="/portfolios">去建立</Link>
                    </Button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-700 sm:justify-between sticky bottom-0 bg-slate-800">
          <Button
            variant="outline"
            onClick={handleDialogClose}
            className="w-full sm:w-auto border-slate-600 hover:bg-slate-700 text-slate-800"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmitTrade}
            disabled={
              isLoading ||
              !selectedStock ||
              parseInt(quantity, 10) <= 0 ||
              !selectedPortfolioId
            }
            className={`w-full sm:w-auto ${
              actionType === "BUY"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            {isLoading ? (
              <Spinner className="animate-spin h-4 w-4 mr-2" />
            ) : null}
            {isLoading
              ? "處理中..."
              : actionType === "BUY"
              ? "確認買入"
              : "確認賣出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
