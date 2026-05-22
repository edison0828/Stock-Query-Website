# OOAD 類別圖 A/B 教學手冊

這份手冊只講兩頁內容：

- 第 9 頁 `類別圖 A - 投資組合領域`
- 第 10 頁 `類別圖 B - 警示與回測領域`

目標是讓組員在報告前先完全理解：

- 這兩張類別圖在畫什麼
- 為什麼要這樣拆類別
- 每個物件各自負責什麼
- 這樣的設計好處在哪裡
- 報告時該怎麼用白話講清楚

---

## 1. 先建立最基本觀念

### 1.1 類別圖不是資料表圖

很多人第一次看類別圖，會誤以為它只是把資料表畫成方框。

但其實不是。

類別圖想表達的是：

- 系統裡有哪些重要物件
- 每個物件有哪些資料
- 每個物件有哪些行為
- 物件之間怎麼合作

所以類別圖比資料表更接近「系統在執行時怎麼思考」。

### 1.2 類別圖的方框怎麼看

一個 class box 通常分成三塊：

1. 最上面：類別名稱
2. 中間：屬性，也就是它記住的資料
3. 最下面：方法，也就是它負責做的事

例如：

```text
Portfolio
- name: String
- transactions: PortfolioTransaction[]
+ addTransaction(tx): void
```

意思就是：

- 這個類別叫 `Portfolio`
- 它會記住名稱和交易清單
- 它可以執行 `addTransaction`

### 1.3 `+` 和 `-` 是什麼

- `+` 代表 public：外部可以呼叫
- `-` 代表 private：主要是內部資料或內部實作

你們報告時不用一直念這些符號，但要知道：

> 上面那些方法不是隨便寫上去，而是在表示「這個物件對外提供什麼能力」。

### 1.4 線在表達什麼

這兩張圖裡常見的線有三種：

1. `association`：兩個物件之間有關聯
2. `dependency`：一個物件會使用另一個物件
3. `inheritance`：子類別繼承父類別

如果你只想記最白話版本：

- 關聯：彼此有結構關係
- 依賴：執行時會用到
- 繼承：共用抽象規則

---

## 2. 第 9 頁在講什麼

### 2.1 先用一句話總結

第 9 頁要表達的是：

> 投資組合不是只有一張表，而是一組彼此合作的物件。

### 2.2 為什麼投資組合不能只用一個類別

如果把所有事情都塞進 `Portfolio`，會發生三個問題：

1. 它會同時負責交易資料、持股計算、輸入驗證、價格計算
2. 類別會越來越肥，難改也難測
3. 很多邏輯會跑回 API route 或 controller

這和 OOAD 想強調的「責任分工」是相反的。

所以你們把它拆成下面幾個角色，這是正確方向。

### 2.3 `User`

`User` 代表系統中的使用者。

它和 `Portfolio` 的關係是：

- 一個使用者可以擁有多個投資組合

所以圖上的重點不是 `User` 本身多複雜，而是它幫老師看出：

> 投資組合不是孤立資料，而是屬於某個使用者的業務物件。

### 2.4 `Portfolio` 為什麼是核心類別

`Portfolio` 是整個投資組合領域的中心，因為它代表使用者心中最完整的概念：

- 我的投資組合叫什麼
- 裡面有哪些交易
- 現在有哪些持股
- 整體狀態如何

它自己不一定要做所有細節計算，但它是主要入口。

你們可以把它想成：

> `Portfolio` 是總管，負責協調交易、持股、驗證與摘要結果。

### 2.5 `PortfolioTransaction` 為什麼要獨立出來

因為單筆交易本身就是一個完整概念。

一筆買進或賣出會有：

- 股票代號
- 買賣方向
- 數量
- 成交價格
- 手續費

這些資料不是 `Portfolio` 的一個小欄位而已，而是有自己的意義。

而且單筆交易還能做自己的計算，例如：

- 毛額
- 淨額

把它拆出來的好處是：

- 單筆交易的邏輯集中
- `Portfolio` 不用知道每一筆交易的細節算法

### 2.6 `Position` 為什麼也要獨立

`Position` 代表「某一檔股票目前的持股狀態」。

這和單筆交易不一樣。

交易是歷史事件，`Position` 是目前結果。

例如：

- 你買過三次台積電、賣過一次台積電
- 這些是交易紀錄
- 最後整理出來的剩餘股數、平均成本、損益，才是 `Position`

所以 `Position` 的存在很重要，因為它讓你們可以清楚區分：

- 過程：交易
- 結果：持股狀態

這就是物件設計中很有價值的拆法。

### 2.7 `TransactionValidator` 為什麼不要塞進 Portfolio

很多初學者會把交易驗證直接寫進 `Portfolio.addTransaction()` 裡面。

這樣短期可行，但會有問題：

- 驗證規則會越來越多
- `Portfolio` 會同時負責資料管理和輸入檢查
- 之後如果 API、表單、批次匯入都要共用驗證，很難重用

所以你們把它獨立成 `TransactionValidator`，這很合理。

它主要負責：

- 標準化輸入
- 建立待加入的交易物件
- 檢查賣出時庫存是否足夠

這樣的好處是：

- 驗證邏輯集中
- 投資組合本體更乾淨
- API 層不需要自己寫一堆 if-else

### 2.8 `PortfolioPriceService` 為什麼也是獨立物件

因為市值計算需要外部市場資料。

`Portfolio` 本身知道自己的交易和持股，但它不知道最新股價是多少。  
最新價格通常是從資料庫或市場資料表查出來。

所以你們把：

- 抓最新價格
- 把價格對回持股
- 形成投資組合摘要

這類和外部資料存取比較有關的工作交給 `PortfolioPriceService`。

這樣可以避免 `Portfolio` 自己跑去查資料庫。

這點很重要，因為它表示：

> domain object 負責業務概念，service 幫忙處理跨物件或跨資料來源的事情。

### 2.9 第 9 頁真正想證明什麼

這頁真正想證明的是：

> 你們不是只做了一個投資組合 CRUD 頁面，而是把投資組合拆成有責任分工的物件合作。

如果老師問「這頁的設計價值是什麼」，你們可以回答：

> 我們把交易、持股、驗證與價格計算分開，讓每個類別只專注在自己的責任，這樣比把所有邏輯塞進 API 或單一類別更符合 OOAD。

---

## 3. 第 10 頁在講什麼

### 3.1 先用一句話總結

第 10 頁要表達的是：

> 警示與回測不是一段大函式，而是可以擴充的規則與策略結構。

這頁其實是你們最能證明「不是 CRUD」的地方。

### 3.2 警示模組的核心觀念

警示功能看起來很簡單，好像只是：

- 當價格大於某個值就通知

但如果系統之後要擴充，就會出現更多規則：

- 高於某價格
- 低於某價格
- 單日漲幅超過某百分比
- 單日跌幅超過某百分比

如果全部寫在同一個 `if-else` 裡，很快就會變難維護。

所以你們用 `AlertRule` 做共同抽象，再用不同子類別表示不同規則，這就是這頁左半邊最重要的意思。

### 3.3 `AlertRule` 為什麼要做成抽象類別

因為不同警示規則雖然判斷方式不同，但它們有共同概念：

- 都有門檻值
- 都有啟用 / 停用狀態
- 都要能判斷是否觸發
- 都要能產生人看得懂的條件說明

所以你們把共通骨架放到 `AlertRule`，再讓子類別去實作細節。

這樣的好處是：

- 共通欄位不用重複寫
- 主流程不用知道每種規則的細節
- 未來新增規則時只要增加新類別

### 3.4 為什麼還需要 `AlertEvaluator`

因為規則物件只知道「我自己怎麼判斷」，但它不知道整批規則怎麼跑。

`AlertEvaluator` 的責任是：

- 取得一批規則
- 取得市場快照
- 逐條檢查
- 找出哪些規則被觸發

也就是說：

- `AlertRule` 負責單條規則
- `AlertEvaluator` 負責整批評估流程

這個拆法很重要，因為它把「規則內容」和「評估流程」分開了。

### 3.5 `MarketSnapshot` 的角色是什麼

它代表某個時間點的市場狀態。

例如：

- 目前價格
- 漲跌幅
- 市場日期

它的存在讓警示規則不需要自己去資料庫查價，而是直接吃一份整理好的市場資料。

這樣規則物件就會更單純，只專心做判斷。

### 3.6 `NotificationService` 為什麼不跟 `AlertEvaluator` 合在一起

因為兩者責任不同：

- `AlertEvaluator`：判斷有沒有被觸發
- `NotificationService`：把結果存成通知、更新觸發紀錄

如果合在一起，就會變成一個類別同時負責判斷和資料持久化。

拆開後的好處是：

- 評估邏輯更純
- 通知儲存方式可獨立調整
- 比較容易測試

### 3.7 回測模組的核心觀念

回測不是「按一下按鈕跑出結果」而已。

它其實至少包含四層意思：

1. 規則怎麼產生訊號
2. 訊號怎麼轉成買賣
3. 交易後資產怎麼變化
4. 最後績效怎麼整理

所以你們把它拆成：

- `MovingAverageCrossStrategy`
- `BacktestEngine`
- `BacktestTrade`
- `PerformanceReport`

這是合理的。

### 3.8 `MovingAverageCrossStrategy` 為什麼不是直接寫進 Engine

因為策略本身就是可替換的。

你們現在做的是均線交叉，但未來也可能有：

- RSI 策略
- 突破策略
- 布林通道策略

如果直接寫死在 `BacktestEngine`，每加一種策略都要改 engine。

現在拆成獨立策略類別後，`BacktestEngine` 只要負責執行，不需要知道策略細節。

這就是策略模式的基本精神。

### 3.9 `BacktestEngine` 為什麼是流程核心

因為它負責把整個回測過程串起來：

- 驗證輸入
- 執行策略產生訊號
- 模擬買賣
- 記錄交易
- 建立資產曲線
- 產生績效結果

所以它不是在做某一個小計算，而是在當流程協調者。

你們報告時可以直接說：

> `BacktestEngine` 是回測流程的主控制物件。

### 3.10 `BacktestTrade` 與 `PerformanceReport` 的差別

這兩個很容易混。

`BacktestTrade` 是過程資料，表示某一次模擬買賣。

例如：

- 哪一天買
- 哪一天賣
- 價格多少
- 數量多少

`PerformanceReport` 則是最後整理出來的結果，例如：

- 總報酬率
- 最大回撤
- 勝率

所以兩者差別就是：

- `BacktestTrade`：過程
- `PerformanceReport`：總結

### 3.11 第 10 頁真正想證明什麼

這頁真正想證明的是：

> 你們把規則與策略做成可擴充的物件，而不是把所有邏輯寫成一大段條件判斷。

如果老師問「這樣設計的好處是什麼」，你們可以回答：

> 因為警示規則和回測策略都很可能持續增加，所以我們把共同流程和具體規則分開。這樣新增功能時只需要擴充對應類別，不需要重寫整個評估器或回測引擎。

---

## 4. 這兩頁可以怎麼一起講

你們可以把第 9、10 頁當成同一段主軸：

> 第 9 頁說明投資組合如何拆成交易、持股、驗證與價格計算；第 10 頁則說明警示和回測如何拆成規則、評估器、策略、引擎與績效報告。兩頁合在一起，想表達的就是我們已經不是把邏輯塞在資料表或 API，而是用物件分工來建構系統。

這句話很適合當你們報告這兩頁的收束。

---

## 5. 這兩頁最常被問的問題

### 5.1 為什麼要拆這麼多類別

回答：

> 因為不同邏輯的變動速度不同。交易資料、持股計算、警示判斷、回測策略都不是同一種責任，拆開後比較容易維護、測試與擴充。

### 5.2 為什麼不直接在 API 寫判斷

回答：

> 如果全部寫在 API，短期會比較快，但功能一多就會變成大型流程函式。現在把邏輯移到 domain objects 後，API 只負責接收請求與回傳結果，真正的業務規則留在物件內，更符合 OOAD。

### 5.3 這樣真的有比 CRUD 複雜嗎

回答：

> 有，因為現在不只是新增、刪除、查詢資料而已，而是包含交易驗證、持股推導、警示規則評估、通知產生、策略訊號生成、回測模擬與績效統計，這些都超過單純 CRUD。

### 5.4 如果之後要加新規則或新策略怎麼辦

回答：

> 警示部分只要新增 `AlertRule` 的子類別；回測部分只要新增新的策略類別，主流程幾乎不用重寫，這就是我們這次設計想達到的擴充性。

---

## 6. 對照實際程式

如果組員想把類別圖和真實程式連起來，可以從這些檔案開始看：

### 6.1 投資組合領域

- [Portfolio.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/Portfolio.js)
- [Position.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/Position.js)
- [PortfolioTransaction.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/PortfolioTransaction.js)
- [TransactionValidator.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/TransactionValidator.js)
- [PortfolioPriceService.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/PortfolioPriceService.js)

### 6.2 警示領域

- [AlertRule.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/AlertRule.js)
- [AlertEvaluator.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/AlertEvaluator.js)
- [NotificationService.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/NotificationService.js)
- [MarketSnapshot.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/MarketSnapshot.js)

### 6.3 回測領域

- [MovingAverageCrossStrategy.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/MovingAverageCrossStrategy.js)
- [BacktestEngine.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/BacktestEngine.js)
- [BacktestTrade.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/BacktestTrade.js)
- [PerformanceReport.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/PerformanceReport.js)

---

## 7. 最後只記這 6 句也夠

如果時間不夠，至少把下面 6 句記起來：

1. `Portfolio` 是投資組合核心物件，不是單純資料表。
2. `PortfolioTransaction` 是交易過程，`Position` 是持股結果。
3. `TransactionValidator` 讓交易驗證從主流程中獨立出來。
4. `AlertRule` 和子類別讓警示規則可以擴充，不用一直加 if-else。
5. `BacktestEngine` 負責整個回測流程，`MovingAverageCrossStrategy` 只負責產生訊號。
6. 這兩頁共同證明我們的系統已經從 CRUD 網站進一步變成有物件分工的 OOAD 專題。
