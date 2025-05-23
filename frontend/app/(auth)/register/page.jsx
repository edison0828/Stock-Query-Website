// app/(auth)/register/page.jsx
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
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Lock, User } from "lucide-react"; // 引入圖示
import { useToast } from "@/hooks/use-toast"; // 引入 useToast

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // 用於顯示主要錯誤
  const [fieldErrors, setFieldErrors] = useState({}); // 用於顯示欄位特定錯誤
  const router = useRouter();
  const { toast } = useToast(); // 初始化 toast

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError("密碼與確認密碼不一致。");
      setFieldErrors({ confirmPassword: "密碼與確認密碼不一致。" });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      // 簡單的密碼長度檢查
      setError("密碼長度至少需要6個字元。");
      setFieldErrors({ password: "密碼長度至少需要6個字元。" });
      setLoading(false);
      return;
    }

    try {
      // 替換成你的 FastAPI 後端註冊 API 端點 URL
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/users/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // 後端應該返回包含 'detail' 的錯誤訊息
        const errorMessage =
          data.detail || `註冊失敗 (狀態碼: ${response.status})`;
        setError(errorMessage);
        // 如果後端返回更詳細的欄位錯誤，可以在這裡處理
        // 例如：if (data.errors) setFieldErrors(data.errors);
        toast({
          // 使用 Toast 顯示錯誤
          variant: "destructive",
          title: "註冊失敗",
          description: errorMessage,
        });
      } else {
        // 註冊成功
        toast({
          // 使用 Toast 顯示成功訊息
          title: "註冊成功！",
          description: "您現在可以使用您的帳號登入。",
        });
        router.push("/login"); // 註冊成功後跳轉到登入頁面
      }
    } catch (err) {
      console.error("Registration error:", err);
      const networkError = "發生網路錯誤或無法連接到伺服器，請稍後再試。";
      setError(networkError);
      toast({
        // 使用 Toast 顯示網路錯誤
        variant: "destructive",
        title: "註冊錯誤",
        description: networkError,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader className="items-center text-center">
          <UserPlus className="h-12 w-12 text-blue-500 mb-2" />
          <CardTitle className="text-3xl font-bold text-slate-50">
            建立帳戶
          </CardTitle>
          <CardDescription className="text-slate-400">
            填寫以下資訊以完成註冊。
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-y-6">
            {error &&
              !Object.keys(fieldErrors).length && ( // 只有在沒有欄位特定錯誤時顯示通用錯誤
                <div className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
            <div className="grid gap-2">
              <Label htmlFor="username" className="text-slate-300">
                用戶名
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="username"
                  placeholder="例如：JohnDoe123"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 ${
                    fieldErrors.username ? "border-red-500" : ""
                  }`}
                />
              </div>
              {fieldErrors.username && (
                <p className="text-xs text-red-400 mt-1">
                  {fieldErrors.username}
                </p>
              )}
            </div>
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
                  className={`pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 ${
                    fieldErrors.email ? "border-red-500" : ""
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>
              )}
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
                  placeholder="•••••••• (至少6個字元)"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 ${
                    fieldErrors.password ? "border-red-500" : ""
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-400 mt-1">
                  {fieldErrors.password}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password" className="text-slate-300">
                確認密碼
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 ${
                    fieldErrors.confirmPassword ? "border-red-500" : ""
                  }`}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? "註冊中..." : "建立帳戶"}
            </Button>
          </CardContent>
        </form>
        <CardFooter className="flex flex-col gap-4 pt-4">
          <div className="text-center text-sm text-slate-400">
            已經有帳戶了?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-500 hover:underline"
            >
              登入
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
