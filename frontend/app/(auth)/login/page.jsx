// app/(auth)/login/page.jsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react"; // 確保 useEffect 被引入
import { signIn, useSession } from "next-auth/react";
import { useRouter, redirect, useSearchParams } from "next/navigation"; // redirect 和 useSearchParams 也引入
import { Mail, Lock, TrendingUp, Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // 假設路徑正確

export default function LoginPage() {
  // --- 1. 所有 State Hooks 和其他 Hooks 在頂層無條件聲明 ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null); // 用於表單提交時的錯誤

  const router = useRouter();
  // const searchParams = useSearchParams();
  const { data: session, status } = useSession(); // status: "loading", "authenticated", "unauthenticated"
  const { toast } = useToast();

  // // --- 2. 使用 useEffect 處理副作用 ---
  // useEffect(() => {
  //   // 處理來自 URL 的錯誤參數 (例如 NextAuth.js pages.error 跳轉過來的)
  //   const errorFromUrl = searchParams.get("error");
  //   if (errorFromUrl && !formError) {
  //     // 只有在本地 formError 為空時才從 URL 設置
  //     let errorMessage = "";
  //     switch (errorFromUrl) {
  //       case "CredentialsSignin":
  //         errorMessage = "電子郵件或密碼錯誤。";
  //         break;
  //       // 可以根據需要添加更多 NextAuth.js 錯誤代碼的處理
  //       default:
  //         errorMessage = decodeURIComponent(errorFromUrl); // 處理自訂錯誤
  //     }
  //     setFormError(errorMessage); // 更新錯誤狀態
  //     // toast({ variant: "destructive", title: "登入提示", description: errorMessage }); // 可以選擇是否在這裡 toast
  //   }
  // }, [searchParams, formError, toast]); // 依賴項

  useEffect(() => {
    // 處理已認證用戶的跳轉
    if (status === "authenticated") {
      // 這裡使用 redirect 而不是 router.push, 因為 redirect 設計用於中止當前渲染流程
      redirect("/dashboard");
    }
  }, [status]); // 只依賴 status

  // --- 3. 事件處理函數 ---
  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null); // 清除之前的表單錯誤
    try {
      const result = await signIn("credentials", {
        redirect: false, // 關鍵：保持 false，以便在客戶端處理錯誤和成功跳轉
        email,
        password,
      });

      if (result?.error) {
        const errorMessage =
          result.error === "CredentialsSignin"
            ? "電子郵件或密碼錯誤，請重試。"
            : result.error;
        setFormError(errorMessage); // 設置表單錯誤
        toast({
          variant: "destructive",
          title: "登入失敗",
          description: errorMessage,
        });
        setLoading(false);
      } else if (result?.ok && !result.error) {
        // 登入成功，手動跳轉
        // 注意：此時 session status 可能還未立即更新為 'authenticated'
        // 但 NextAuth 已經建立了 session，直接跳轉通常是安全的
        // Dashboard 頁面自身的 session 狀態檢查 (useSession({required: true})) 會處理後續
        router.push(result.url || "/dashboard"); // result.url 通常是 callbackUrl
        // 成功跳轉後，此組件會卸載，setLoading(false) 的影響不大
      } else {
        const unknownError = "登入時發生未知問題，請檢查您的憑證。";
        setFormError(unknownError);
        toast({
          variant: "destructive",
          title: "登入失敗",
          description: unknownError,
        });
        setLoading(false);
      }
    } catch (err) {
      console.error("Login page submission error:", err);
      const networkError = "登入請求失敗，請檢查網路連線。";
      setFormError(networkError);
      toast({
        variant: "destructive",
        title: "登入錯誤",
        description: networkError,
      });
      setLoading(false);
    }
    // 不需要 finally 中的 setLoading(false)，因為各個分支都處理了
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setFormError(null);
    // Google 登入會自動處理跳轉，成功後 status 會更新，useEffect 會處理 redirect
    await signIn("google", { callbackUrl: "/dashboard" });
    // 如果用戶取消 Google 登入，會返回此頁面，此時 loading 可能是 true
    // 可以在頁面焦點事件或 unmount 時重置 loading，但通常影響不大
    // setLoading(false); // 這裡的 setLoading(false) 可能不會按預期工作
  };

  // --- 4. 條件渲染 (用於加載狀態) ---
  // 這個判斷放在所有 Hooks 調用之後
  if (status === "loading") {
    // 只檢查 useSession 的 loading 狀態
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-300">正在檢查登入狀態...</p>
      </div>
    );
  }

  // --- 5. 主要 JSX 渲染 ---
  // 如果 status === "authenticated"，上面的 useEffect 應該已經觸發了 redirect，
  // 所以理論上不會執行到這裡的 return。
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader className="items-center text-center">
          <TrendingUp className="h-12 w-12 text-blue-500 mb-2" />
          <CardTitle className="text-3xl font-bold text-slate-50">
            股票查詢系統
          </CardTitle>
          <CardDescription className="text-slate-400">
            歡迎回來，請登入您的帳戶
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCredentialsLogin}>
          <CardContent className="grid gap-y-6">
            {/* 顯示表單提交時的錯誤 */}
            {formError && (
              <div className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm">
                {formError}
              </div>
            )}
            {/* ... Input 欄位 (保持不變) ... */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-300">
                電子郵件
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-slate-300">
                密碼
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked)}
                  className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-slate-50"
                />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-400"
                >
                  記住我
                </Label>
              </div>
              <Link href="#" className="text-sm text-blue-500 hover:underline">
                忘記密碼?
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading} // 只根據本地 loading 狀態禁用
            >
              {loading ? "登入中..." : "登入"}
            </Button>
          </CardContent>
        </form>

        {/* ... 分隔線和 Google 登入按鈕 (保持不變，但 disabled 也可以只看本地 loading) ... */}
        <div className="relative my-2 px-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-800 px-2 text-slate-500">或</span>
          </div>
        </div>
        <CardFooter className="flex flex-col gap-4 pt-4">
          <Button
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300"
            onClick={handleGoogleLogin}
            disabled={loading} // 只根據本地 loading 狀態禁用
          >
            {loading ? (
              "處理中..."
            ) : (
              <>
                <Chrome className="mr-2 h-4 w-4" /> 使用Google登入
              </>
            )}
          </Button>
          <div className="text-center text-sm text-slate-400">
            還沒有帳戶?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-500 hover:underline"
            >
              註冊
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
