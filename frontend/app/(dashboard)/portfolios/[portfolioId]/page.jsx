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
import TradeDialog from "@/components/shared/TradeDialog"; // 引入之前做的交易彈窗
// import EditTransactionDialog from "@/components/transactions/EditTransactionDialog"; // (未來可選)
// import DeleteTransactionDialog from "@/components/transactions/DeleteTransactionDialog"; // (未來可選)

// 模擬的單一投資組合詳細數據 (之後會從 API 獲取)
const mockPortfolioDetail = {
  id: "pf1",
  name: "積極成長型組合",
  description: "專注於高增長潛力的科技股和新興市場股票。",
  currency: "USD",
  summary: {
    total_market_value: 125876.5,
    total_cost_basis: 110500.0,
    unrealized_pnl: 15376.5,
    unrealized_pnl_percent: 13.92,
    realized_pnl: 1200.0,
  },
  holdings: [
    {
      stock_id: "AAPL_stock_id",
      symbol: "AAPL",
      name: "Apple Inc.",
      quantity: 100,
      avg_cost_price: 150.0,
      current_price: 170.34,
      market_value: 17034.0,
      unrealized_pnl: 2034.0,
      unrealized_pnl_percent: 13.56,
      is_pnl_up: true,
    },
    {
      stock_id: "GOOGL_stock_id",
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      quantity: 50,
      avg_cost_price: 2500.0,
      current_price: 2700.5,
      market_value: 135025.0,
      unrealized_pnl: 10025.0,
      unrealized_pnl_percent: 8.02,
      is_pnl_up: true,
    },
    {
      stock_id: "TSLA_stock_id",
      symbol: "TSLA",
      name: "Tesla, Inc.",
      quantity: 20,
      avg_cost_price: 800.0,
      current_price: 750.0,
      market_value: 15000.0,
      unrealized_pnl: -1000.0,
      unrealized_pnl_percent: -6.25,
      is_pnl_up: false,
    },
  ],
  transactions: [
    {
      transaction_id: "tx1",
      date: "2023-10-26",
      stock_symbol: "AAPL",
      stock_name: "Apple Inc.",
      type: "BUY",
      quantity: 50,
      price: 140.0,
      commission: 5.0,
      total_amount: 7005.0,
      currency: "USD",
    },
    {
      transaction_id: "tx2",
      date: "2023-09-15",
      stock_symbol: "GOOGL",
      stock_name: "Alphabet Inc.",
      type: "BUY",
      quantity: 20,
      price: 2450.0,
      commission: 10.0,
      total_amount: 49010.0,
      currency: "USD",
    },
    {
      transaction_id: "tx3",
      date: "2023-08-01",
      stock_symbol: "TSLA",
      stock_name: "Tesla, Inc.",
      type: "SELL",
      quantity: 10,
      price: 900.0,
      commission: 8.0,
      total_amount: 8992.0,
      currency: "USD",
    },
  ],
};

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
    value: portfolioData?.summary?.realized_pnl,
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
  const [selectedStockForTrade, setSelectedStockForTrade] = useState(null); // 用於從持倉中新增交易
  const [tradeDialogInitialAction, setTradeDialogInitialAction] =
    useState("BUY");

  const fetchPortfolioDetails = async () => {
    if (!portfolioId) return;
    setIsLoading(true);
    setError(null);
    try {
      // TODO: 呼叫 API 獲取投資組合詳細數據
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/portfolios/${portfolioId}`);
      // if (!response.ok) throw new Error('Failed to fetch portfolio details');
      // const data = await response.json();
      // setPortfolioData(data);

      await new Promise((resolve) => setTimeout(resolve, 700));
      if (portfolioId === mockPortfolioDetail.id) {
        setPortfolioData(mockPortfolioDetail);
      } else {
        throw new Error("找不到此投資組合的詳細資訊。");
      }
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

  useEffect(() => {
    fetchPortfolioDetails();
  }, [portfolioId, toast]); // toast 放入依賴

  const handleOpenTradeDialog = (action = "BUY", stockToPreselect = null) => {
    setTradeDialogInitialAction(action);
    setIsTradeDialogOpen(true);
    // 如果是從持倉觸發，可以將 stockToPreselect 傳給 TradeDialog 的 initialSelectedStock
    // setInitialStockForDialog(stockToPreselect); // 需要一個新的 state
  };

  const handleTradeSuccess = () => {
    setIsTradeDialogOpen(false);
    setSelectedStockForTrade(null);
    // 交易成功後，刷新投資組合詳細數據
    fetchPortfolioDetails();
    toast({ title: "交易已記錄", description: "您的投資組合資訊已更新。" });
  };

  const getCurrencySymbol = (currencyCode) => {
    if (currencyCode === "USD") return "$";
    if (currencyCode === "TWD") return "NT$";
    return currencyCode ? `${currencyCode} ` : "";
  };

  const formatCurrency = (value, currency) => {
    if (typeof value !== "number") return "-";
    return `${getCurrencySymbol(currency)}${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="border-slate-600 hover:bg-slate-700 text-slate-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4 text-slate-800" />
          返回上一頁
        </Button>
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
          className="border-slate-600 hover:bg-slate-700 text-slate-300"
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
          onClick={() => router.back()}
          variant="outline"
          size="sm"
          className="border-slate-600 hover:bg-slate-700 text-slate-800"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4 text-slate-800" />
          返回列表
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 text-center truncate flex-1 mx-4">
          {portfolioData.name}
        </h1>
        <div className="w-[calc(theme(space.10)+theme(spacing.1.5)*2)]">
          {" "}
          {/* 佔位，與返回按鈕寬度一致 */}{" "}
        </div>
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
          <CardTitle className="text-xl text-slate-100">
            持倉彙總 (Holdings Summary)
          </CardTitle>
          <Button
            onClick={() => handleOpenTradeDialog("BUY")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> 新增交易
          </Button>
        </CardHeader>
        <CardContent>
          {portfolioData.holdings && portfolioData.holdings.length > 0 ? (
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
                        <div className="text-xs text-slate-400">
                          {holding.name}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {holding.quantity}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-slate-400 py-6">
              此投資組合目前沒有持倉。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 交易記錄列表 */}
      <Card className="bg-slate-800 border-slate-700 text-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">
            交易記錄列表 (Transactions List)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {portfolioData.transactions &&
          portfolioData.transactions.length > 0 ? (
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
                  <TableHead className="text-slate-400">手續費</TableHead>
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
                      {new Date(tx.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/stocks/${tx.stock_symbol}`}
                        className="hover:underline"
                      >
                        <div className="font-medium text-slate-100">
                          {tx.stock_symbol}
                        </div>
                        <div className="text-xs text-slate-400">
                          {tx.stock_name}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.type === "BUY" ? "default" : "destructive"}
                        className={
                          tx.type === "BUY"
                            ? "bg-green-600/80 hover:bg-green-600 text-green-50"
                            : "bg-red-600/80 hover:bg-red-600 text-red-50"
                        }
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {tx.quantity}
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {formatCurrency(tx.price, tx.currency)}
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {formatCurrency(tx.commission, tx.currency)}
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
                          /* TODO: Open Edit Tx Dialog */ toast({
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
                          /* TODO: Open Delete Tx Dialog */ toast({
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
          ) : (
            <p className="text-center text-slate-400 py-6">
              此投資組合沒有交易記錄。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 新增/編輯交易的彈窗 */}
      {portfolioData && (
        <TradeDialog
          isOpen={isTradeDialogOpen}
          onClose={() => setIsTradeDialogOpen(false)}
          // initialSelectedStock={initialStockForDialog} // 如果你需要從持倉預填股票
          portfolioId={portfolioId} // 必須
          initialAction={tradeDialogInitialAction} // 可以根據觸發按鈕不同而設定
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
