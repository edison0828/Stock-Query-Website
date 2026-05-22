# OOAD 期中檢查簡報逐字稿

> 備註：正式報告前請把「組員 A/B/C」替換為實際姓名，並依實際分工微調第 3 頁內容。

## 第 1 頁：封面

各位老師、同學好，我們這次的專題是「股市投資組合、警示與策略回測分析平台」。

這個題目是延續之前資料庫課程的股市查詢與財報分析平台，但這次物件導向分析與設計課程的重點，不只是把資料查出來或做 CRUD，而是要把系統中的投資組合、警示規則、策略回測這些行為，整理成比較清楚的物件模型。

所以本次期中檢查，我們會聚焦在三個核心領域：第一個是投資組合領域，第二個是警示與通知領域，第三個是策略與回測領域。

## 第 2 頁：依老師回饋修正專題方向

第一次提案後，老師給我們的回饋是：主題生活化，架構大致符合課程條件，但是部分功能看起來很相似，容易讓人覺得整個系統主要都在做 CRUD。

我們重新檢查後也認為，原本系統雖然可以查股票、管理自選股、建立投資組合，但大部分邏輯都偏向資料新增、查詢、修改、刪除，物件之間的責任與互動不夠明顯。

因此這次我們做了三個修正。第一是重構投資組合領域，把交易、持股、驗證與摘要計算移到 domain objects。第二是新增警示與通知領域，讓規則可以被評估並產生通知。第三是新增策略回測領域，讓使用者可以輸入策略參數，系統再模擬交易並產生績效結果。

換句話說，我們把專題從「資料查詢加 CRUD」提升成「規則與策略驅動的分析平台」。

## 第 3 頁：進度總結與組員分工

目前的進度可以分成五個部分。

第一，我們已經重建 MySQL 資料庫，並透過 FinLab 匯入股票、歷史價格、財報與股利資料，讓原本遺失的資料庫可以恢復到可運行狀態。

第二，我們完成投資組合領域重構，包含 Portfolio、Position、PortfolioTransaction、TransactionValidator，以及 PortfolioPriceService。

第三，我們新增警示領域，包含 AlertRule 的階層設計、AlertEvaluator、NotificationService，以及對應的 Alerts UI。

第四，我們新增回測領域，包含 MovingAverageCrossStrategy、BacktestEngine、PerformanceReport，以及 Backtests UI。

第五，本機整合方面，目前 Next.js、Prisma 與 MySQL 已經可以 build，Dashboard、Alerts、Backtests 也已經接到導覽與頁面流程。

正式報告時，這一頁會替換成四位組員的實際姓名與最終分工。

## 第 4 頁：使用案例圖

這一頁是我們目前整理出的使用案例圖。

主要 actor 有三個：第一個是投資者或一般使用者，第二個是管理者或資料維護者，第三個是 FinLab 資料來源。

這次我們把主要 use cases 從原本 8 個擴充成 11 個，並且把圖改成更正式的 use case diagram 表示法。  
一般使用者可以查詢股票資訊、管理自選股、管理投資組合、記錄買進交易、記錄賣出交易並驗證庫存是否足夠、建立警示規則、啟用或停用警示規則、查看通知與標記已讀、執行策略回測，以及查看回測結果。

管理者與資料來源則比較偏向市場資料維護，例如透過 FinLab 更新市場資料，讓系統後續的查詢、交易、警示與回測都能使用正確資料。

在圖上，我們除了畫出 actor 和 use case 的 association，也用 include 關係表示像是投資組合管理會包含買進與賣出交易，策略回測則會包含結果查看。

這張圖的重點是，我們不只把使用者操作畫成 CRUD，而是把交易驗證、警示生命週期、通知、策略回測與資料更新都放入系統邊界，讓系統行為更符合物件導向設計的討論需求。

## 第 5 頁：最複雜使用案例的活動圖

我們選擇「執行策略回測」作為最複雜的使用案例，因為它包含最多判斷與物件互動。

流程一開始，使用者會輸入股票代號、日期區間、移動平均參數，以及初始資金。系統先檢查參數是否有效，如果參數不合理，例如短期均線大於長期均線，或日期區間錯誤，就會顯示驗證錯誤並停止。

如果參數有效，系統會載入歷史股價資料，接著檢查資料是否足夠。如果資料不足，例如指定區間太短，系統會提示使用者調整參數。

如果資料足夠，系統會建立策略物件，計算移動平均指標，產生買賣訊號，再由回測引擎模擬交易。最後系統會計算總報酬、最大回撤、勝率等績效，並顯示回測結果。

這個流程比一般 CRUD 複雜，因為它有驗證、條件分支、策略物件、模擬交易與績效報告。

## 第 6 頁：系統架構圖

這一頁說明系統的主要架構。

使用者從瀏覽器操作 Next.js App Router 的介面，前端頁面會呼叫 Next.js API Routes。API Routes 不直接把所有商業邏輯寫在 route 裡，而是呼叫領域層的 Portfolio、Alerts、Backtests 相關物件。

資料存取部分透過 Prisma ORM 連接 MySQL。使用者認證由 NextAuth 負責，包含登入、session，以及保護 dashboard 與 API。

外部資料匯入則由 FinLab 匯入腳本負責，把市場資料寫入 MySQL。

所以整體請求路徑是：瀏覽器到 UI，到 API，到 Domain，再到 Prisma，最後存取 MySQL。

## 第 7 頁：資料儲存設計

資料儲存可以分成四類。

第一類是市場資料，存在 stocks、historicalprices、financialreports、dividends 等資料表。這些資料會被股票 API、AlertMarketDataService、BacktestMarketDataService 和 PortfolioPriceService 使用。

第二類是使用者與投資組合資料，包含 users、watchlistitems、portfolios、transactions。這些資料會被 Portfolio、Position、PortfolioTransaction 和 TransactionValidator 使用。

第三類是規則與通知資料，包含 alertrules 和 notifications。執行時會透過 AlertRule 階層、AlertEvaluator 和 NotificationService 處理。

第四類是策略與回測資料，包含 backtestruns 和 backtesttrades。執行時會透過 MovingAverageCrossStrategy、BacktestEngine 和 PerformanceReport 處理。

這裡要強調的是，資料表不是孤立存在，而是和執行期的物件與服務互相對應。

## 第 8 頁：使用者介面 Mockups / Prototype Screens

這一頁展示目前主要介面的規劃。

第一個是儀表板，用來顯示整體摘要與主要入口。第二個是個股詳情頁，使用者可以查看價格與財報資料。第三個是警示頁，使用者可以建立與管理警示規則。第四個是回測頁，使用者可以輸入策略參數並查看回測結果。

導覽上，我們用側邊欄連到 dashboard、stocks、watchlist、portfolios、alerts、backtests 等頁面。

資料呈現上，價格、財報、警示規則、equity curve 與交易紀錄會用卡片、圖表與表格呈現。

正式繳交前，如果時間允許，這一頁會換成從本機實際系統截出的畫面。

## 第 9 頁：類別圖 A - 投資組合領域

這一頁是投資組合領域的類別圖。

User 可以擁有 Portfolio。Portfolio 是這個領域的核心，它會聚合 transactions，建立 positions，並產生 summary snapshot。

Position 負責持股數量、平均成本、已實現損益、市值與未實現損益等計算。

PortfolioTransaction 負責單筆交易資料，包含交易類型、股數、價格與手續費，並提供 gross amount 與 net amount 的計算。

TransactionValidator 負責檢查交易輸入與賣出是否合法，例如不能賣出超過目前持股。

PortfolioPriceService 則負責取得最新價格，並把價格對應回持股部位。

這樣重構後，API route 不需要知道所有計算細節，投資組合的責任會集中在 domain objects 裡。

## 第 10 頁：類別圖 B - 警示與回測領域

這一頁是警示與回測領域，也是我們本次強化複雜度的核心。

警示部分，我們設計了抽象的 AlertRule，並由 PriceAbove、PriceBelow、PercentChangeUp、PercentChangeDown 等具體規則繼承。AlertEvaluator 會使用這些規則與 MarketSnapshot 進行評估，NotificationService 則負責把被觸發的警示存成通知。

回測部分，我們目前先實作 MovingAverageCrossStrategy。BacktestEngine 會執行 strategy，讀取 price series，模擬交易，建立 BacktestTrade，最後產生 PerformanceReport。

這樣的設計讓系統可以新增不同警示規則與不同策略，而不需要大幅改動評估器或回測引擎。

## 第 11 頁：設計模式 1 - Strategy Pattern

第一個設計模式是 Strategy Pattern。

它的設計意圖是把可替換的演算法封裝在共同介面後面，讓主要執行流程不依賴特定實作。這樣系統要切換行為時，不需要修改 controller 或 service 的主要流程。

在我們專題中，第一個使用位置是警示規則。AlertRule 是共同抽象，PriceAboveAlertRule、PriceBelowAlertRule、PercentChange rules 則是不同策略。

第二個使用位置是回測策略。目前 MovingAverageCrossStrategy 由 BacktestEngine 執行，未來如果要新增 RSI 策略或突破策略，就可以用同樣方式擴充。

這個模式帶來的效果是減少大型 if-else，提升擴充性，並讓物件導向設計更容易被看見。

## 第 12 頁：設計模式 2 - Factory Pattern

第二個設計模式是 Factory Pattern。

它的設計意圖是集中物件建立邏輯，讓上層不直接依賴具體類別。也就是說，API layer 不應該自己判斷要建立 PriceAboveAlertRule，還是 PercentChangeUpAlertRule。

我們在 createAlertRule 這個 function 使用 Factory Pattern。輸入是資料庫中的 alert rule record，輸出是具體的 AlertRule object。

這樣做的效果是，API code 可以保持簡潔，物件建立邏輯可以重用，未來新增規則類型時，只需要擴充 factory，而不需要到每個 API route 裡面修改判斷。

後續如果支援多種回測策略，也可以用類似方式擴充 StrategyFactory。

## 第 13 頁：結論與下一步

最後總結，本專題已經從資料查詢網站，提升為規則與策略驅動的投資分析平台。

目前已完成的部分包含 MySQL 重建與整合、Portfolio Domain 重構、警示與通知模組、移動平均回測模組，以及 11 個主要 use cases 的整理。

這些改動的重點不只是新增功能，而是讓系統中的物件責任更清楚，讓使用案例、活動圖、類別圖與設計模式都有對應到實際程式。

下一步我們會考慮新增 RSI 等更多策略、加入排程式警示評估、比較多組回測參數，並把簡報中的 placeholders 替換成正式截圖與實際組員姓名。

本次報告的重點是：我們不只展示系統能做什麼，也展示物件導向分析與設計如何組織整個系統。謝謝大家。

## 第 14 頁：候選 Use Cases

最後這一頁不是主要內容，而是備援頁。

我們額外準備了幾個候選 use cases，例如刪除警示規則、查看投資組合摘要、查看投資組合交易紀錄，以及手動執行警示評估。

這樣做的原因是，如果老師現場認為某個 use case 太大、太小，或者比較像結果畫面而不是獨立任務，我們可以立刻用這些已完成的候選項目替換，避免整體數量不足。

如果後續開發還有時間，最值得補強的新項目是比較不同回測參數結果，因為它最能再提升策略與報告物件的複雜度。
