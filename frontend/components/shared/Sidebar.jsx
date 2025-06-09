"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutGrid,
  Search,
  Star,
  Briefcase,
  UserCircle,
  HelpCircle,
  TrendingUp,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/contexts/WatchlistContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { watchlistSummary, isLoading } = useWatchlist();

  // 格式化價格顯示
  const formatPrice = (price, currency) => {
    if (!price || price === 0) return "N/A";
    const symbol = currency === "USD" ? "$" : "NT$";
    return `${symbol}${price.toFixed(2)}`;
  };

  // 格式化漲跌幅
  const formatChange = (changePercent, isUp) => {
    if (!changePercent && changePercent !== 0) return "0.00%";
    const sign = isUp ? "+" : "";
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const mainNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/stocks", label: "Stock Search / List", icon: Search },
    { href: "/watchlist", label: "My Watchlist", icon: Star },
    { href: "/portfolios", label: "My Portfolios", icon: Briefcase },
  ];

  const userAccountItems = [
    { href: "/profile", label: "Personal Profile/Settings", icon: UserCircle },
  ];

  const supportItems = [{ href: "/help", label: "Help/FAQ", icon: HelpCircle }];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-700 bg-slate-800 text-slate-300 sm:flex">
      {/* Logo 和系統名稱 */}
      <div className="flex h-16 items-center border-b border-slate-700 px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold text-lg text-slate-50"
        >
          <TrendingUp className="h-7 w-7 text-blue-500" />
          <span>股票查詢系統</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* MY WATCHLIST SUMMARY */}
        {session?.user && (
          <div className="space-y-1">
            <h3 className="px-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              關注列表摘要
            </h3>
            {isLoading ? (
              <div className="px-2 py-2 text-xs text-slate-400">載入中...</div>
            ) : watchlistSummary.length > 0 ? (
              watchlistSummary.map((item) => (
                <Link
                  key={item.symbol}
                  href={`/stocks/${item.symbol}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-700/50"
                >
                  <div>
                    <span className="font-medium text-slate-200">
                      {item.symbol}
                    </span>
                    {item.name && (
                      <span className="ml-1 text-xs text-slate-400 truncate block max-w-[120px]">
                        {item.name}
                      </span>
                    )}
                    <p className="text-xs text-slate-400">
                      {formatPrice(item.current_price, item.currency)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold flex items-center",
                      item.is_up ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {item.is_up ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {formatChange(item.change_percent, item.is_up)}
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-2 py-2 text-xs text-slate-400">
                尚無關注股票
                <Link
                  href="/watchlist"
                  className="block text-blue-400 hover:underline mt-1"
                >
                  前往新增
                </Link>
              </div>
            )}
          </div>
        )}

        {/* MAIN NAVIGATION */}
        <div className="space-y-1">
          <h3 className="px-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Main Navigation
          </h3>
          {mainNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 transition-all hover:text-slate-50 hover:bg-slate-700",
                pathname === item.href &&
                  "bg-slate-700 text-slate-50 font-medium"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* USER ACCOUNT */}
        <div className="space-y-1">
          <h3 className="px-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            User Account
          </h3>
          {userAccountItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 transition-all hover:text-slate-50 hover:bg-slate-700",
                pathname === item.href &&
                  "bg-slate-700 text-slate-50 font-medium"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* SUPPORT - 放置在底部 */}
      <div className="mt-auto border-t border-slate-700 p-4 space-y-1">
        <h3 className="px-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Support
        </h3>
        {supportItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 transition-all hover:text-slate-50 hover:bg-slate-700",
              pathname === item.href && "bg-slate-700 text-slate-50 font-medium"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
