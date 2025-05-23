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
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, redirect } from "next/navigation";
import { Mail, Lock, TrendingUp, Chrome } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    redirect("/dashboard");
  }

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError("Email 或密碼錯誤，請重試。");
        } else {
          setError(result.error);
        }
        setLoading(false);
      } else if (result?.ok) {
        router.push("/dashboard");
      } else {
        setError("登入失敗，請稍後再試。");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("發生未知錯誤，請稍後再試。");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  if (status === "loading" && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        載入中...
      </div>
    );
  }

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
            {error && (
              <div className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
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
              disabled={loading}
            >
              {loading && email ? "登入中..." : "登入"}
            </Button>
          </CardContent>
        </form>

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
            disabled={loading}
          >
            {loading && !email ? (
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
