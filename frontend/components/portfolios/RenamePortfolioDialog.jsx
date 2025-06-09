"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function RenamePortfolioDialog({
  isOpen,
  onClose,
  portfolio,
  onPortfolioRenamed,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (portfolio) {
      setName(portfolio.name || "");
      setDescription(portfolio.description || "");
    }
  }, [portfolio]);

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

    if (!portfolio) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "無效的投資組合資訊。",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/portfolios/${portfolio.portfolio_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            portfolio_name: name.trim(),
            description: description.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "重命名投資組合失敗");
      }

      const updatedPortfolio = await response.json();

      toast({
        title: "成功",
        description: `投資組合已成功重命名為 "${name}"。`,
      });

      if (onPortfolioRenamed) {
        onPortfolioRenamed(updatedPortfolio);
      }

      onClose();
    } catch (error) {
      console.error("重命名投資組合失敗:", error);
      toast({
        variant: "destructive",
        title: "重命名失敗",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName("");
      setDescription("");
      onClose();
    }
  };

  if (!portfolio) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-50">
            重命名投資組合
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            編輯 "{portfolio.name}" 的名稱和描述。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="rename-portfolio-name" className="text-slate-300">
              新組合名稱
            </Label>
            <Input
              id="rename-portfolio-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
              disabled={isLoading}
              required
            />
          </div>
          <div>
            <Label
              htmlFor="rename-portfolio-description"
              className="text-slate-300"
            >
              新描述 (可選)
            </Label>
            <Textarea
              id="rename-portfolio-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
              disabled={isLoading}
              rows={3}
            />
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="border-slate-600 hover:bg-slate-700 text-slate-300"
                disabled={isLoading}
              >
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "儲存中..." : "確認儲存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
