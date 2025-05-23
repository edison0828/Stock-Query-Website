// components/shared/Sidebar.jsx
"use client"; // 因為可能有客戶端互動，例如點擊高亮

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, // Dashboard Icon
  Search, // Stock Search Icon
  Star, // My Watchlist Icon
  Briefcase, // My Portfolios Icon
  UserCircle, // User Account Icon
  HelpCircle, // Help/FAQ Icon
  TrendingUp, // Logo Icon (代替了 Package2)
  ChevronUp, // 用於漲幅
  ChevronDown, // 用於跌幅
} from "lucide-react";
import { cn } from "@/lib/utils"; // Shadcn UI utility

// 模擬的關注列表摘要數據 (之後會從 API 獲取)
const mockWatchlistSummary = [
  { ticker: "AAPL", price: "$170.34", change: "+1.25%", isUp: true },
  {
    ticker: "2330",
    name: "台積電",
    price: "NT$600.00",
    change: "-0.83%",
    isUp: false,
  },
  { ticker: "GOOGL", price: "$2700.50", change: "+0.50%", isUp: true },
];

export default function Sidebar() {
  const pathname = usePathname();

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
        <div className="space-y-1">
          <h3 className="px-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            My Watchlist Summary
          </h3>
          {mockWatchlistSummary.map((item) => (
            <Link
              key={item.ticker}
              href={`/stocks/${item.ticker}`} // 假設股票詳細頁路由是 /stocks/[ticker]
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-700/50"
            >
              <div>
                <span className="font-medium text-slate-200">
                  {item.ticker}
                </span>
                {item.name && (
                  <span className="ml-1 text-xs text-slate-400">
                    ({item.name})
                  </span>
                )}
                <p className="text-xs text-slate-400">{item.price}</p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  item.isUp ? "text-green-400" : "text-red-400"
                )}
              >
                {item.change}
              </span>
            </Link>
          ))}
        </div>

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
