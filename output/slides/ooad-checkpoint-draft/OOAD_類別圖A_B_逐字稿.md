# OOAD 類別圖 A/B 逐字稿

## 使用建議

- 適用頁面：第 9 頁 `類別圖 A - 投資組合領域`、第 10 頁 `類別圖 B - 警示與回測領域`
- 目標時間：約 `1 分 30 秒`
- 風格：簡潔、易懂、但保留 OOAD 專業性

---

## 逐字稿版本

接下來這兩頁是我們系統最核心的類別設計，目的不是只列出資料，而是說明不同物件各自負責什麼行為。

先看第 9 頁的投資組合領域。`Portfolio` 是核心類別，負責管理整個投資組合。使用者可以擁有多個 `Portfolio`，而每個投資組合裡面會包含多筆 `PortfolioTransaction`，也就是每一筆買進或賣出的交易資料。`Portfolio` 會根據這些交易整理出 `Position`，也就是每一檔股票目前的持股狀態，像是數量、平均成本和損益。除此之外，我們把交易檢查獨立成 `TransactionValidator`，負責驗證輸入是否合法、賣出時庫存是否足夠；價格與市值計算則交給 `PortfolioPriceService`。這樣做的好處是，投資組合不只是 CRUD，而是把交易、驗證與計算分散到適合的物件中。

再看第 10 頁的警示與回測領域。警示部分，我們先用抽象類別 `AlertRule` 表示共同規則，再由不同子類別去實作像價格高於、價格低於、漲跌幅變化等判斷。`AlertEvaluator` 負責讀取 `MarketSnapshot` 並逐條評估規則，真的被觸發後，再交給 `NotificationService` 建立通知。回測部分，`MovingAverageCrossStrategy` 專門產生買賣訊號，`BacktestEngine` 負責整個模擬流程，包含執行策略、產生 `BacktestTrade`，最後整理成 `PerformanceReport`。這樣的拆法可以讓我們未來新增規則或策略時，只要擴充對應類別，不需要重寫整個主流程。

---

## 極短版備用稿

第 9 頁重點是投資組合不只是資料表，而是一組有分工的物件：`Portfolio` 管理整體，`PortfolioTransaction` 表示交易，`Position` 表示持股狀態，`TransactionValidator` 負責交易驗證，`PortfolioPriceService` 負責價格與市值計算。

第 10 頁重點是把警示與回測做成可擴充的物件結構。警示由 `AlertRule` 與子類別表示不同規則，`AlertEvaluator` 負責評估，`NotificationService` 負責通知；回測則由 `MovingAverageCrossStrategy` 產生訊號，`BacktestEngine` 執行模擬，最後輸出 `PerformanceReport`。這樣才能避免所有邏輯都塞進 API 或單一函式。
