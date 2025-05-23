// components/portfolios/CreatePortfolioDialog.jsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // 用於描述
import { useToast } from "@/hooks/use-toast";

export default function CreatePortfolioDialog({
  isOpen,
  onClose,
  onPortfolioCreated,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "投資組合名稱不能為空。",
      });
      return;
    }
    setIsLoading(true);
    try {
      // TODO: 呼叫 API 建立新的投資組合
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/portfolios`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' /*, 'Authorization': `Bearer ${token}`*/ },
      //   body: JSON.stringify({ portfolio_name: name, description }),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.detail || "建立投資組合失敗");
      // }
      // const newPortfolio = await response.json(); // API 應返回新建立的組合資訊

      // 模擬 API
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newPortfolio = {
        id: `new_pf_${Date.now()}`,
        name,
        description,
        total_value: 0,
        today_pnl: 0,
      };

      toast({ title: "成功", description: `投資組合 "${name}" 已成功建立。` });
      if (onPortfolioCreated) {
        onPortfolioCreated(newPortfolio);
      }
      setName(""); // 清空表單
      setDescription("");
      // onClose(); // onPortfolioCreated 中會處理關閉
    } catch (error) {
      toast({
        variant: "destructive",
        title: "建立失敗",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-50">
            建立新投資組合
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            為您的新投資組合命名並添加描述（可選）。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="portfolio-name" className="text-slate-300">
              組合名稱
            </Label>
            <Input
              id="portfolio-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500"
              placeholder="例如：我的成長股組合"
              required
            />
          </div>
          <div>
            <Label htmlFor="portfolio-description" className="text-slate-300">
              描述 (可選)
            </Label>
            <Textarea
              id="portfolio-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500"
              placeholder="簡單描述一下這個組合的用途或策略"
              rows={3}
            />
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="border-slate-600 hover:bg-slate-700 text-slate-800"
              >
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "建立中..." : "確認建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
