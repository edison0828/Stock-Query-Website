// app/(dashboard)/layout.jsx
import Navbar from "@/components/shared/Navbar";
import Sidebar from "@/components/shared/Sidebar";
import { redirect } from "next/navigation"; // 用於檢查登入狀態
import { getServerSession } from "next-auth/next"; // 用於在伺服器組件中獲取 session
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // 引入 authOptions

// 讓這個佈局可以非同步執行以獲取 session
export default async function DashboardLayout({ children }) {
  // 在伺服器端檢查登入狀態
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login"); // 如果未登入，導向到登入頁面
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-900 text-slate-200">
      {" "}
      {/* 主背景色 */}
      <Sidebar /> {/* 左側邊欄 */}
      <div className="flex flex-col sm:pl-64">
        {" "}
        {/* sm:pl-64 根據你的 Sidebar 寬度調整 */}
        <Navbar user={session.user} /> {/* 頂部導航欄，傳遞 user 資訊 */}
        <main className="flex-1 p-4 pt-6 md:p-6 md:pt-8 bg-slate-800/50">
          {" "}
          {/* 主內容區域背景和內距 */}
          {children} {/* 這裡會渲染具體的頁面內容 */}
        </main>
      </div>
    </div>
  );
}
