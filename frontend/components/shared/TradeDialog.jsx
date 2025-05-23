// components/shared/TradeDialog.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose, // 用於點擊取消按鈕關閉
  // DialogDescription, // 如果需要描述
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // 用於切換買入/賣出
import { X as CloseIcon, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // 引入 Select 組件
import Link from "next/link";

export default function TradeDialog({
  isOpen, // 控制 Dialog 是否開啟
  onClose, // 關閉 Dialog 的回呼函數
  stockSymbol, // 股票代號
  stockName, // 股票名稱
  currentPrice, // 當前股價 (數字類型)
  priceChange, // 價格變動 (數字)
  percentChange, // 百分比變動 (數字)
  isUp, // 是否上漲 (布林值)
  initialAction = "BUY", // 初始是買入還是賣出
  portfolioId, // 如果需要指定交易到哪個投資組合
  onPortfolioSelect, // << (可選) 如果彈窗內部選擇組合，則需要回呼
}) {
  const [actionType, setActionType] = useState(initialAction); // 'BUY' or 'SELL'
  const [quantity, setQuantity] = useState(10); // 預設數量
  const [priceType, setPriceType] = useState("market"); // 'market' or 'limit' (市價或限價)
  const [limitPrice, setLimitPrice] = useState(""); // 限價價格
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [portfolios, setPortfolios] = useState([]); // 儲存用戶的投資組合列表
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    portfolioId || ""
  ); // 用戶選擇的 portfolioId
  const [isFetchingPortfolios, setIsFetchingPortfolios] = useState(false);

  // 當 initialAction 改變時，更新 actionType
  useEffect(() => {
    setActionType(initialAction);
  }, [initialAction]);

  // 當彈窗打開時，獲取用戶的投資組合列表
  useEffect(() => {
    if (isOpen) {
      const fetchPortfolios = async () => {
        setIsFetchingPortfolios(true);
        try {
          // TODO: 呼叫 API 獲取用戶的投資組合列表
          // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/portfolios`
          // // , { headers: { 'Authorization': `Bearer ${token}` } }
          // );
          // if (!response.ok) throw new Error('Failed to fetch portfolios');
          // const data = await response.json();
          // setPortfolios(data);
          // if (data.length > 0 && !portfolioId) { // 如果外部沒有指定 portfolioId，預設選中第一個
          //   setSelectedPortfolioId(data[0].portfolio_id.toString());
          // } else if (portfolioId) {
          //   setSelectedPortfolioId(portfolioId.toString());
          // }

          // 模擬數據
          await new Promise((resolve) => setTimeout(resolve, 300));
          const mockPortfolios = [
            { portfolio_id: 1, portfolio_name: "我的主要投資組合" },
            { portfolio_id: 2, portfolio_name: "科技股觀察" },
            { portfolio_id: 3, portfolio_name: "長期持有" },
          ];
          setPortfolios(mockPortfolios);
          if (mockPortfolios.length > 0 && !portfolioId) {
            setSelectedPortfolioId(mockPortfolios[0].portfolio_id.toString());
          } else if (portfolioId) {
            setSelectedPortfolioId(portfolioId.toString());
          }
        } catch (err) {
          console.error("Error fetching portfolios:", err);
          toast({
            variant: "destructive",
            title: "錯誤",
            description: "無法獲取投資組合列表。",
          });
        } finally {
          setIsFetchingPortfolios(false);
        }
      };
      fetchPortfolios();
    }
  }, [isOpen, portfolioId, toast]); // 當 isOpen, portfolioId 變化時重新獲取

  const effectivePrice = useMemo(() => {
    if (priceType === "limit" && limitPrice && !isNaN(parseFloat(limitPrice))) {
      return parseFloat(limitPrice);
    }
    return currentPrice || 0; // 如果是市價或限價未輸入，則使用當前市價
  }, [priceType, limitPrice, currentPrice]);

  const totalValue = useMemo(() => {
    const numQuantity = parseInt(quantity, 10);
    if (!isNaN(numQuantity) && numQuantity > 0 && effectivePrice > 0) {
      return (numQuantity * effectivePrice).toFixed(2);
    }
    return "0.00";
  }, [quantity, effectivePrice]);

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // 只允許數字
    if (/^\d*$/.test(value)) {
      setQuantity(value === "" ? "" : parseInt(value, 10));
    }
  };

  const handleLimitPriceChange = (e) => {
    const value = e.target.value;
    // 允許數字和小數點
    if (/^\d*\.?\d*$/.test(value)) {
      setLimitPrice(value);
    }
  };

  const handleSubmitTrade = async () => {
    setIsLoading(true);
    // 基本驗證
    if (parseInt(quantity, 10) <= 0) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "數量必須大於 0。",
      });
      setIsLoading(false);
      return;
    }
    if (
      priceType === "limit" &&
      (limitPrice === "" || parseFloat(limitPrice) <= 0)
    ) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "限價模式下，價格必須大於 0。",
      });
      setIsLoading(false);
      return;
    }
    if (!selectedPortfolioId) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "請選擇一個投資組合。",
      });
      setIsLoading(false);
      return;
    }

    console.log("Submitting trade:", {
      stockSymbol,
      actionType,
      quantity: parseInt(quantity, 10),
      priceType,
      price: effectivePrice,
      totalValue,
      portfolioId: parseInt(selectedPortfolioId, 10),
    });

    // TODO: 呼叫後端 API 記錄模擬交易
    // try {
    //   const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/transactions`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       // 'Authorization': `Bearer ${your_auth_token}`
    //     },
    //     body: JSON.stringify({
    //       stock_symbol: stockSymbol,
    //       transaction_type: actionType,
    //       quantity: parseInt(quantity, 10),
    //       price_per_share: effectivePrice,
    //       portfolio_id: parseInt(selectedPortfolioId, 10),
    //       // commission: 0, // 手續費 (可選)
    //       // transaction_date: new Date().toISOString(), // 交易時間
    //     }),
    //   });
    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.detail || "交易失敗，請稍後再試。");
    //   }
    //   toast({ title: "交易成功", description: `${actionType === 'BUY' ? '買入' : '賣出'} ${quantity} 股 ${stockSymbol} 成功。` });
    //   onClose(); // 成功後關閉彈窗
    // } catch (err) {
    //   console.error("Trade submission error:", err);
    //   toast({ variant: "destructive", title: "交易失敗", description: err.message });
    // } finally {
    //   setIsLoading(false);
    // }

    // 模擬 API 呼叫成功
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: "模擬交易成功",
      description: `${
        actionType === "BUY" ? "買入" : "賣出"
      } ${quantity} 股 ${stockSymbol} 成功。`,
    });
    setIsLoading(false);
    onClose(); // 成功後關閉彈窗
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {" "}
      {/* onOpenChange 會在點擊外部或按 ESC 時觸發 */}
      <DialogContent className="sm:max-w-[450px] bg-slate-800 border-slate-700 text-slate-200 p-0 overflow-hidden">
        {/* 自訂關閉按鈕 */}
        {/* <DialogClose asChild className="absolute right-3 top-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100"
          >
            <CloseIcon className="h-5 w-5" />
          </Button>
        </DialogClose> */}

        <DialogHeader className="bg-slate-800 px-6 pt-6 pb-4 border-b border-slate-700">
          <DialogTitle className="text-xl font-semibold text-slate-50">
            買入 / 賣出 {stockSymbol}
          </DialogTitle>
          <div className="text-sm text-slate-400">{stockName}</div>
          <div>
            <span
              className={`text-2xl font-bold ${
                isUp ? "text-green-400" : "text-red-400"
              }`}
            >
              ${(currentPrice || 0).toFixed(2)}
            </span>
            <span
              className={`ml-2 text-sm font-medium ${
                isUp ? "text-green-400" : "text-red-400"
              }`}
            >
              {isUp ? "+" : ""}
              {(priceChange || 0).toFixed(2)} ({isUp ? "+" : ""}
              {(percentChange || 0).toFixed(2)}%)
            </span>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <Tabs
            value={actionType}
            onValueChange={setActionType}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-slate-700 p-1 h-auto">
              <TabsTrigger
                value="BUY"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 py-2"
              >
                買入
              </TabsTrigger>
              <TabsTrigger
                value="SELL"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-300 py-2"
              >
                賣出
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-slate-300">
              數量
            </Label>
            <Input
              id="quantity"
              type="text" // 改為 text 以便更好地控制輸入
              inputMode="numeric" // 提示數字鍵盤
              value={quantity}
              onChange={handleQuantityChange}
              className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 text-lg"
              placeholder="例如：100"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300">價格</Label>
            {/* 這裡可以添加 限價/市價 的選擇，目前簡化為顯示市價 */}
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-md">
              <span className="text-slate-400">市價</span>
              <span className="text-lg font-semibold text-slate-100">
                ${totalValue}
              </span>
            </div>
            {/* 如果要實現限價:
            <Tabs value={priceType} onValueChange={setPriceType} className="w-full mt-2">
              <TabsList className="grid w-full grid-cols-2 bg-slate-700 p-1 h-auto">
                <TabsTrigger value="market" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-300">市價</TabsTrigger>
                <TabsTrigger value="limit" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-300">限價</TabsTrigger>
              </TabsList>
            </Tabs>
            {priceType === 'limit' && (
              <div className="mt-2 space-y-2">
                <Label htmlFor="limit-price" className="text-slate-300">限價價格</Label>
                <Input
                  id="limit-price"
                  type="text"
                  inputMode="decimal"
                  value={limitPrice}
                  onChange={handleLimitPriceChange}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500"
                  placeholder="輸入價格"
                />
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-md mt-2">
                <span className="text-slate-400">總金額</span>
                <span className="text-lg font-semibold text-slate-100">${totalValue}</span>
            </div>
            */}
          </div>

          {/* 投資組合選擇 */}
          <div className="space-y-2">
            <Label htmlFor="portfolio" className="text-slate-300">
              投資組合
            </Label>
            {isFetchingPortfolios ? (
              <Input
                value="載入投資組合中..."
                disabled
                className="bg-slate-700 border-slate-600"
              />
            ) : portfolios.length > 0 ? (
              <Select
                value={selectedPortfolioId}
                onValueChange={(value) => setSelectedPortfolioId(value)}
              >
                <SelectTrigger
                  id="portfolio"
                  className="w-full bg-slate-700 border-slate-600 text-slate-100"
                >
                  <SelectValue placeholder="選擇一個投資組合" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {portfolios.map((p) => (
                    <SelectItem
                      key={p.portfolio_id}
                      value={p.portfolio_id.toString()}
                      className="hover:bg-slate-700 focus:bg-slate-700"
                    >
                      {p.portfolio_name} (ID: {p.portfolio_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-slate-400">
                沒有可用的投資組合。
                <Button
                  variant="link"
                  className="p-0 ml-1 h-auto text-blue-400"
                  asChild
                >
                  <Link href="/portfolios">去建立一個</Link>
                </Button>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="bg-slate-800 px-6 py-4 border-t border-slate-700 sm:justify-between">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto border-slate-600 hover:bg-slate-700 text-slate-300"
            >
              取消
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmitTrade}
            disabled={isLoading || parseInt(quantity, 10) <= 0}
            className={`w-full sm:w-auto ${
              actionType === "BUY"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            {isLoading
              ? "處理中..."
              : actionType === "BUY"
              ? "確認買入"
              : "確認賣出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
