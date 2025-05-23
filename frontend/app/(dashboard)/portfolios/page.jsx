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

// 模擬的投資組合數據 (之後會從 API 獲取)
const mockInitialPortfolios = [
  {
    id: "pf1",
    name: "積極成長型組合",
    total_value: 125876.5,
    currency: "USD",
    today_pnl: 1234.56,
    today_pnl_percent: 0.99,
    is_pnl_up: true,
    description: "專注於高增長潛力的科技股和新興市場股票。",
  },
  {
    id: "pf2",
    name: "穩健收益型組合",
    total_value: 88430.1,
    currency: "USD",
    today_pnl: -250.7,
    today_pnl_percent: -0.28,
    is_pnl_up: false,
    description: "以大型藍籌股和固定收益產品為主，追求穩定現金流。",
  },
  {
    id: "pf3",
    name: "科技股觀察組合",
    total_value: 0,
    currency: "USD",
    today_pnl: 0,
    today_pnl_percent: 0,
    is_pnl_up: true,
    description: "此組合僅用於觀察，未包含實際持倉價值。",
  },
  {
    id: "pf4",
    name: "退休儲蓄計劃",
    total_value: 250000.0,
    currency: "USD",
    today_pnl: 500.0,
    today_pnl_percent: 0.2,
    is_pnl_up: true,
    description: "長期投資組合，為退休生活做準備。",
  },
];

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
      // TODO: 呼叫 API 獲取用戶的投資組合列表
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/portfolios`);
      // if (!response.ok) throw new Error('Failed to fetch portfolios');
      // const data = await response.json();
      // setPortfolios(data);

      await new Promise((resolve) => setTimeout(resolve, 700));
      setPortfolios(mockInitialPortfolios);
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
  }, [toast]); // toast 放入依賴以避免 ESLint 警告，實際可以移除

  const handlePortfolioCreated = (newPortfolio) => {
    // setPortfolios(prev => [newPortfolio, ...prev]); // 將新組合加到列表頂部
    fetchPortfolios(); // 或者直接重新獲取整個列表以確保數據一致性
    setIsCreateDialogOpen(false);
  };

  const handlePortfolioRenamed = (updatedPortfolio) => {
    // setPortfolios(prev => prev.map(p => p.id === updatedPortfolio.id ? updatedPortfolio : p));
    fetchPortfolios();
    setIsRenameDialogOpen(false);
    setSelectedPortfolio(null);
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolio) return;
    // TODO: 呼叫 API 刪除投資組合
    // try {
    //   const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/portfolios/${selectedPortfolio.id}`, { method: 'DELETE' });
    //   if (!response.ok) throw new Error('Failed to delete portfolio');
    //   setPortfolios(prev => prev.filter(p => p.id !== selectedPortfolio.id));
    //   toast({ title: "成功", description: `投資組合 "${selectedPortfolio.name}" 已刪除。` });
    // } catch (error) {
    //   toast({ variant: "destructive", title: "刪除失敗", description: error.message });
    // } finally {
    //   setIsDeleteDialogOpen(false);
    //   setSelectedPortfolio(null);
    // }

    await new Promise((resolve) => setTimeout(resolve, 500)); // 模擬 API
    setPortfolios((prev) => prev.filter((p) => p.id !== selectedPortfolio.id));
    toast({
      title: "成功",
      description: `投資組合 "${selectedPortfolio.name}" 已刪除。`,
    });
    setIsDeleteDialogOpen(false);
    setSelectedPortfolio(null);
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
