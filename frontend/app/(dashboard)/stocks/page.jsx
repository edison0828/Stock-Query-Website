// app/(dashboard)/stocks/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation"; // 用於讀取 URL 查詢參數
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // 用於篩選器
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; // 用於分頁
import {
  Search,
  Filter,
  Loader2 as Spinner,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "lodash";

const ITEMS_PER_PAGE = 10;

export default function StockSearchListPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // 獲取 URL 查詢參數
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || ""); // 從 URL q 參數初始化
  const [selectedMarketType, setSelectedMarketType] = useState(
    searchParams.get("market_type") || "ALL"
  );
  const [selectedSecurityStatus, setSelectedSecurityStatus] = useState(
    searchParams.get("security_status") || "ALL"
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );

  const [stocks, setStocks] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0); // 總股票數，用於分頁
  const [isLoading, setIsLoading] = useState(false);

  const [marketTypes, setMarketTypes] = useState(mockMarketTypes);
  const [securityStatuses, setSecurityStatuses] =
    useState(mockSecurityStatuses);

  const totalPages = Math.ceil(totalStocks / ITEMS_PER_PAGE);

  const buildApiParams = (page, query, marketType, securityStatus) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (marketType && marketType !== "ALL")
      params.set("market_type", marketType);
    if (securityStatus && securityStatus !== "ALL")
      params.set("security_status", securityStatus);
    params.set("page", page.toString());
    params.set("limit", ITEMS_PER_PAGE.toString());
    return params;
  };

  // 核心的獲取股票數據函數
  const fetchStocksData = useCallback(
    async (page, query, marketType, securityStatus) => {
      setIsLoading(true);
      const apiParams = buildApiParams(page, query, marketType, securityStatus);
      const urlParamsForRouter = new URLSearchParams(apiParams); // 複製一份用於 router，不包含 limit
      urlParamsForRouter.delete("limit");
      if (page === 1) urlParamsForRouter.delete("page"); // 如果是第一頁，URL中可以省略 page=1

      // 更新 URL，但不觸發導航 (僅替換歷史記錄)
      // 只有在參數實際變化時才更新 URL，避免不必要的 router.replace
      const currentSearchParams = new URLSearchParams(searchParams.toString());
      if (currentSearchParams.toString() !== urlParamsForRouter.toString()) {
        router.replace(`/stocks?${urlParamsForRouter.toString()}`, {
          scroll: false,
        });
      }

      try {
        // 使用內部 API 路由
        const apiUrl = `/api/stocks`;
        const response = await fetch(`${apiUrl}?${apiParams.toString()}`);

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        setStocks(data.items || []);
        setTotalStocks(data.total || 0);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching stocks:", error);
        toast({
          variant: "destructive",
          title: "錯誤",
          description: "無法獲取股票列表。",
        });
        setStocks([]);
        setTotalStocks(0);
      } finally {
        setIsLoading(false);
      }
    },
    [router, searchParams, toast]
  ); // searchParams 加入依賴，以便比較是否需要更新 URL

  // 使用 debounce 來處理搜尋框輸入
  const debouncedSearch = useCallback(
    debounce((currentSearchTerm, currentMarketType, currentSecurityStatus) => {
      fetchStocksData(
        1,
        currentSearchTerm,
        currentMarketType,
        currentSecurityStatus
      );
    }, 500),
    [fetchStocksData]
  );

  // Effect for searchTerm changes (user typing)
  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    if (searchTerm !== queryFromUrl) {
      debouncedSearch(searchTerm, selectedMarketType, selectedSecurityStatus);
    }
  }, [
    searchTerm,
    selectedMarketType,
    selectedSecurityStatus,
    searchParams,
    debouncedSearch,
  ]);

  // Effect for initial load from URL or direct navigation
  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    const marketTypeFromUrl = searchParams.get("market_type") || "ALL";
    const securityStatusFromUrl = searchParams.get("security_status") || "ALL";
    const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);

    // 設置狀態以匹配 URL，這樣 UI 和 URL 保持同步
    // 這些 setState 不會立即觸發上面的 searchTerm useEffect，因為我們有條件判斷
    setSearchTerm(queryFromUrl);
    setSelectedMarketType(marketTypeFromUrl);
    setSelectedSecurityStatus(securityStatusFromUrl);
    // setCurrentPage(pageFromUrl); // currentPage 由 fetchStocksData 內部設置

    // 初始載入時獲取數據
    fetchStocksData(
      pageFromUrl,
      queryFromUrl,
      marketTypeFromUrl,
      securityStatusFromUrl
    );
  }, []); // 空依賴數組，只在組件掛載時執行一次以同步 URL 參數

  // Handler for filter button
  const handleApplyFilters = () => {
    fetchStocksData(1, searchTerm, selectedMarketType, selectedSecurityStatus);
  };

  // Handler for page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      fetchStocksData(
        newPage,
        searchTerm,
        selectedMarketType,
        selectedSecurityStatus
      );
    }
  };

  const formatPrice = (price, currency = "TWD") => {
    if (price === null || price === undefined) return "N/A";

    const symbol = currency === "USD" ? "$" : "NT$";
    return `${symbol}${Number(price).toFixed(2)}`;
  };

  const formatPriceChange = (change, percentage) => {
    if (
      change === null ||
      change === undefined ||
      percentage === null ||
      percentage === undefined
    ) {
      return null;
    }

    const isPositive = change > 0;
    const isNegative = change < 0;
    const isFlat = change === 0;

    return {
      change: Number(change).toFixed(2),
      percentage: Number(percentage).toFixed(2),
      isPositive,
      isNegative,
      isFlat,
    };
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-50">
        Stock Search / List
      </h1>

      {/* 搜尋與篩選 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
          <div className="flex-grow">
            <Label
              htmlFor="stock-search-input"
              className="text-sm font-medium text-slate-300"
            >
              搜尋股票
            </Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <Input
                id="stock-search-input"
                type="text"
                placeholder="股票代號或公司名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 md:flex-shrink-0 md:w-auto">
            <div className="sm:col-span-1">
              <Label
                htmlFor="market-type-filter"
                className="text-sm font-medium text-slate-300"
              >
                市場類型
              </Label>
              <Select
                value={selectedMarketType}
                onValueChange={setSelectedMarketType}
              >
                <SelectTrigger
                  id="market-type-filter"
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                >
                  <SelectValue placeholder="全部市場類型" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {marketTypes.map((mt) => (
                    <SelectItem
                      key={mt.id}
                      value={mt.id}
                      className="hover:bg-slate-700 focus:bg-slate-700"
                    >
                      {mt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <Label
                htmlFor="security-status-filter"
                className="text-sm font-medium text-slate-300"
              >
                證券狀態
              </Label>
              <Select
                value={selectedSecurityStatus}
                onValueChange={setSelectedSecurityStatus}
              >
                <SelectTrigger
                  id="security-status-filter"
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                >
                  <SelectValue placeholder="全部狀態" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {securityStatuses.map((ss) => (
                    <SelectItem
                      key={ss.id}
                      value={ss.id}
                      className="hover:bg-slate-700 focus:bg-slate-700"
                    >
                      {ss.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleApplyFilters}
              className="mt-1 sm:mt-0 sm:self-end bg-blue-600 hover:bg-blue-700 sm:col-span-1 md:w-auto w-full"
            >
              <Filter className="mr-2 h-4 w-4" /> 套用篩選
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 股票列表 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">
            搜尋結果 {totalStocks > 0 && `(共 ${totalStocks} 筆)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Spinner className="h-8 w-8 animate-spin text-blue-500" />
              <p className="ml-3 text-slate-400">載入股票數據中...</p>
            </div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-10">
              <Info className="mx-auto h-12 w-12 text-slate-500 mb-3" />
              <p className="text-slate-400">找不到符合條件的股票。</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-700/30">
                      <TableHead className="text-slate-400">股票代號</TableHead>
                      <TableHead className="text-slate-400">公司名稱</TableHead>
                      <TableHead className="text-slate-400">市場類型</TableHead>
                      <TableHead className="text-slate-400">證券狀態</TableHead>
                      <TableHead className="text-slate-400 text-right">
                        當前股價
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocks.map((stock) => {
                      const priceChangeInfo = formatPriceChange(
                        stock.price_change,
                        stock.change_percentage
                      );

                      return (
                        <TableRow
                          key={stock.stock_id}
                          className="border-slate-700 hover:bg-slate-700/30"
                        >
                          <TableCell>
                            <Link
                              href={`/stocks/${stock.stock_id}`}
                              className="font-medium text-blue-400 hover:underline"
                            >
                              {stock.stock_id}
                            </Link>
                          </TableCell>
                          <TableCell className="text-slate-100">
                            {stock.company_name}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {stock.market_type}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {stock.security_status}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end space-y-1">
                              {/* 當前股價 */}
                              <div className="font-medium text-slate-100">
                                {formatPrice(
                                  stock.current_price,
                                  stock.currency
                                )}
                              </div>

                              {/* 漲跌資訊 */}
                              {priceChangeInfo && (
                                <div
                                  className={`flex items-center space-x-1 text-sm ${
                                    priceChangeInfo.isPositive
                                      ? "text-green-400"
                                      : priceChangeInfo.isNegative
                                      ? "text-red-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {/* 漲跌箭頭 */}
                                  {priceChangeInfo.isPositive && (
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414 6.707 7.707a1 1 0 01-1.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                  {priceChangeInfo.isNegative && (
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                  {priceChangeInfo.isFlat && (
                                    <span className="w-3 h-3 flex items-center justify-center">
                                      -
                                    </span>
                                  )}

                                  {/* 漲跌金額和百分比 */}
                                  <span>
                                    {priceChangeInfo.isPositive ? "+" : ""}
                                    {priceChangeInfo.change} (
                                    {priceChangeInfo.isPositive ? "+" : ""}
                                    {priceChangeInfo.percentage}%)
                                  </span>
                                </div>
                              )}

                              {/* 沒有價格資料時顯示 */}
                              {!priceChangeInfo &&
                                stock.current_price === null && (
                                  <div className="text-sm text-slate-500">
                                    無價格資料
                                  </div>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent className="bg-slate-700/30 border border-slate-700 rounded-md p-1">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage - 1);
                        }}
                        disabled={currentPage === 1}
                        className={
                          currentPage === 1
                            ? "text-slate-600 cursor-not-allowed"
                            : "hover:bg-slate-600"
                        }
                      />
                    </PaginationItem>
                    {/* 簡單的分頁邏輯，可根據需要擴展 */}
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      // 簡化顯示邏輯：當前頁，前後各一頁，首尾頁，中間省略號
                      const showPage =
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        pageNum === currentPage ||
                        pageNum === currentPage - 1 ||
                        pageNum === currentPage + 1;
                      const showEllipsisBefore =
                        pageNum === currentPage - 2 &&
                        currentPage > 3 &&
                        totalPages > 5;
                      const showEllipsisAfter =
                        pageNum === currentPage + 2 &&
                        currentPage < totalPages - 2 &&
                        totalPages > 5;

                      if (showEllipsisBefore || showEllipsisAfter) {
                        return (
                          <PaginationItem key={`ellipsis-${pageNum}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      if (showPage) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(pageNum);
                              }}
                              isActive={currentPage === pageNum}
                              className={
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "hover:bg-slate-600"
                              }
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage + 1);
                        }}
                        disabled={currentPage === totalPages}
                        className={
                          currentPage === totalPages
                            ? "text-slate-600 cursor-not-allowed"
                            : "hover:bg-slate-600"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
