"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString("zh-TW");
}

function roleBadgeClass(role) {
  if (role === "admin") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-100";
  }

  return "border-slate-500/30 bg-slate-700 text-slate-200";
}

const emptyPagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
};

export default function AdminUsersClient() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [adminCount, setAdminCount] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role: "user",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredAdminCount = useMemo(
    () => users.filter((user) => user.role === "admin").length,
    [users]
  );

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
        role: roleFilter,
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "無法載入使用者清單");
      }

      setUsers(data.users || []);
      setPagination(data.pagination || emptyPagination);
      setCurrentUserId(data.current_user_id || null);
      setAdminCount(data.admin_count || 0);
    } catch (error) {
      console.error("Error loading admin users:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, pagination.pageSize, roleFilter, search, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (page === 1) {
      fetchUsers();
    } else {
      setPage(1);
    }
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
    });
  };

  const handleSave = async () => {
    if (!editingUser) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${editingUser.user_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "更新帳號失敗");
      }

      toast({
        title: "帳號已更新",
        description: `${data.user.username} 的資料已儲存`,
      });
      setEditingUser(null);
      await fetchUsers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.user_id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "刪除帳號失敗");
      }

      toast({
        title: "帳號已刪除",
        description: `${userToDelete.username} 已從系統移除`,
      });
      setUserToDelete(null);
      if (users.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await fetchUsers();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
              <ShieldCheck className="h-4 w-4" />
              Admin Console
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">
              帳號管理
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              管理使用者基本資料、角色權限與帳號刪除。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={fetchUsers}
            disabled={isLoading}
            className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            重新整理
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">
                符合條件帳號
              </CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-5 w-5 text-blue-300" />
                {pagination.total}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">
                系統管理員
              </CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                {adminCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">
                本頁管理員
              </CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UserCog className="h-5 w-5 text-amber-300" />
                {filteredAdminCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>使用者清單</CardTitle>
            <CardDescription className="text-slate-400">
              搜尋 email 或 username，並可調整角色或刪除帳號。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={handleSearchSubmit}
              className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜尋 username 或 email"
                  className="border-slate-700 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100">
                  <SelectValue placeholder="角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  <SelectItem value="admin">管理員</SelectItem>
                  <SelectItem value="user">一般使用者</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                搜尋
              </Button>
            </form>

            <div className="rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">帳號</TableHead>
                    <TableHead className="text-slate-400">角色</TableHead>
                    <TableHead className="text-slate-400">登入方式</TableHead>
                    <TableHead className="text-slate-400">使用資料</TableHead>
                    <TableHead className="text-slate-400">建立/登入</TableHead>
                    <TableHead className="text-right text-slate-400">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={6} className="py-10 text-center">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-300" />
                        <span className="text-slate-400">載入中...</span>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-slate-400"
                      >
                        沒有符合條件的帳號
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow
                        key={user.user_id}
                        className="border-slate-800 hover:bg-slate-800/50"
                      >
                        <TableCell>
                          <div className="font-medium text-slate-100">
                            {user.username}
                            {user.user_id === currentUserId && (
                              <span className="ml-2 text-xs text-blue-300">
                                目前登入
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleBadgeClass(user.role)}>
                            {user.role === "admin" ? "管理員" : "一般使用者"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {user.provider}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          投資組合 {user.counts.portfolios} / 關注{" "}
                          {user.counts.watchlistitems}
                          <br />
                          警示 {user.counts.alertrules} / 回測{" "}
                          {user.counts.backtestruns}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          建立 {formatDateTime(user.created_at)}
                          <br />
                          登入 {formatDateTime(user.last_login)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => openEditDialog(user)}
                              className="h-9 w-9 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                              title="編輯帳號"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => setUserToDelete(user)}
                              disabled={user.user_id === currentUserId}
                              className="h-9 w-9 border-red-900/60 bg-red-950/20 text-red-300 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                              title="刪除帳號"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                第 {pagination.page} / {pagination.totalPages} 頁，共{" "}
                {pagination.total} 筆
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                >
                  上一頁
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= pagination.totalPages || isLoading}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(current + 1, pagination.totalPages)
                    )
                  }
                  className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                >
                  下一頁
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(editingUser)} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>編輯帳號</DialogTitle>
            <DialogDescription className="text-slate-400">
              更新使用者基本資料與角色權限。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">使用者名稱</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm((current) => ({ ...current, role: value }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">一般使用者</SelectItem>
                  <SelectItem value="admin">管理員</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingUser(null)}
              className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={() => setUserToDelete(null)}
      >
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>刪除帳號</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              這會刪除 {userToDelete?.username} 和相關個人資料，包含投資組合、關注清單、警示與回測紀錄。此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
