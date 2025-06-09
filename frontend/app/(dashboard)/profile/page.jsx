// app/(dashboard)/profile/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // 用於獲取當前用戶資訊
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"; // 用於分隔
import { useToast } from "@/hooks/use-toast"; // 用於顯示通知
import {
  Eye,
  EyeOff,
  KeyRound,
  UserCircle,
  Mail,
  Loader2 as Spinner,
} from "lucide-react";

export default function ProfileSettingsPage() {
  const { data: session, status, update: updateSession } = useSession(); // update 用於在客戶端更新 session (例如密碼更改後)
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const user = session?.user;

  // 假設 session.user 中有 provider 信息
  // const authProvider = session?.user?.provider; // 例如 'credentials' 或 'google'

  // 為了演示，我們假設有一個模擬的 provider 狀態
  const [authProvider, setAuthProvider] = useState("credentials"); // 'credentials' or 'google'

  useEffect(() => {
    if (session?.user) {
      // 模擬從 session 獲取 provider，實際應用中 NextAuth.js session 回呼配置
      // 假設 session.user.provider 存在
      setAuthProvider(session.user.provider || "credentials");
    }
  }, [session]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword !== confirmNewPassword) {
      setPasswordError("新密碼與確認密碼不一致。");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("新密碼長度至少需要6個字元。");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("新密碼不能與舊密碼相同。");
      return;
    }

    setIsPasswordLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "密碼修改失敗");
      }

      toast({
        title: "成功",
        description: data.message || "您的密碼已成功修改。",
      });

      // 清空表單
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Change password error:", error);
      setPasswordError(error.message);
      toast({
        variant: "destructive",
        title: "密碼修改失敗",
        description: error.message,
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    // 理論上 DashboardLayout 會處理未登入的情況，但這裡多一層保護
    return (
      <div className="text-center p-8 text-red-500">
        請先登入以查看個人資料。
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold text-slate-50">個人資料 / 設定</h1>

      {/* 帳戶資訊 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100 flex items-center">
            <UserCircle className="mr-2 h-5 w-5 text-blue-400" /> 帳戶資訊
          </CardTitle>
          <CardDescription className="text-slate-400">
            您的基本帳戶詳情。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <Label htmlFor="username" className="w-24 text-slate-400 shrink-0">
              用戶名
            </Label>
            <Input
              id="username"
              value={user.name || "N/A"}
              readOnly
              disabled
              className="bg-slate-700/50 border-slate-600 text-slate-300 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center">
            <Label htmlFor="email" className="w-24 text-slate-400 shrink-0">
              電子郵件
            </Label>
            <Input
              id="email"
              value={user.email || "N/A"}
              readOnly
              disabled
              className="bg-slate-700/50 border-slate-600 text-slate-300 cursor-not-allowed"
            />
          </div>
        </CardContent>
      </Card>

      {authProvider === "credentials" ? (
        <>
          <Separator className="bg-slate-700" />

          {/* 修改密碼 */}
          <Card className="bg-slate-800 border-slate-700 text-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-100 flex items-center">
                <KeyRound className="mr-2 h-5 w-5 text-blue-400" /> 修改密碼
              </CardTitle>
              <CardDescription className="text-slate-400">
                定期更新您的密碼以增強帳戶安全。
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                {passwordError && (
                  <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-md">
                    {passwordError}
                  </p>
                )}
                <div className="space-y-1 relative">
                  <Label htmlFor="current-password" className="text-slate-300">
                    目前密碼
                  </Label>
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 pr-10"
                    placeholder="輸入您目前的密碼"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-7 h-7 w-7 text-slate-400 hover:text-slate-100"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="space-y-1 relative">
                  <Label htmlFor="new-password" className="text-slate-300">
                    新密碼
                  </Label>
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 pr-10"
                    placeholder="至少6個字元"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-7 h-7 w-7 text-slate-400 hover:text-slate-100"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="space-y-1 relative">
                  <Label
                    htmlFor="confirm-new-password"
                    className="text-slate-300"
                  >
                    確認新密碼
                  </Label>
                  <Input
                    id="confirm-new-password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 pr-10"
                    placeholder="再次輸入新密碼"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-7 h-7 w-7 text-slate-400 hover:text-slate-100"
                    onClick={() =>
                      setShowConfirmNewPassword(!showConfirmNewPassword)
                    }
                  >
                    {showConfirmNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={isPasswordLoading}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  {isPasswordLoading ? (
                    <Spinner className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  {isPasswordLoading ? "儲存中..." : "儲存密碼"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </>
      ) : (
        <>
          <Separator className="bg-slate-700" />
          <Card className="bg-slate-800 border-slate-700 text-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-100 flex items-center">
                <KeyRound className="mr-2 h-5 w-5 text-blue-400" /> 密碼管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                您目前是使用{" "}
                {authProvider === "google" ? "Google" : authProvider} 帳戶登入。
                如需修改密碼，請前往您的{" "}
                <a
                  href={
                    authProvider === "google"
                      ? "https://myaccount.google.com/security"
                      : "#"
                  } // 根據 provider 提供不同連結
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {authProvider === "google"
                    ? "Google 帳戶設定"
                    : `${authProvider} 帳戶設定`}
                </a>
                。
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
