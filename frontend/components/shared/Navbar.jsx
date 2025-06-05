// components/shared/Navbar.jsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // 引入 Avatar
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu, // For mobile menu trigger
  Search,
  TrendingUp, // Logo Icon
  LogOut, // Logout Icon
  Settings, // Settings Icon
  User, // Profile Icon
  Loader2 as Spinner, // Loading Spinner
} from "lucide-react";
import { signOut, useSession } from "next-auth/react"; // 引入 signOut
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react"; // << 新增 useRef
import { debounce } from "lodash";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area"; // 引入 ScrollArea

// 假設你有一個函數來獲取使用者名稱的縮寫
const getInitials = (name) => {
  if (!name) return "U";
  const names = name.split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (
    names[0].charAt(0).toUpperCase() +
    names[names.length - 1].charAt(0).toUpperCase()
  );
};

export default function Navbar({ user }) {
  // 接收 user prop
  const router = useRouter();
  // const { data: session } = useSession(); // 如果需要更完整的 session
  // const currentUser = user || session?.user; // 優先使用 prop 傳入的 user
  const currentUser = user; // 直接使用從 layout 傳入的 user

  const { toast } = useToast(); // << 新增

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef(null); // << 新增: 用於檢測點擊外部

  // 點擊外部隱藏搜尋結果
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        // 至少輸入2個字元
        setSearchResults([]);
        setShowSearchResults(false); // 如果查詢太短，則隱藏
        setIsLoadingSearch(false);
        return;
      }
      setIsLoadingSearch(true);
      setShowSearchResults(true); // 顯示下拉框
      try {
        // 使用實際的 API
        const response = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) throw new Error("Failed to fetch search suggestions");
        const data = await response.json();

        // 轉換資料格式以符合 Navbar 的期望
        const formattedResults = data.map((stock) => ({
          stock_id: stock.stock_id,
          symbol: stock.tickerSymbol || stock.stock_id, // 使用 tickerSymbol 或 stock_id 作為 symbol
          name: stock.companyName || stock.company_name, // 使用 companyName 或 company_name 作為 name
        }));

        setSearchResults(formattedResults.slice(0, 7)); // 最多顯示7條建議
      } catch (error) {
        console.error("Error fetching search suggestions:", error);
        // toast({ variant: "destructive", title: "搜尋錯誤", description: "無法獲取搜尋建議。" }); // 可選
        setSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 300), // 300ms 防抖
    [] // toast 移除了，因為這裡可以不提示錯誤
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 0) {
      setShowSearchResults(true); // 輸入時就嘗試顯示（即使結果還沒回來）
    } else {
      setShowSearchResults(false); // 清空時隱藏
      setSearchResults([]);
    }
  };

  const handleSelectStock = (symbol) => {
    router.push(`/stocks/${encodeURIComponent(symbol.toUpperCase())}`);
    setSearchQuery(""); // 清空搜尋框
    setSearchResults([]);
    setShowSearchResults(false); // 隱藏建議列表
  };

  // 當用戶在搜尋框按下 Enter 時的行為
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      // 如果搜尋結果中有完全匹配代號的，優先跳轉那個
      const exactMatch = searchResults.find(
        (r) => r.symbol.toUpperCase() === query.toUpperCase()
      );
      if (exactMatch) {
        handleSelectStock(exactMatch.symbol);
      } else if (searchResults.length > 0) {
        // 如果沒有精確匹配，但有結果，跳轉到第一個結果的詳細頁
        handleSelectStock(searchResults[0].symbol);
      } else {
        // 如果沒有任何結果，可以選擇跳轉到列表頁或提示無結果
        router.push(`/stocks?q=${encodeURIComponent(query)}`); // 跳轉到列表頁進行更廣泛搜尋
        setSearchQuery("");
        setShowSearchResults(false);
      }
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false }); // redirect: false 讓我們手動處理跳轉
    router.push("/login"); // 登出後跳轉到登入頁
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-700 bg-slate-800 px-4 md:px-6">
      {/* Mobile Sidebar Trigger & Logo (visible on mobile, hidden on sm+) */}
      <div className="flex items-center sm:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="border-slate-600 hover:bg-slate-700"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="sm:max-w-xs bg-slate-800 border-slate-700 text-slate-300"
          >
            {/* Mobile Sidebar Content - 可以複製 Sidebar.jsx 的主要導航部分 */}
            <nav className="grid gap-6 text-lg font-medium py-6">
              <Link
                href="/dashboard"
                className="group flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-blue-600 text-lg font-semibold text-primary-foreground md:text-base"
              >
                <TrendingUp className="h-6 w-6 transition-all group-hover:scale-110" />
                <span className="sr-only">股票系統</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-4 px-2.5 hover:text-slate-50"
              >
                Dashboard
              </Link>
              <Link
                href="/stocks"
                className="flex items-center gap-4 px-2.5 hover:text-slate-50"
              >
                Stock Search
              </Link>
              <Link
                href="/watchlist"
                className="flex items-center gap-4 px-2.5 hover:text-slate-50"
              >
                My Watchlist
              </Link>
              <Link
                href="/portfolios"
                className="flex items-center gap-4 px-2.5 hover:text-slate-50"
              >
                My Portfolios
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-4 px-2.5 hover:text-slate-50"
              >
                Profile
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search Bar with Suggestions */}
      <div className="flex-1 flex justify-center" ref={searchContainerRef}>
        {" "}
        {/* 將 ref 附加到這裡 */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative w-full max-w-md group h-10"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <Input
            type="search"
            placeholder="搜尋股票代號或名稱..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            onFocus={() =>
              searchQuery &&
              searchResults.length > 0 &&
              setShowSearchResults(true)
            } // 聚焦時如果已有結果則顯示
            className="w-full rounded-lg bg-slate-700/80 pl-10 pr-4 py-2 text-sm border-slate-600 placeholder:text-slate-400 text-slate-100 focus:bg-slate-700 focus:border-blue-500"
          />
          {showSearchResults && (
            <div className="flex">
              <ScrollArea className="absolute z-20 w-full  mt-1 max-h-80 bg-slate-700 border border-slate-600 rounded-md shadow-lg">
                {isLoadingSearch && (
                  <div className="p-3 text-center text-slate-400 text-sm">
                    <Spinner className="inline animate-spin h-4 w-4 mr-2" />
                    搜尋中...
                  </div>
                )}
                {!isLoadingSearch &&
                  searchResults.length > 0 &&
                  searchResults.map((stock) => (
                    <div
                      key={stock.stock_id || stock.symbol}
                      onClick={() => handleSelectStock(stock.symbol)}
                      className="px-3 py-2.5 hover:bg-slate-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                    >
                      <p className="font-medium text-slate-100">
                        {stock.symbol}
                      </p>
                      <p className="text-xs text-slate-400">{stock.name}</p>
                    </div>
                  ))}
                {!isLoadingSearch &&
                  searchResults.length === 0 &&
                  searchQuery.length >= 2 && (
                    <div className="p-3 text-center text-slate-400 text-sm">
                      找不到符合 "{searchQuery}" 的建議。
                    </div>
                  )}
              </ScrollArea>
            </div>
          )}
        </form>
      </div>

      {/* User Menu */}
      {currentUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost" // 改為 ghost 以更好地融合
              size="icon"
              className="overflow-hidden rounded-full w-10 h-10 hover:bg-slate-700/50"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={currentUser.image || undefined}
                  alt={currentUser.name || "User"}
                />
                <AvatarFallback className="bg-slate-600 text-slate-300">
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-slate-800 border-slate-700 text-slate-200"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-50">
                  {currentUser.name || "User"}
                </p>
                <p className="text-xs leading-none text-slate-400">
                  {currentUser.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              asChild
              className="hover:bg-slate-700/80 cursor-pointer"
            >
              <Link href="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>個人資料</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="hover:bg-slate-700/80 cursor-pointer"
            >
              <Link href="/settings" className="flex items-center">
                {" "}
                {/* 假設有設定頁 */}
                <Settings className="mr-2 h-4 w-4" />
                <span>設定</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer focus:bg-red-500/20 focus:text-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>登出</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          asChild
          variant="outline"
          className="border-slate-600 hover:bg-slate-700"
        >
          <Link href="/login">登入</Link>
        </Button>
      )}
    </header>
  );
}
