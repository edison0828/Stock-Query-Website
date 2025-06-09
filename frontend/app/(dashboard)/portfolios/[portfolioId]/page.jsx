// app/(dashboard)/portfolios/[portfolioId]/page.jsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  Info,
  Loader2 as Spinner,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TradeDialog from "@/components/shared/TradeDialog";

// 移除模擬數據 - 刪除 mockPortfolioDetail 和相關常數

const summaryCardData = (portfolioData) => [
  {
    title: "總市值",
    value: portfolioData?.summary?.total_market_value,
    isPnl: false,
    currency: portfolioData?.currency,
  },
  {
    title: "總成本",
    value: portfolioData?.summary?.total_cost_basis,
    isPnl: false,
    currency: portfolioData?.currency,
  },
  {
    title: "未實現損益",
    value: portfolioData?.summary?.unrealized_pnl,
    percent: portfolioData?.summary?.unrealized_pnl_percent,
    isPnl: true,
    currency: portfolioData?.currency,
  },
  {
    title: "已實現損益",
    value: portfolioData?.summary?.realized_pnl || 0,
    isPnl: true,
    isRealized: true,
    currency: portfolioData?.currency,
  },
];

function PortfolioDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const portfolioId = params.portfolioId;
  const { toast } = useToast();

  const [portfolioData, setPortfolioData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [selectedStockForTrade, setSelectedStockForTrade] = useState(null);
  const [tradeDialogInitialAction, setTradeDialogInitialAction] =
    useState("BUY");

  const fetchPortfolioDetails = async () => {
    if (!portfolioId) return;
    setIsLoading(true);
    setError(null);

    try {
      // 使用真實 API
      const response = await fetch(`/api/portfolios/${portfolioId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("找不到此投資組合，可能已被刪除或您無權限存取。");
        } else if (response.status === 401) {
          throw new Error("您需要先登入才能查看投資組合。");
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "載入投資組合詳細資訊失敗");
        }
      }

      const data = await response.json();

      // 格式化數據以符合前端期望的格式
      const formattedData = {
        id: data.id,
        portfolio_id: data.portfolio_id,
        name: data.name,
        description: data.description,
        currency: determineCurrency(data.holdings), // 根據持倉判斷主要貨幣
        created_at: data.created_at,
        summary: {
          total_market_value: data.summary.total_market_value || 0,
          total_cost_basis: data.summary.total_cost_basis || 0,
          unrealized_pnl: data.summary.unrealized_pnl || 0,
          unrealized_pnl_percent: data.summary.unrealized_pnl_percent || 0,
          realized_pnl: data.summary.realized_pnl || 0,
        },
        holdings: formatHoldings(data.holdings || []),
        transactions: formatTransactions(data.transactions || []),
      };

      setPortfolioData(formattedData);
    } catch (err) {
      console.error("Error fetching portfolio details:", err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "載入錯誤",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 根據持倉判斷主要貨幣
  const determineCurrency = (holdings) => {
    if (!holdings || holdings.length === 0) return "TWD";
    // 使用第一個持倉的貨幣，或者可以根據市值最大的持倉來決定
    return holdings[0]?.currency || "TWD";
  };

  // 格式化持倉數據
  const formatHoldings = (holdings) => {
    return holdings.map((holding) => ({
      stock_id: holding.stock_id,
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity,
      avg_cost_price: holding.avgPrice,
      current_price: holding.currentPrice || 0,
      market_value: holding.currentValue || 0,
      unrealized_pnl: holding.unrealizedPnl || 0,
      unrealized_pnl_percent: holding.unrealizedPnlPercent || 0,
      is_pnl_up: (holding.unrealizedPnl || 0) >= 0,
    }));
  };

  // 格式化交易記錄
  const formatTransactions = (transactions) => {
    return transactions.map((tx) => ({
      transaction_id: tx.transaction_id,
      date: tx.transaction_date,
      stock_symbol: tx.stock_id,
      stock_name: tx.stock_name,
      type: tx.transaction_type,
      quantity: tx.quantity,
      price: tx.price_per_share,
      commission: 0, // API 可能沒有手續費欄位，模擬交易通常為 0
      total_amount: tx.total_value,
      currency: tx.currency,
    }));
  };

  useEffect(() => {
    fetchPortfolioDetails();
  }, [portfolioId]);

  const handleOpenTradeDialog = (action = "BUY", stockToPreselect = null) => {
    setTradeDialogInitialAction(action);

    // 如果有預選股票，從持倉中找到完整的股票資訊
    if (stockToPreselect && portfolioData.holdings) {
      const stockInfo = portfolioData.holdings.find(
        (holding) => holding.symbol === stockToPreselect
      );

      if (stockInfo) {
        // 構建完整的股票物件
        const completeStockInfo = {
          stock_id: stockInfo.stock_id,
          symbol: stockInfo.symbol,
          name: stockInfo.name,
          current_price: stockInfo.current_price,
          change_amount: 0, // 從持倉資料可能沒有這些資訊
          change_percent: 0,
          is_up: stockInfo.is_pnl_up || true, // 預設為上漲
        };
        setSelectedStockForTrade(completeStockInfo);
      } else {
        setSelectedStockForTrade(null);
      }
    } else {
      setSelectedStockForTrade(null);
    }

    setIsTradeDialogOpen(true);
  };

  const handleTradeSuccess = () => {
    setIsTradeDialogOpen(false);
    setSelectedStockForTrade(null);
    // 交易成功後，刷新投資組合詳細數據
    fetchPortfolioDetails();
    toast({
      title: "交易已記錄",
      description: "您的投資組合資訊已更新。",
    });
  };

  const getCurrencySymbol = (currencyCode) => {
    const symbols = {
      USD: "$",
      TWD: "NT$",
      EUR: "€",
      JPY: "¥",
      GBP: "£",
    };
    return symbols[currencyCode] || `${currencyCode} `;
  };

  const formatCurrency = (value, currency) => {
    if (typeof value !== "number") return "-";
    return `${getCurrencySymbol(currency)}${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getPortfolioIdForAPI = (portfolioId) => {
    // 確保傳給 TradeDialog 的是數字 ID
    if (typeof portfolioId === "string" && portfolioId.startsWith("pf")) {
      return portfolioId.substring(2);
    }
    return portfolioId;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <Spinner className="h-12 w-12 animate-spin text-blue-500" />
        <p className="mt-4 text-slate-400">載入投資組合詳細資訊中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <Info className="mx-auto h-12 w-12 text-red-500 mb-3" />
        <p className="text-red-400 mb-4">錯誤: {error}</p>
        <div className="space-x-4">
          <Button
            onClick={() => fetchPortfolioDetails()}
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
          >
            重新載入
          </Button>
          <Button
            onClick={() => router.push("/portfolios")}
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回投資組合列表
          </Button>
        </div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className="text-center py-10">
        <Info className="mx-auto h-12 w-12 text-slate-500 mb-3" />
        <p className="text-slate-400 mb-4">找不到此投資組合。</p>
        <Button
          onClick={() => router.push("/portfolios")}
          variant="outline"
          className="border-slate-600 hover:bg-slate-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回投資組合列表
        </Button>
      </div>
    );
  }

  const summaryCards = summaryCardData(portfolioData);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 頂部組合名稱和返回按鈕 */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => router.push("/portfolios")}
          variant="outline"
          size="sm"
          className="border-slate-600 hover:bg-slate-700 text-slate-700"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          返回列表
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 truncate">
            {portfolioData.name}
          </h1>
          {portfolioData.description && (
            <p className="text-sm text-slate-400 mt-1">
              {portfolioData.description}
            </p>
          )}
        </div>
        <div className="w-20"></div> {/* 佔位符 */}
      </div>

      {/* 總覽數據卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {summaryCards.map((card, index) => (
          <Card
            key={index}
            className="bg-slate-800 border-slate-700 text-slate-200"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  card.isPnl
                    ? card.value >= 0
                      ? "text-green-400"
                      : "text-red-400"
                    : "text-slate-50"
                }`}
              >
                {card.isPnl && card.value > 0 && "+"}
                {formatCurrency(card.value, card.currency)}
              </div>
              {card.isPnl && card.percent !== undefined && !card.isRealized && (
                <p
                  className={`text-xs ${
                    card.value >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  ({card.value >= 0 && "+"}
                  {card.percent.toFixed(2)}%)
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 持倉彙總 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-slate-100">持倉彙總</CardTitle>
          <Button
            onClick={() => handleOpenTradeDialog("BUY")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> 新增交易
          </Button>
        </CardHeader>
        <CardContent>
          {portfolioData.holdings && portfolioData.holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/30">
                    <TableHead className="text-slate-400">
                      股票代號/名稱
                    </TableHead>
                    <TableHead className="text-slate-400">持有數量</TableHead>
                    <TableHead className="text-slate-400">平均成本</TableHead>
                    <TableHead className="text-slate-400">當前價格</TableHead>
                    <TableHead className="text-slate-400">當前市值</TableHead>
                    <TableHead className="text-slate-400">未實現損益</TableHead>
                    <TableHead className="text-slate-400">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioData.holdings.map((holding) => (
                    <TableRow
                      key={holding.stock_id}
                      className="border-slate-700 hover:bg-slate-700/30"
                    >
                      <TableCell>
                        <Link
                          href={`/stocks/${holding.symbol}`}
                          className="hover:underline"
                        >
                          <div className="font-medium text-slate-100">
                            {holding.symbol}
                          </div>
                          <div className="text-xs text-slate-400 truncate max-w-[150px]">
                            {holding.name}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {holding.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {formatCurrency(
                          holding.avg_cost_price,
                          portfolioData.currency
                        )}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {formatCurrency(
                          holding.current_price,
                          portfolioData.currency
                        )}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {formatCurrency(
                          holding.market_value,
                          portfolioData.currency
                        )}
                      </TableCell>
                      <TableCell
                        className={
                          holding.is_pnl_up ? "text-green-400" : "text-red-400"
                        }
                      >
                        {holding.is_pnl_up ? (
                          <TrendingUp className="inline h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="inline h-4 w-4 mr-1" />
                        )}
                        {holding.is_pnl_up ? "+" : ""}
                        {formatCurrency(
                          holding.unrealized_pnl,
                          portfolioData.currency
                        )}{" "}
                        ({holding.is_pnl_up ? "+" : ""}
                        {holding.unrealized_pnl_percent.toFixed(2)}%)
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleOpenTradeDialog("BUY", holding.symbol)
                            }
                            className="text-xs border-green-600 text-green-600 hover:bg-green-600/20"
                          >
                            買入
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleOpenTradeDialog("SELL", holding.symbol)
                            }
                            className="text-xs border-red-600 text-red-600 hover:bg-red-600/20"
                          >
                            賣出
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">此投資組合目前沒有持倉。</p>
              <Button
                onClick={() => handleOpenTradeDialog("BUY")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                開始第一筆交易
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 交易記錄列表 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">交易記錄列表</CardTitle>
        </CardHeader>
        <CardContent>
          {portfolioData.transactions &&
          portfolioData.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/30">
                    <TableHead className="text-slate-400">日期</TableHead>
                    <TableHead className="text-slate-400">
                      股票代號/名稱
                    </TableHead>
                    <TableHead className="text-slate-400">交易類型</TableHead>
                    <TableHead className="text-slate-400">數量</TableHead>
                    <TableHead className="text-slate-400">價格</TableHead>
                    <TableHead className="text-slate-400">總金額</TableHead>
                    <TableHead className="text-right text-slate-400">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioData.transactions.map((tx) => (
                    <TableRow
                      key={tx.transaction_id}
                      className="border-slate-700 hover:bg-slate-700/30"
                    >
                      <TableCell className="text-slate-300">
                        {new Date(tx.date).toLocaleDateString("zh-TW")}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/stocks/${tx.stock_symbol}`}
                          className="hover:underline"
                        >
                          <div className="font-medium text-slate-100">
                            {tx.stock_symbol}
                          </div>
                          <div className="text-xs text-slate-400 truncate max-w-[150px]">
                            {tx.stock_name}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === "BUY" ? "default" : "destructive"
                          }
                          className={
                            tx.type === "BUY"
                              ? "bg-green-600/80 hover:bg-green-600 text-green-50"
                              : "bg-red-600/80 hover:bg-red-600 text-red-50"
                          }
                        >
                          {tx.type === "BUY" ? "買入" : "賣出"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {tx.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {formatCurrency(tx.price, tx.currency)}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {formatCurrency(tx.total_amount, tx.currency)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50"
                          onClick={() => {
                            toast({
                              title: "提示",
                              description: "編輯交易功能待開發",
                            });
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-slate-700/50"
                          onClick={() => {
                            toast({
                              title: "提示",
                              description: "刪除交易功能待開發",
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">此投資組合沒有交易記錄。</p>
              <Button
                onClick={() => handleOpenTradeDialog("BUY")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                新增第一筆交易
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新增/編輯交易的彈窗 */}
      {portfolioData && (
        <TradeDialog
          isOpen={isTradeDialogOpen}
          onClose={() => {
            setIsTradeDialogOpen(false);
            setSelectedStockForTrade(null);
          }}
          initialSelectedStock={selectedStockForTrade} // 直接傳遞完整物件
          portfolioId={getPortfolioIdForAPI(portfolioId)}
          initialAction={tradeDialogInitialAction}
          onTradeSubmitSuccess={handleTradeSuccess}
        />
      )}
    </div>
  );
}

// 包裹 Suspense
export default function PortfolioDetailPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-full py-10">
          <Spinner className="h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-slate-400">正在準備投資組合詳細資訊...</p>
        </div>
      }
    >
      <PortfolioDetailPageContent />
    </Suspense>
  );
}
