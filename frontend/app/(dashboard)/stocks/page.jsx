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

// 模擬數據 (之後會從 API 獲取)
const mockStockList = [
  {
    stock_id: "s1",
    symbol: "AAPL",
    name: "Apple Inc.",
    industry: "Technology",
    price: 170.34,
    currency: "USD",
  },
  {
    stock_id: "s2",
    symbol: "MSFT",
    name: "Microsoft Corp.",
    industry: "Technology",
    price: 305.84,
    currency: "USD",
  },
  {
    stock_id: "s3",
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    industry: "Technology",
    price: 2700.5,
    currency: "USD",
  },
  {
    stock_id: "s4",
    symbol: "2330",
    name: "台灣積體電路製造",
    industry: "Semiconductors",
    price: 600.0,
    currency: "TWD",
  },
  {
    stock_id: "s5",
    symbol: "AMZN",
    name: "Amazon.com, Inc.",
    industry: "E-Commerce",
    price: 3200.12,
    currency: "USD",
  },
  {
    stock_id: "s6",
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    industry: "Semiconductors",
    price: 280.5,
    currency: "USD",
  },
  {
    stock_id: "s7",
    symbol: "TSLA",
    name: "Tesla, Inc.",
    industry: "Automotive",
    price: 1050.75,
    currency: "USD",
  },
  {
    stock_id: "s8",
    symbol: "BABA",
    name: "Alibaba Group Holding Limited",
    industry: "E-Commerce",
    price: 120.2,
    currency: "USD",
  },
  {
    stock_id: "s9",
    symbol: "2454",
    name: "聯發科技",
    industry: "Semiconductors",
    price: 950.0,
    currency: "TWD",
  },
  {
    stock_id: "s10",
    symbol: "0050",
    name: "元大台灣卓越50基金",
    industry: "ETF",
    price: 135.5,
    currency: "TWD",
  },
  // 添加更多數據以測試分頁
  ...Array.from({ length: 15 }, (_, i) => ({
    stock_id: `s${11 + i}`,
    symbol: `TEST${i + 1}`,
    name: `Test Stock ${i + 1} Inc.`,
    industry: "Various",
    price: Math.random() * 1000,
    currency: "USD",
  })),
];

const mockExchanges = [
  { id: "ALL", name: "All Exchanges" },
  { id: "NASDAQ", name: "NASDAQ" },
  { id: "NYSE", name: "NYSE" },
  { id: "TWSE", name: "TWSE" },
];
const mockIndustries = [
  { id: "ALL", name: "All Industries" },
  { id: "Technology", name: "Technology" },
  { id: "Semiconductors", name: "Semiconductors" },
  { id: "E-Commerce", name: "E-Commerce" },
  { id: "Automotive", name: "Automotive" },
];

const ITEMS_PER_PAGE = 10;

export default function StockSearchListPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // 獲取 URL 查詢參數
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || ""); // 從 URL q 參數初始化
  const [selectedExchange, setSelectedExchange] = useState(
    searchParams.get("exchange") || "ALL"
  );
  const [selectedIndustry, setSelectedIndustry] = useState(
    searchParams.get("industry") || "ALL"
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );

  const [stocks, setStocks] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0); // 總股票數，用於分頁
  const [isLoading, setIsLoading] = useState(false);

  const [exchanges, setExchanges] = useState(mockExchanges); // 之後從 API 獲取
  const [industries, setIndustries] = useState(mockIndustries); // 之後從 API 獲取

  const totalPages = Math.ceil(totalStocks / ITEMS_PER_PAGE);

  // 獲取篩選器數據 (交易所、行業)
  useEffect(() => {
    // TODO: 從 API 獲取交易所和行業列表
    // setExchanges([...mockExchanges]);
    // setIndustries([...mockIndustries]);
  }, []);

  const buildApiParams = (page, query, exchange, industry) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (exchange && exchange !== "ALL") params.set("exchange", exchange);
    if (industry && industry !== "ALL") params.set("industry", industry);
    params.set("page", page.toString());
    params.set("limit", ITEMS_PER_PAGE.toString());
    return params;
  };

  // 核心的獲取股票數據函數
  const fetchStocksData = useCallback(
    async (page, query, exchange, industry) => {
      setIsLoading(true);
      const apiParams = buildApiParams(page, query, exchange, industry);
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
        // TODO: 呼叫 API 獲取股票列表，包含分頁和篩選參數
        // const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/stocks?page=${page}&limit=${ITEMS_PER_PAGE}&q=${encodeURIComponent(query)}&exchange=${exchange}&industry=${industry}`;
        // const response = await fetch(apiUrl);
        // if (!response.ok) throw new Error('Failed to fetch stocks');
        // const data = await response.json(); // API 應返回 { items: [...], total: ... }
        // setStocks(data.items);
        // setTotalStocks(data.total);
        // setCurrentPage(page);

        // 模擬 API
        await new Promise((resolve) => setTimeout(resolve, 500));
        let filteredStocks = mockStockList;
        if (query)
          filteredStocks = filteredStocks.filter(
            (s) =>
              s.symbol.toLowerCase().includes(query.toLowerCase()) ||
              s.name.toLowerCase().includes(query.toLowerCase())
          );
        if (industry && industry !== "ALL")
          filteredStocks = filteredStocks.filter(
            (s) => s.industry === industry
          );
        if (exchange && exchange !== "ALL") {
          /* 模擬交易所篩選 */
        }

        setTotalStocks(filteredStocks.length);
        const paginatedStocks = filteredStocks.slice(
          (page - 1) * ITEMS_PER_PAGE,
          page * ITEMS_PER_PAGE
        );
        setStocks(paginatedStocks);
        setCurrentPage(page); // 更新當前頁狀態
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
    debounce((currentSearchTerm, currentExchange, currentIndustry) => {
      fetchStocksData(1, currentSearchTerm, currentExchange, currentIndustry);
    }, 500),
    [fetchStocksData]
  );

  // Effect for searchTerm changes (user typing)
  useEffect(() => {
    // 只有當 searchTerm 與 URL 中的 'q' 不同時，才認為是手動輸入，觸發 debounce
    // 避免從 Navbar 跳轉過來時重複觸發
    const queryFromUrl = searchParams.get("q") || "";
    if (searchTerm !== queryFromUrl) {
      debouncedSearch(searchTerm, selectedExchange, selectedIndustry);
    }
  }, [
    searchTerm,
    selectedExchange,
    selectedIndustry,
    searchParams,
    debouncedSearch,
  ]);

  // Effect for initial load from URL or direct navigation
  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    const exchangeFromUrl = searchParams.get("exchange") || "ALL";
    const industryFromUrl = searchParams.get("industry") || "ALL";
    const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);

    // 設置狀態以匹配 URL，這樣 UI 和 URL 保持同步
    // 這些 setState 不會立即觸發上面的 searchTerm useEffect，因為我們有條件判斷
    setSearchTerm(queryFromUrl);
    setSelectedExchange(exchangeFromUrl);
    setSelectedIndustry(industryFromUrl);
    // setCurrentPage(pageFromUrl); // currentPage 由 fetchStocksData 內部設置

    // 初始載入時獲取數據
    fetchStocksData(
      pageFromUrl,
      queryFromUrl,
      exchangeFromUrl,
      industryFromUrl
    );
  }, []); // 空依賴數組，只在組件掛載時執行一次以同步 URL 參數

  // Handler for filter button
  const handleApplyFilters = () => {
    fetchStocksData(1, searchTerm, selectedExchange, selectedIndustry);
  };

  // Handler for page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      fetchStocksData(newPage, searchTerm, selectedExchange, selectedIndustry);
    }
  };

  const getCurrencySymbol = (currencyCode) => {
    if (currencyCode === "USD") return "$";
    if (currencyCode === "TWD") return "NT$";
    return "";
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
                htmlFor="exchange-filter"
                className="text-sm font-medium text-slate-300"
              >
                交易所
              </Label>
              <Select
                value={selectedExchange}
                onValueChange={setSelectedExchange}
              >
                <SelectTrigger
                  id="exchange-filter"
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                >
                  <SelectValue placeholder="所有交易所" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {exchanges.map((ex) => (
                    <SelectItem
                      key={ex.id}
                      value={ex.id}
                      className="hover:bg-slate-700 focus:bg-slate-700"
                    >
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <Label
                htmlFor="industry-filter"
                className="text-sm font-medium text-slate-300"
              >
                行業
              </Label>
              <Select
                value={selectedIndustry}
                onValueChange={setSelectedIndustry}
              >
                <SelectTrigger
                  id="industry-filter"
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                >
                  <SelectValue placeholder="所有行業" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {industries.map((ind) => (
                    <SelectItem
                      key={ind.id}
                      value={ind.id}
                      className="hover:bg-slate-700 focus:bg-slate-700"
                    >
                      {ind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleApplyFilters}
              className="mt-1 sm:mt-0 sm:self-end bg-blue-600 hover:bg-blue-700 sm:col-span-1 md:w-auto w-full"
            >
              <Filter className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 股票列表 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">搜尋結果</CardTitle>
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
                      <TableHead className="text-slate-400">
                        股票代號 (TICKER)
                      </TableHead>
                      <TableHead className="text-slate-400">
                        股票名稱 (NAME)
                      </TableHead>
                      <TableHead className="text-slate-400">
                        行業 (INDUSTRY)
                      </TableHead>
                      <TableHead className="text-right text-slate-400">
                        股價 (PRICE)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocks.map((stock) => (
                      <TableRow
                        key={stock.stock_id}
                        className="border-slate-700 hover:bg-slate-700/30"
                      >
                        <TableCell>
                          <Link
                            href={`/stocks/${stock.symbol}`}
                            className="font-medium text-blue-400 hover:underline"
                          >
                            {stock.symbol}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-100">
                          {stock.name}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {stock.industry}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-400">
                          {" "}
                          {/* 價格顏色可根據漲跌調整 */}
                          {getCurrencySymbol(stock.currency)}
                          {stock.price.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
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
