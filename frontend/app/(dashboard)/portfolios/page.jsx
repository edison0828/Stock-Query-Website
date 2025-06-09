// app/(dashboard)/portfolios/page.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // 用於卡片右上角的操作選單
import {
  PlusCircle,
  Eye,
  Edit3,
  Trash2,
  MoreVertical,
  Info,
  Loader2 as Spinner,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import CreatePortfolioDialog from "@/components/portfolios/CreatePortfolioDialog"; // << 新建組合的彈窗
import RenamePortfolioDialog from "@/components/portfolios/RenamePortfolioDialog"; // << 重命名組合的彈窗

export default function MyPortfoliosPage() {
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null); // 用於重命名和刪除
  const { toast } = useToast();

  const fetchPortfolios = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/portfolios");
      if (!response.ok) {
        throw new Error("Failed to fetch portfolios");
      }
      const data = await response.json();
      setPortfolios(data);
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "無法獲取投資組合列表。",
      });
      setPortfolios([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const handlePortfolioCreated = (newPortfolio) => {
    fetchPortfolios(); // 重新獲取列表
    setIsCreateDialogOpen(false);
  };

  const handlePortfolioRenamed = (updatedPortfolio) => {
    console.log("收到更新的投資組合:", updatedPortfolio);

    // 直接更新本地狀態，不要再發送 API 請求
    setPortfolios((prev) =>
      prev.map((p) =>
        p.portfolio_id === updatedPortfolio.portfolio_id
          ? {
              ...p,
              name: updatedPortfolio.name,
              description: updatedPortfolio.description,
            }
          : p
      )
    );

    setIsRenameDialogOpen(false);
    setSelectedPortfolio(null);
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolio) return;

    try {
      const response = await fetch(
        `/api/portfolios/${selectedPortfolio.portfolio_id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete portfolio");
      }

      toast({
        title: "成功",
        description: `投資組合 "${selectedPortfolio.name}" 已刪除。`,
      });

      // 從本地狀態移除已刪除的投資組合
      setPortfolios((prev) =>
        prev.filter((p) => p.portfolio_id !== selectedPortfolio.portfolio_id)
      );

      setIsDeleteDialogOpen(false);
      setSelectedPortfolio(null);
    } catch (error) {
      console.error("刪除投資組合失敗:", error);
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: error.message,
      });
    }
  };

  const openRenameDialog = (portfolio) => {
    setSelectedPortfolio(portfolio);
    setIsRenameDialogOpen(true);
  };

  const openDeleteDialog = (portfolio) => {
    setSelectedPortfolio(portfolio);
    setIsDeleteDialogOpen(true);
  };

  const getCurrencySymbol = (currencyCode) => {
    if (currencyCode === "USD") return "$";
    return currencyCode ? `${currencyCode} ` : "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-50">My Portfolios</h1>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          建立新組合
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map(
            (
              _,
              i // 骨架屏
            ) => (
              <Card
                key={i}
                className="bg-slate-800 border-slate-700 animate-pulse"
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-6 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-8 bg-slate-700 rounded w-2/3"></div>
                  <div className="h-5 bg-slate-700 rounded w-1/3"></div>
                </CardContent>
                <CardFooter>
                  <div className="h-10 bg-slate-700 rounded w-full"></div>
                </CardFooter>
              </Card>
            )
          )}
        </div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-10 bg-slate-800 border border-slate-700 rounded-lg">
          <Info className="mx-auto h-12 w-12 text-slate-500 mb-3" />
          <p className="text-slate-400">您尚未建立任何投資組合。</p>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            variant="link"
            className="mt-2 text-blue-400"
          >
            立即建立一個
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <Card
              key={portfolio.id}
              className="bg-slate-800 border-slate-700 text-slate-200 flex flex-col"
            >
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <CardTitle className="text-xl font-semibold text-slate-100">
                  {portfolio.name}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  >
                    <DropdownMenuItem
                      onClick={() => openRenameDialog(portfolio)}
                      className="hover:bg-slate-700/80 cursor-pointer"
                    >
                      <Edit3 className="mr-2 h-4 w-4" /> 重命名
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(portfolio)}
                      className="text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer focus:bg-red-500/20 focus:text-red-300"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> 刪除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                {portfolio.total_value > 0 ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-400">總市值</p>
                      <p className="text-2xl font-bold text-slate-50">
                        {getCurrencySymbol(portfolio.currency)}
                        {portfolio.total_value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">今日損益</p>
                      <p
                        className={`text-lg font-semibold ${
                          portfolio.is_pnl_up
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {portfolio.is_pnl_up ? (
                          <TrendingUp className="inline h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="inline h-4 w-4 mr-1" />
                        )}
                        {portfolio.is_pnl_up ? "+" : ""}
                        {getCurrencySymbol(portfolio.currency)}
                        {portfolio.today_pnl.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ({portfolio.is_pnl_up ? "+" : ""}
                        {portfolio.today_pnl_percent.toFixed(2)}%)
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed min-h-[70px]">
                    {" "}
                    {/* 保持最小高度 */}
                    {portfolio.description || "此組合目前沒有持倉或價值。"}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Link href={`/portfolios/${portfolio.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> 查看詳情
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CreatePortfolioDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onPortfolioCreated={handlePortfolioCreated}
      />
      {selectedPortfolio && (
        <RenamePortfolioDialog
          isOpen={isRenameDialogOpen}
          onClose={() => {
            setIsRenameDialogOpen(false);
            setSelectedPortfolio(null);
          }}
          portfolio={selectedPortfolio}
          onPortfolioRenamed={handlePortfolioRenamed}
        />
      )}
      {selectedPortfolio && (
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsDeleteDialogOpen(false);
              setSelectedPortfolio(null);
            }
          }}
        >
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-slate-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-50">
                確認刪除投資組合
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                您確定要刪除投資組合 "{selectedPortfolio?.name}"
                嗎？此操作將一併刪除所有相關交易記錄，且無法復原。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-slate-600 hover:bg-slate-700 text-slate-800">
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePortfolio}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                確認刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
