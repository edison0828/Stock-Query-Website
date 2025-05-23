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
} from "lucide-react";
import { signOut, useSession } from "next-auth/react"; // 引入 signOut
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/stocks?q=${encodeURIComponent(searchQuery.trim())}`);
      // setSearchQuery(""); // 可選：提交後清空搜尋框
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false }); // redirect: false 讓我們手動處理跳轉
    router.push("/login"); // 登出後跳轉到登入頁
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-700 bg-slate-800 px-4 md:px-6">
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

      {/* Search Bar (Centrally aligned on larger screens) */}
      <div className="flex-1 flex justify-center">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search for stocks (股票代號或公司名稱)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-700/80 pl-10 pr-4 py-2 text-sm border-slate-600 placeholder:text-slate-400 text-slate-100 focus:bg-slate-700 focus:border-blue-500"
          />
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
