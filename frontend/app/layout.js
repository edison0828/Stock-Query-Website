import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "./auth-provider"; // 引入 AuthProvider
import { WatchlistProvider } from "@/contexts/WatchlistContext";

export const metadata = {
  title: "股票查詢系統",
  description: "股票市場分析與投資組合追蹤系統",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <WatchlistProvider>
            {" "}
            {/* 包裹 ThemeProvider 和 children */}
            {children}
          </WatchlistProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
