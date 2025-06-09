// filepath: g:\Github-repos\Stock-Query-Website\frontend\app\(dashboard)\help\page.jsx
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HelpCircle,
  Search,
  Star,
  Briefcase,
  BarChart3,
  Mail,
  Phone,
  MessageSquare,
  UserCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState({});

  const faqCategories = [
    {
      title: "帳戶管理",
      icon: UserCircle,
      color: "bg-blue-500",
      faqs: [
        {
          question: "如何註冊新帳戶？",
          answer:
            "您可以點擊登入頁面的「註冊」按鈕，填寫用戶名、電子郵件和密碼來創建新帳戶。我們也支援使用 Google 帳戶快速註冊。",
        },
        {
          question: "忘記密碼怎麼辦？",
          answer:
            "如果您使用電子郵件註冊，可以在個人資料頁面修改密碼。如果您使用 Google 登入，請前往 Google 帳戶設定修改密碼。",
        },
        {
          question: "如何修改個人資料？",
          answer:
            "登入後，點擊側邊欄的「Personal Profile/Settings」即可查看和修改您的帳戶資訊。",
        },
      ],
    },
    {
      title: "股票查詢",
      icon: Search,
      color: "bg-green-500",
      faqs: [
        {
          question: "如何搜尋股票？",
          answer:
            "您可以使用頂部導航欄的搜尋框，輸入股票代號或公司名稱。也可以前往「Stock Search / List」頁面進行更詳細的篩選搜尋。",
        },
        {
          question: "股票資訊更新頻率如何？",
          answer:
            "我們的股票價格資訊會定期更新，但請注意這些資訊僅供參考，實際交易時請以券商提供的即時報價為準。",
        },
      ],
    },
    {
      title: "關注列表",
      icon: Star,
      color: "bg-yellow-500",
      faqs: [
        {
          question: "如何加入股票到關注列表？",
          answer:
            "在股票列表或股票詳細頁面中，點擊「關注」或星號按鈕即可將股票加入您的關注列表。",
        },
        {
          question: "如何從關注列表移除股票？",
          answer:
            "在「My Watchlist」頁面中，點擊股票旁邊的垃圾桶圖示即可移除。也可以在股票詳細頁面點擊「已關注」按鈕取消關注。",
        },
      ],
    },
  ];

  const quickActions = [
    {
      title: "查看儀表板",
      description: "快速瀏覽您的投資概況",
      icon: BarChart3,
      href: "/dashboard",
      color: "bg-blue-500",
    },
    {
      title: "搜尋股票",
      description: "查找您感興趣的股票資訊",
      icon: Search,
      href: "/stocks",
      color: "bg-green-500",
    },
    {
      title: "管理關注列表",
      description: "查看和編輯您的關注股票",
      icon: Star,
      href: "/watchlist",
      color: "bg-yellow-500",
    },
    {
      title: "投資組合",
      description: "管理您的投資組合",
      icon: Briefcase,
      href: "/portfolios",
      color: "bg-purple-500",
    },
  ];

  const toggleFAQ = (categoryIndex, faqIndex) => {
    const key = `${categoryIndex}-${faqIndex}`;
    setExpandedFAQ((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const filteredFAQs = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.faqs.length > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold text-slate-50 flex items-center justify-center gap-3">
          <HelpCircle className="h-8 w-8 text-blue-400" />
          幫助中心
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          歡迎來到股票查詢系統的幫助中心。在這裡您可以找到常見問題的答案，學習如何使用各項功能。
        </p>
      </div>

      {/* 搜尋框 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="搜尋常見問題..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <a
                key={index}
                href={action.href}
                className="group block p-4 border border-slate-600 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-200 hover:border-slate-500"
              >
                <div className="flex flex-col items-start space-y-3">
                  <div
                    className={`p-2 rounded-md ${action.color} group-hover:scale-105 transition-transform duration-200`}
                  >
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      {action.description}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 常見問題 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-100">常見問題</h2>

        {searchQuery && filteredFAQs.length === 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              <p className="text-slate-400">
                找不到相關的常見問題，請嘗試其他關鍵字。
              </p>
            </CardContent>
          </Card>
        )}

        {(searchQuery ? filteredFAQs : faqCategories).map(
          (category, categoryIndex) => (
            <Card key={categoryIndex} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-slate-100 flex items-center gap-3">
                  <div className={`p-2 rounded-md ${category.color}`}>
                    <category.icon className="h-5 w-5 text-white" />
                  </div>
                  {category.title}
                  <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-sm">
                    {category.faqs.length} 個問題
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.faqs.map((faq, faqIndex) => {
                    const key = `${categoryIndex}-${faqIndex}`;
                    const isExpanded = expandedFAQ[key];

                    return (
                      <div
                        key={faqIndex}
                        className="border border-slate-700 rounded-lg"
                      >
                        <button
                          onClick={() => toggleFAQ(categoryIndex, faqIndex)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
                        >
                          <span className="text-slate-200 font-medium">
                            {faq.question}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4">
                            <p className="text-slate-400 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* 聯絡我們 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-slate-100">還需要幫助？</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="text-center space-y-4 max-w-xs">
              <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-medium text-slate-200">
                電子郵件支援
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                有任何問題或建議，歡迎發送電子郵件到我們的支援信箱，我們會盡快回覆您。
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 hover:bg-slate-700 text-slate-600"
              >
                support@stockquery.com
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
