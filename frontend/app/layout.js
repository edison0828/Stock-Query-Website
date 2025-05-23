// app/layout.jsx
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "./auth-provider"; // 引入 AuthProvider

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "股票查詢系統",
  description: "股票市場分析與投資組合追蹤系統",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {" "}
          {/* 包裹 ThemeProvider 和 children */}
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
