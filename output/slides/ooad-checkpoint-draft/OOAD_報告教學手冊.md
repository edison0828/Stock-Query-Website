# OOAD 專題報告教學手冊

> 適用對象：對股市、資料庫、網站前後端、物件導向設計都還不熟的組員  
> 目標：看完這份文件後，能理解這個專題在做什麼、為什麼這樣設計、簡報每一頁在講什麼，以及報告時要怎麼把內容講得專業

---

## 1. 先用最白話的一句話理解整個專題

這個系統本質上是一個「幫使用者看股票、管理自己的投資組合、設定提醒條件，並測試投資策略」的平台。

如果用生活化比喻：

- `股票查詢`：像查某家店今天賣多少錢、過去價格怎麼變
- `投資組合`：像記帳本，但記的不是買早餐，而是買了哪些股票、買多少、賺多少
- `警示規則`：像鬧鐘，當某檔股票到達某個條件就提醒你
- `策略回測`：像時光機，拿過去的資料來測試「如果以前用這種投資規則，結果會怎樣」

所以這個專題不是只有「把股票資料顯示出來」，而是要讓系統會「判斷、計算、模擬、產生結果」。

這也是為什麼它適合拿來做物件導向分析與設計。

---

## 2. 完全零基礎版名詞教學

這一段很重要。報告中很多名詞只要先懂白話意思，後面就不會卡住。

### 2.1 股票是什麼

股票可以先理解成「一家公司的所有權切成很多小份」。  
如果你買了某家公司股票，就代表你持有它很小的一部分。

你最關心的幾件事通常是：

- 現在價格是多少
- 以前價格怎麼變
- 公司賺不賺錢
- 我買進後是賺還是賠

### 2.2 投資組合是什麼

投資組合就是「你手上持有的股票集合」。

例如：

- 你買了台積電 10 股
- 又買了聯發科 5 股
- 後來又賣掉一部分

這些加起來就是你的投資組合。

系統要能回答：

- 你現在總共持有哪些股票
- 每檔還剩多少
- 每檔平均成本是多少
- 目前市值多少
- 整體是賺還是賠

### 2.3 警示規則是什麼

警示規則就是「如果某件事發生，就提醒我」。

例如：

- 如果台積電價格高於 1000 元，提醒我
- 如果聯發科今天跌超過 3%，提醒我

這裡的重點不是只是存一筆資料，而是：

- 系統要知道這條規則代表什麼意思
- 系統要把規則和市場資料拿來比對
- 條件成立時要產生通知

### 2.4 回測是什麼

回測是把某個投資策略丟到「過去的股價資料」上，看看它以前表現如何。

例如：

- 策略規則：短期均線向上突破長期均線時買進，向下跌破時賣出
- 系統拿 2024 年到 2025 年的股價去跑
- 最後告訴你總報酬、最大回撤、勝率

所以回測不是預測未來，而是檢查這個策略「在過去」看起來如何。

### 2.5 前端、後端、API、資料庫是什麼

先用餐廳比喻：

- `前端`：菜單和店員，負責跟客人互動
- `後端`：廚房，負責真正處理事情
- `API`：店員和廚房的點餐單格式
- `資料庫`：倉庫，存原料與紀錄

在這個專案裡：

- 前端是 `frontend/app/` 裡的頁面
- 後端是 `frontend/app/api/` 裡的 route handlers
- 資料庫是 MySQL
- ORM 是 Prisma，用來幫程式比較方便地操作資料庫

### 2.6 什麼是 CRUD

CRUD 是四種最基本的資料操作：

- `Create` 新增
- `Read` 查詢
- `Update` 修改
- `Delete` 刪除

老師說你們原本太像 CRUD，意思不是你們做錯，而是：

> 如果整個系統只是「新增資料、查資料、改資料、刪資料」，那物件導向的設計深度會不夠明顯。

所以你們這次要補強的是：

- 規則判斷
- 物件之間的責任分工
- 計算流程
- 策略模擬

### 2.7 什麼是物件導向

物件導向可以先理解成：

> 把系統拆成很多「有自己資料、也有自己行為」的小角色。

例如不是只說「有一張 transactions 資料表」，而是說：

- `Portfolio` 知道怎麼整理自己的交易
- `Position` 知道怎麼計算自己目前損益
- `AlertRule` 知道自己什麼時候應該被觸發
- `BacktestEngine` 知道怎麼跑完整個回測流程

也就是：

- 資料不是孤零零放在資料庫
- 行為不是全部堆在 API 裡
- 每個角色都有自己的責任

### 2.8 `Domain`、`Object`、`Class`、`Table` 到底差在哪

這四個詞非常容易混在一起。  
如果這裡沒分清楚，後面看類別圖、資料庫和程式碼時就會一直卡住。

先給最短版本：

- `Domain`：系統正在處理的現實世界問題範圍
- `Object`：程式裡的一個具體角色或實例
- `Class`：用來定義某一類 object 長什麼樣、會做什麼的藍圖
- `Table`：資料庫裡拿來儲存資料的表格

### 2.8.1 先用一個簡單比喻

把你們系統想成一間醫院當然不對，所以我們用你們自己的投資平台來比喻。

你們現在正在處理的世界，是「投資分析」這個世界。  
這個世界裡有：

- 投資組合
- 單筆交易
- 持股狀態
- 警示規則
- 回測策略

這整個世界，就是 `domain`。

而在這個世界裡，你們在程式中創造出很多角色，例如：

- 一個 `Portfolio`
- 一個 `Position`
- 一條 `AlertRule`

這些具體角色，就是 `object`。

而 `class` 則像「角色模板」：

- `Portfolio` class 規定投資組合 object 應該有哪些資料與方法
- `AlertRule` class 規定警示規則應該有哪些共同能力

最後，`table` 是資料庫裡真的把資料存下來的地方，例如：

- `portfolios`
- `transactions`
- `alertrules`
- `backtestruns`

### 2.8.2 四個概念的正式對照

#### `Domain`

`Domain` 是業務世界的範圍。

它回答的是：

> 這個系統到底在處理什麼問題？

在你們系統裡，domain 不是框架自動產生的，而是從需求長出來的。

例如你們的主要 domain 可以是：

- `Portfolio Domain`
- `Alert & Notification Domain`
- `Strategy & Backtest Domain`

這些都是「問題區塊」，不是某一個特定 class。

#### `Class`

`Class` 是程式設計裡的藍圖。

它回答的是：

> 某一類 object 應該長什麼樣？有哪些資料？有哪些行為？

例如：

- `Portfolio` class
- `Position` class
- `AlertRule` class

class 本身比較像「設計圖」，不是資料庫的一列，也不是整個業務世界。

#### `Object`

`Object` 是 class 建立出來的具體實例。

它回答的是：

> 現在程式執行時，這個實際角色是誰？

例如：

- 使用者 A 的「成長型投資組合」可以是一個 `Portfolio` object
- 其中的「2330 持股狀態」可以是一個 `Position` object
- 「2330 價格高於 1000」可以是一個 `PriceAboveAlertRule` object

所以 object 比 class 更具體。

#### `Table`

`Table` 是資料庫中的資料表。

它回答的是：

> 這些資料最後要怎麼存下來？

例如：

- `portfolios` table 存投資組合資料
- `transactions` table 存交易紀錄
- `alertrules` table 存警示規則設定

table 的責任是儲存，不是負責商業邏輯。

### 2.8.3 用你們專題做一組最清楚的例子

#### 例子一：投資組合

- `Domain`：投資組合管理
- `Class`：`Portfolio`
- `Object`：某位使用者真的建立出來的一個投資組合
- `Table`：`portfolios`

重點是：

`Portfolio Domain` 不等於 `Portfolio` class。  
前者是整個問題區塊，後者只是這個區塊裡的一個重要類別。

#### 例子二：警示規則

- `Domain`：警示與通知
- `Class`：`AlertRule`、`PriceAboveAlertRule`
- `Object`：某條真的規則，例如「2330 價格高於 1000」
- `Table`：`alertrules`

這裡最容易搞混的是：

資料庫裡存的是規則設定，  
但系統在執行判斷時，需要的是「會判斷的規則物件」。

所以 table 和 object 不是同一件事。

#### 例子三：回測

- `Domain`：策略與回測
- `Class`：`MovingAverageCrossStrategy`、`BacktestEngine`、`PerformanceReport`
- `Object`：某次真的回測中建立的策略物件、回測結果物件
- `Table`：`backtestruns`、`backtesttrades`

這裡更能看出差別：

資料表只能存結果，  
但真正會「跑回測」的是 object。

### 2.8.4 它們之間的關係應該怎麼記

你可以記這一條：

> 需求先決定 domain，domain 再引導我們設計 class，class 在執行時產生 object，而 object 的部分資料會被存進 table。

也就是：

`需求 -> domain -> class -> object -> table`

這不是唯一流程，但對你們目前的報告理解最有幫助。

### 2.8.5 為什麼這四個一定要分清楚

因為如果混在一起，報告會很容易講錯。

例如下面幾種講法就不夠準：

- 「我們有 `transactions`，所以這就是物件導向」
- 「類別圖就是把資料表畫出來」
- 「domain 就是一個 class」

這些都太混了。

比較準確的講法應該是：

- `transactions` 是資料表
- `PortfolioTransaction` 是 class
- 某筆買進紀錄在程式執行時可以成為 transaction object
- 它們一起屬於投資組合相關的 domain

### 2.8.6 你們報告時可以直接這樣講

如果老師問：

> Domain 跟 object 有什麼關係？

你們可以答：

> Domain 是我們系統要處理的業務世界，例如投資組合、警示、回測這些問題範圍；object 則是我們在程式裡用來表達這些概念的具體角色。換句話說，domain 是問題空間，object 是程式中的實際承載者。

如果老師再問：

> 那 class 和 table 呢？

你們可以接著答：

> Class 是 object 的藍圖，定義這類角色有哪些資料和行為；table 則是資料庫的儲存結構，負責把部分資料持久化。它們彼此有關，但不是同一層的概念。

---

## 3. 我們這個系統到底在做什麼

你們的系統目前可以拆成四個主要功能區：

### 3.1 股票查詢

使用者可以：

- 搜尋股票代號
- 看公司名稱
- 看歷史價格
- 看財報資料

這部分像是系統的資料入口。

### 3.2 投資組合管理

使用者可以：

- 建立投資組合
- 記錄買進賣出
- 查看目前持股
- 查看損益與市值

這部分是從「看市場」走到「管理自己的持股」。

### 3.3 警示與通知

使用者可以：

- 設定價格高於某值
- 設定價格低於某值
- 設定單日漲幅或跌幅超過某值
- 讓系統檢查條件是否成立
- 成立時建立通知

這部分讓系統不只是展示資料，而是會主動判斷。

### 3.4 策略回測

使用者可以：

- 選股票
- 選日期區間
- 輸入短均線與長均線參數
- 設定初始資金
- 執行回測
- 查看結果與交易紀錄

這部分是你們這次最重要的複雜度來源之一。

---

## 4. 系統整體流程，從使用者點按鈕到資料出來，中間發生了什麼

這一段是給「不懂網站運作」的組員看。

### 4.1 以新增警示規則為例

假設使用者在警示頁面輸入：

- 股票：2330
- 規則：價格高於
- 門檻：1000

系統流程是：

1. 前端頁面把資料送到 `/api/alerts`
2. API 檢查使用者有沒有登入
3. API 檢查輸入資料是否合法
4. API 確認股票代號真的存在
5. API 把這筆規則寫進 `alertrules` 資料表
6. API 回傳建立完成的規則資訊給前端
7. 前端把新規則顯示在表格上

如果之後執行評估：

1. 前端呼叫 `/api/notifications/evaluate`
2. API 讀出目前使用者所有啟用中的規則
3. API 透過 `createAlertRule()` 把資料庫資料轉成真正的規則物件
4. `AlertMarketDataService` 去取市場資料
5. `AlertEvaluator` 判斷哪些規則被觸發
6. `NotificationService` 把通知存進資料庫
7. 前端再去讀通知列表顯示結果

### 4.2 以執行回測為例

假設使用者想測 2330 的均線交叉策略。

流程是：

1. 前端回測頁面把股票、日期、短均線、長均線、初始資金送到 `/api/backtests`
2. API 檢查參數是否齊全
3. API 檢查股票是否存在
4. API 建立 `MovingAverageCrossStrategy`
5. `BacktestMarketDataService` 讀取歷史股價
6. `BacktestEngine` 執行整個模擬流程
7. 系統得到交易紀錄、equity curve、報酬率、最大回撤、勝率
8. API 把結果存進 `backtestruns` 和 `backtesttrades`
9. 前端顯示回測摘要與圖表

### 4.3 以投資組合摘要為例

當使用者進入投資組合頁：

1. 前端呼叫 `/api/portfolios`
2. API 從資料庫讀出投資組合與交易紀錄
3. API 把資料轉成 `Portfolio` 物件
4. `Portfolio` 用自己的交易建立 `Position`
5. `PortfolioPriceService` 讀取最新價格
6. `Portfolio.createSnapshot()` 算出市值、成本、未實現損益
7. API 把整理好的結果回傳給前端

重點在這裡：

> 計算不是直接寫死在頁面，也不是全部寫在 API 裡，而是交給真正的 domain object 做。

---

## 5. 這次報告為什麼比原本更符合 OOAD

老師原本擔心的是：

- 你們功能很多，但很多都是 CRUD
- 物件設計不夠突出
- 複雜度雖然有，但偏低

你們後來補強的三個方向，正好是 OOAD 會在意的點。

### 5.1 Portfolio Domain 重構

以前比較像：

- 資料庫有交易資料
- API 把資料撈出來
- 在某個地方順手算一下總和

現在變成：

- `Portfolio` 負責聚合交易
- `Position` 負責單一持股狀態
- `PortfolioTransaction` 負責單筆交易行為
- `TransactionValidator` 負責交易合法性
- `PortfolioPriceService` 負責取價格

這表示「投資組合」不只是資料表，而是真正的領域物件。

### 5.2 Alert & Notification Domain

這一塊的重要性在於它有「規則」。

如果今天所有規則都寫成：

```js
if (ruleType === "PRICE_ABOVE") { ... }
else if (ruleType === "PRICE_BELOW") { ... }
else if (ruleType === "PERCENT_CHANGE_UP") { ... }
```

那就很難擴充，也不夠有物件設計感。

現在你們做的是：

- 有抽象的 `AlertRule`
- 有具體的 `PriceAboveAlertRule`
- 有具體的 `PriceBelowAlertRule`
- 有具體的 `PercentChangeUpAlertRule`
- 有具體的 `PercentChangeDownAlertRule`

每個規則物件自己知道：

- 什麼時候會被觸發
- 自己該怎麼顯示條件
- 觸發後通知要長什麼樣子

這就比單純 CRUD 高一個層次。

### 5.3 Strategy & Backtest Domain

這塊是你們最有「系統行為」的地方。

回測不是只存一筆資料，它是完整流程：

- 驗證參數
- 載入歷史資料
- 計算指標
- 產生買賣訊號
- 模擬交易
- 計算績效
- 儲存結果

而且你們不是把這些寫成一個 500 行的大函式，而是拆成：

- `MovingAverageCrossStrategy`
- `BacktestEngine`
- `BacktestTrade`
- `PerformanceReport`
- `BacktestMarketDataService`

這就是 OOAD 想看到的責任分工。

---

## 6. 簡報中的專業名詞，到底在講什麼

這一段是組員最容易卡住的地方。

### 6.1 Use Case

Use Case 中文通常叫「使用案例」。

意思不是程式碼，而是：

> 使用者想完成什麼事情，系統要怎麼回應。

例如：

- 查詢股票資訊
- 管理投資組合
- 建立警示規則
- 執行策略回測

Use Case 圖回答的是：

> 系統裡有哪些角色，他們可以做哪些事。

### 6.2 Actor

Actor 就是「跟系統互動的角色」。

在你們系統裡有：

- 投資者 / 使用者
- 管理者 / 資料維護者
- FinLab 資料來源

### 6.3 Activity Diagram

Activity Diagram 是「活動圖」。

它像流程圖，但更偏系統行為。

它要回答的是：

> 這個功能從開始到結束，中間有哪幾個步驟、哪裡會分支、哪裡會停止。

你們選的最複雜案例是「執行策略回測」，很合理，因為它最能展示：

- 驗證
- 條件判斷
- 資料載入
- 策略物件
- 模擬交易
- 績效輸出

### 6.4 Class Diagram

Class Diagram 是「類別圖」。

它不是資料表圖，也不是畫得越多越好。  
它要回答的是：

> 系統裡有哪些重要物件，它們各自有什麼資料與行為，彼此之間怎麼關聯。

例如：

- `Portfolio` 有交易與持股
- `Position` 會算平均成本與損益
- `AlertRule` 是抽象規則
- `BacktestEngine` 會執行策略

### 6.4.1 類別圖到底不是在畫什麼

很多人第一次看類別圖，會誤以為它只是：

- 把資料表換個長相畫出來
- 把程式檔案名稱列一列
- 把所有 class 全部塞上去

這三種理解都不夠準。

類別圖真正想回答的是：

> 如果把系統想成很多角色一起合作，那有哪些角色最重要？每個角色各自負責什麼？它們怎麼互相合作？

所以類別圖畫的不是「全部」，而是「最關鍵的物件責任」。

### 6.4.2 看類別圖時，應該先看哪三件事

看類別圖不要一開始就盯著每一條線。  
先看這三件事：

1. 哪個類別是核心
2. 哪些類別是幫核心完成事情
3. 類別之間是「擁有關係」、「使用關係」還是「繼承關係」

以你們的系統來說：

- Portfolio 類別圖裡，核心是 `Portfolio`
- Alert 類別圖裡，核心概念是 `AlertRule`
- Backtest 類別圖裡，核心執行者是 `BacktestEngine`

### 6.4.3 類別圖中的三種常見關係，白話怎麼看

#### 擁有 / 聚合

像 `Portfolio` 擁有很多交易，並從交易建立持股部位。

白話就是：

> 這個物件裡面管著其他資料，並把它們組織起來。

#### 使用

像 `Portfolio` 會使用 `PortfolioPriceService`，`AlertEvaluator` 會使用 `AlertRule`，`BacktestEngine` 會使用 `MovingAverageCrossStrategy`。

白話就是：

> 這個物件自己不是什麼都做，它會找其他角色幫忙。

#### 繼承

像 `PriceAboveAlertRule`、`PriceBelowAlertRule` 都繼承 `AlertRule`。

白話就是：

> 它們本質上屬於同一類東西，但每一種有自己的特別規則。

### 6.4.4 為什麼類別圖不能只畫資料表

如果你們只畫資料表，老師看到的是：

- 有哪些欄位
- 哪些表彼此關聯

但看不到：

- 誰負責計算
- 誰負責驗證
- 誰負責規則判斷
- 誰負責模擬流程

而 OOAD 的重點正是在後面這幾項。

所以你們這次類別圖故意把焦點放在：

- `Portfolio`
- `Position`
- `TransactionValidator`
- `AlertRule`
- `AlertEvaluator`
- `BacktestEngine`
- `PerformanceReport`

這些才是有「行為」的物件。

### 6.5 Strategy Pattern

Strategy Pattern 的核心觀念是：

> 把「可能替換的演算法」封裝成可互換的物件。

在你們專題裡：

- 不同警示規則，是不同策略
- 不同回測策略，也可以是不同策略

好處是未來要加新規則或新回測方法時，不必把主流程改得很亂。

### 6.6 Factory Pattern

Factory Pattern 的核心觀念是：

> 把「建立物件」這件事集中處理。

在你們專題裡：

- 資料庫只存 `rule_type`
- 但系統真正執行時需要的是具體物件
- 所以 `createAlertRule()` 會根據 `rule_type` 建立對應的規則物件

這樣 API 不需要知道每個具體類別細節。

### 6.7 Domain

Domain 中文可理解成「領域」。

意思是把系統切成幾塊有明確業務意義的區域。

你們這次最重要的三個 domain 是：

- Portfolio Domain
- Alert & Notification Domain
- Strategy & Backtest Domain

這比只照資料表拆功能更有設計感。

---

## 7. 把簡報 13 頁逐頁講懂

這一段是報告前最值得反覆看的部分。

### 第 1 頁：封面

這頁的任務不是講細節，而是建立主題。

你們要讓老師一開始就知道：

- 專題是股市分析平台
- 不是純查詢網站
- 這次重點是投資組合、警示、策略回測

最安全的講法：

> 我們這次專題延續之前資料庫課程的股市查詢平台，但在 OOAD 課程中，我們把重點放在規則判斷、投資組合建模，以及策略回測等更能展現物件設計的部分。

### 第 2 頁：回應老師回饋

這頁要承認原本問題，然後證明你們有改。

你們的核心說法是：

- 原本功能很多，但偏 CRUD
- 這次把系統升級成規則與策略驅動平台

這頁不是認錯，而是展示你們有分析能力。

### 第 3 頁：進度總結與分工

這頁要讓老師看到：

- 你們不是只畫圖
- 你們真的有做資料庫、API、UI、domain 重構

如果老師問「目前做到哪」：

就回答：

- MySQL 重建完成
- FinLab 市場資料可匯入
- Portfolio Domain 已重構
- Alerts 與 Backtests 頁面與 API 已串接

### 第 4 頁：使用案例圖

這頁的重點是：

- 誰在用系統
- 能做哪些事

不要陷入畫圖細節，重點講兩件事：

1. 使用者不只是查資料，也會管理投資組合、設警示、跑回測
2. 管理者與外部資料來源負責市場資料更新

### 第 5 頁：活動圖

這頁是最能展現複雜度的地方。

報告時一定要明講：

- 為什麼選回測當最複雜案例
- 哪裡有分支判斷
- 哪裡不是 CRUD

你們可以這樣講：

> 這個流程不只是把資料存進資料庫，而是要先驗證參數、確認資料是否足夠、建立策略物件、模擬交易，最後再輸出績效結果。

### 第 6 頁：架構圖

這頁要回答：

> 頁面、API、domain、資料庫之間怎麼合作。

老師通常想知道的是：

- 你們有沒有分層
- 業務邏輯是不是全塞在 API

你們可以強調：

- 前端負責顯示與互動
- API 負責接請求與權限檢查
- Domain 負責商業邏輯
- Prisma 負責跟 MySQL 溝通

### 第 7 頁：資料儲存設計

這頁要回答：

> 哪些資料存在哪些表，執行時誰會用到。

這頁不是單純背資料表名稱，而是要讓老師看到：

- 資料表和物件設計有對應
- 市場資料、投資組合資料、規則資料、回測資料是不同層次

### 第 8 頁：UI Mockups / Prototype Screens

這頁主要是補足「系統有做出來」。

重點不是畫面漂不漂亮，而是：

- 使用者怎麼進入功能
- 各功能怎麼串起來

這頁可以很自然地接回使用案例圖。

### 第 9 頁：類別圖 A - Portfolio Domain

這頁是要說明投資組合不只是資料表。

報告時可以依順序講：

1. `Portfolio` 是核心聚合物件
2. `PortfolioTransaction` 表示單筆交易
3. `Position` 表示某檔持股的狀態
4. `TransactionValidator` 驗證交易
5. `PortfolioPriceService` 幫忙拿價格

這頁如果老師追問「為什麼這樣拆」，你們可以回答：

> 因為投資組合本身只是容器概念，但真正的計算責任其實分散在不同層次。單筆交易有自己的成本與收入邏輯，單一持股有自己的平均成本與損益邏輯，交易是否合法也有獨立規則，所以我們把這些責任拆開，而不是全部塞進 Portfolio 或 API。

### 第 10 頁：類別圖 B - 警示與回測領域

這頁是你們整份報告最關鍵的 OOAD 證據之一。

一定要講清楚兩件事：

1. 警示不是一個 if-else，而是一組規則物件
2. 回測不是一個函式，而是一組策略、引擎、交易、報告物件

這頁如果老師追問「為什麼這樣拆」，你們可以回答：

> 因為警示規則和回測策略都是未來可能持續增加的功能。如果一開始就全部寫死在 API 裡，之後每加一種規則或策略都要一直修改主流程。現在用物件拆開後，新增功能時只要擴充對應類別，不需要重寫整條流程。

### 第 11 頁：Strategy Pattern

這頁不要只背定義，要說它在你們系統裡怎麼活著。

最好的講法是：

> 因為警示規則和回測策略都可能一直增加，所以我們把它們做成可替換策略，讓主流程維持穩定。

### 第 12 頁：Factory Pattern

這頁一樣不要只講課本。

你們真正的使用場景是：

- 資料庫存的是規則類型
- 系統執行時需要真正的規則物件
- 所以用 factory 把資料紀錄轉成具體物件

### 第 13 頁：結論與下一步

這頁要收束成一句有力的話：

> 這次的重點不只是功能變多，而是系統已經從資料展示網站，變成有規則判斷、物件責任分工與策略模擬能力的 OOAD 專題。

---

## 8. 實際程式碼對照表

下面這一段是給想從報告追到程式的組員。

### 8.1 頁面

- 警示頁：[alerts/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/alerts/page.jsx)
- 回測頁：[backtests/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/backtests/page.jsx)
- 投資組合頁：[portfolios/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/portfolios/page.jsx)

### 8.2 API

- 警示規則 API：[api/alerts/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/alerts/route.js)
- 通知評估 API：[api/notifications/evaluate/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/notifications/evaluate/route.js)
- 回測 API：[api/backtests/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/backtests/route.js)
- 投資組合 API：[api/portfolios/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/portfolios/route.js)

### 8.3 Portfolio Domain

- [Portfolio.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/Portfolio.js)
- [Position.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/Position.js)
- [PortfolioTransaction.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/PortfolioTransaction.js)
- [TransactionValidator.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/TransactionValidator.js)
- [PortfolioPriceService.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/portfolio/PortfolioPriceService.js)

### 8.4 Alert Domain

- [rules.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/rules.js)
- [AlertEvaluator.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/AlertEvaluator.js)
- [NotificationService.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/NotificationService.js)
- [MarketSnapshot.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/MarketSnapshot.js)
- [AlertMarketDataService.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/alerts/AlertMarketDataService.js)

### 8.5 Backtest Domain

- [BacktestEngine.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/BacktestEngine.js)
- [MovingAverageCrossStrategy.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/MovingAverageCrossStrategy.js)
- [PerformanceReport.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/PerformanceReport.js)
- [BacktestTrade.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/BacktestTrade.js)
- [BacktestMarketDataService.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/lib/domain/backtests/BacktestMarketDataService.js)

### 8.6 資料庫 Schema

- [schema.prisma](/Users/edisonlin/Documents/Stock-Query-Website/frontend/prisma/schema.prisma)

---

## 9. 用真正的程式邏輯，再講一次三大領域

這一段是從「會看中文說明」進一步到「知道程式真正怎麼做」。

在這一節，你們要特別注意一個觀念：

> 物件不是為了看起來專業才拆，而是因為每個物件真的負責不同問題。

如果一個類別同時負責：

- 接 API
- 驗證輸入
- 算成本
- 拿資料庫資料
- 組通知
- 回傳畫面格式

那它就會變得很難懂、很難改，也很難測。

所以好的物件設計，核心不是「拆很多 class」，而是：

> 每個 class 只負責它最該負責的事。

### 9.1 Portfolio Domain 的核心邏輯

`Portfolio` 會把所有交易按時間排序，再一筆一筆套到各自的 `Position` 上。

`Position.applyTransaction()` 的邏輯很重要：

- 如果是買進，就增加股數和成本
- 如果是賣出，就檢查庫存是否足夠
- 然後計算已實現損益

最後 `Portfolio.createSnapshot()` 會整理出：

- holdings
- totalCostBasis
- totalMarketValue
- realizedPnl
- unrealizedPnl
- unrealizedPnlPercent

所以投資組合不是單純加總，而是有自己的計算流程。

### 9.1.1 為什麼 Portfolio 要這樣設計

很多初學者會直覺把投資組合寫成：

- 一張 `portfolios` 表
- 一張 `transactions` 表
- 然後在 API 裡直接加總

這樣短期看起來很快，但問題很多：

- 平均成本怎麼算，會散落在不同 API
- 賣出時怎麼判斷庫存夠不夠，可能每個地方都要重寫
- 同樣的損益計算邏輯，會重複出現在多個頁面或路由

所以你們這次把責任拆成幾個角色。

#### `Portfolio`

`Portfolio` 的角色不是算所有細節，而是當「總指揮」。

它負責：

- 收集所有交易
- 依股票分組
- 建立各自的 `Position`
- 組合出整體摘要

這樣設計的好處是：

- 投資組合層級的邏輯集中
- API 只要問 Portfolio 要結果，不用自己重新算
- 未來如果投資組合摘要要改格式，只改這裡比較合理

#### `PortfolioTransaction`

單筆交易不是純資料，它自己知道：

- 自己是不是買進
- 自己是不是賣出
- 自己的 gross amount 是多少
- 買進總成本是多少
- 賣出實際收入是多少

這樣設計的好處是：

- 每一筆交易的商業邏輯集中在交易物件本身
- 其他物件不用一直重複寫 `quantity * price` 或手續費邏輯

#### `Position`

`Position` 代表「某一檔股票在目前這個投資組合裡的狀態」。

它存在的原因很重要：

> 使用者真正關心的不是每一筆交易本身，而是某檔股票現在總共剩多少、平均成本多少、現在賺賠多少。

這就是 Position 的工作。

它負責：

- 累積股數
- 累積成本
- 計算平均成本
- 計算目前市值
- 計算未實現損益
- 計算已實現損益

這樣設計的好處是：

- 「單筆交易」和「目前持股狀態」分開
- 計算邏輯更自然
- 未來如果要做單一持股分析，可以直接從 Position 擴充

#### `TransactionValidator`

很多人會覺得驗證寫在 API 就好，但這樣會讓 API 很快變胖。

你們把它獨立出來，是因為交易驗證本身就是一套規則，例如：

- 欄位有沒有缺
- 類型對不對
- 股數和價格是不是大於 0
- 賣出時庫存夠不夠

這樣設計的好處是：

- 驗證邏輯集中
- API 比較乾淨
- 未來如果新增更多交易規則，不會污染其他類別

#### `PortfolioPriceService`

為什麼價格服務不放進 `Portfolio`？

因為 `Portfolio` 的核心責任是理解自己的交易與持股，不是直接負責從資料庫抓市場價格。

所以把「取外部價格資料」拆成 service，有兩個好處：

- 領域計算和資料來源解耦
- 未來價格來源如果變更，比較容易替換

### 9.1.2 Portfolio 類別圖要怎麼講得漂亮

你們可以用這個版本：

> 在 Portfolio Domain 中，我們把投資組合視為核心聚合物件。Portfolio 負責整體組合與摘要，PortfolioTransaction 負責單筆交易邏輯，Position 負責單一持股狀態，TransactionValidator 負責交易合法性，而 PortfolioPriceService 負責提供市場價格。這樣做的好處是，每個物件只處理自己最擅長的責任，整體比把所有邏輯塞進 API 或單一類別更容易維護與擴充。

### 9.1.3 如果不這樣設計，會發生什麼問題

如果全部塞在一個 API 或一個大類別：

- 買賣驗證、損益計算、價格查詢混在一起
- 一改平均成本計算，可能很多地方都要改
- 新增功能時容易破壞既有邏輯
- 組員也會更難分工

所以這樣的拆法不只是學術上好看，實務上也比較好維護。

### 9.2 Alert Domain 的核心邏輯

`AlertRule` 是抽象父類別。它規定所有規則都要有：

- `isTriggered(snapshot)`
- `getConditionLabel()`
- `buildNotification(snapshot)`

具體規則像：

- `PriceAboveAlertRule`
- `PriceBelowAlertRule`
- `PercentChangeUpAlertRule`
- `PercentChangeDownAlertRule`

每種規則用不同條件判斷是否觸發。

而 `createAlertRule()` 做的事情就是：

> 根據資料庫中的 `rule_type`，建立正確的規則物件。

### 9.2.1 為什麼 Alert Domain 要這樣設計

警示看起來好像只是「存一條規則」，但真正麻煩的是：

- 每種規則的判斷方式不一樣
- 每種規則的人類可讀說明不一樣
- 每種規則觸發後要產生通知

如果把這些都寫在同一個函式裡，程式通常會變成一大串 `if-else`。

所以你們才會有：

- `AlertRule`：共同抽象
- `PriceAboveAlertRule`：價格高於某值
- `PriceBelowAlertRule`：價格低於某值
- `PercentChangeUpAlertRule`：單日漲幅達標
- `PercentChangeDownAlertRule`：單日跌幅達標

這樣的拆法表示：

> 規則雖然不同，但它們都屬於同一種概念，所以共用介面；真正不同的判斷細節，交給子類別自己實作。

### 9.2.2 為什麼需要抽象的 AlertRule

抽象 `AlertRule` 的價值在於統一規則的「外觀」。

也就是說，不管是哪一種警示規則，系統都可以假設它有這三個能力：

- `isTriggered(snapshot)`
- `getConditionLabel()`
- `buildNotification(snapshot)`

這樣 `AlertEvaluator` 就不用知道自己手上的規則到底是價格型、漲幅型還是跌幅型。

它只要說：

> 你是一條規則，那你自己告訴我有沒有被觸發。

這樣設計的好處是：

- 主流程更單純
- 子類別更容易擴充
- 新增規則時，不用一直改 evaluator 主程式

### 9.2.3 AlertEvaluator 為什麼要獨立存在

很多人會問：

> 規則自己都會判斷了，為什麼還要有 AlertEvaluator？

因為「單條規則知道怎麼判斷自己」和「系統知道如何批次評估所有規則」是兩個不同責任。

`AlertEvaluator` 的角色比較像協調者，它負責：

- 逐條跑規則
- 配對市場快照
- 整理被觸發的結果

這樣設計的好處是：

- 規則本身保持簡單
- 批次評估邏輯集中
- 未來如果要加上去重、過濾、排程邏輯，也有合理位置可放

### 9.2.4 NotificationService 為什麼不放進規則裡

因為「規則被觸發」和「把結果存成通知」是兩件事。

規則物件該負責的是：

- 我有沒有被觸發
- 觸發後通知內容應該怎麼描述

但真正把通知寫進資料庫，是 `NotificationService` 的責任。

這樣設計的好處是：

- 領域判斷和資料持久化分開
- 日後如果通知改成 email、LINE、推播，也比較容易擴充

### 9.2.5 createAlertRule 為什麼很重要

資料庫存的是：

- `PRICE_ABOVE`
- `PRICE_BELOW`
- `PERCENT_CHANGE_UP`

這些只是「型別代號」，不是可直接執行的物件。

`createAlertRule()` 的作用就是：

> 把資料紀錄轉成真正有行為的物件。

這樣的好處是：

- API 不需要知道所有具體類別
- 建立物件的邏輯集中
- 新規則加入時，修改點更少

### 9.2.6 Alert 類別圖要怎麼講得漂亮

你們可以這樣講：

> 在 Alert Domain 中，我們把警示規則抽象成 AlertRule，並由不同的具體規則類別繼承它。這樣每種規則都能保有自己的判斷方式，同時維持一致的介面。AlertEvaluator 負責批次評估規則，NotificationService 負責通知持久化，因此整個流程比把規則判斷、通知建立和資料寫入混在一起更清楚。

### 9.2.7 如果不這樣設計，會發生什麼問題

如果所有規則都寫在單一函式中：

- 規則一多，if-else 會越來越長
- 修改某一條規則時容易影響其他規則
- 很難清楚分辨「規則判斷」和「通知寫入」
- 新增規則時風險較高

所以這種拆法的最大價值是擴充性和清晰度。

### 9.3 Backtest Domain 的核心邏輯

`MovingAverageCrossStrategy` 負責產生訊號。

它會：

- 算短均線
- 算長均線
- 如果短均線由下往上突破長均線，就產生 BUY
- 如果短均線由上往下跌破長均線，就產生 SELL

`BacktestEngine` 負責把這些訊號拿來模擬交易。

它會：

- 用初始資金進場
- 記錄每次買進賣出
- 追蹤 cash 和 quantity
- 每天算 equity value
- 最後如果還有持股就強制平倉

`PerformanceReport.fromBacktest()` 則負責產生績效：

- finalValue
- totalReturnPercent
- maxDrawdownPercent
- winRatePercent
- tradeCount

這就是為什麼回測很適合當最複雜使用案例。

### 9.3.1 為什麼 Backtest Domain 要這樣設計

回測最容易被寫壞的方式，就是全部塞進一個超大函式：

- 在同一段程式裡算均線
- 判斷買賣
- 模擬進出場
- 計算報酬
- 組圖表資料
- 存資料庫

這樣短期可能跑得動，但非常難維護。

所以你們把回測拆成幾個角色。

#### `MovingAverageCrossStrategy`

它的責任只有一個：

> 根據價格序列，決定哪一天應該產生 BUY 或 SELL 訊號。

它不處理：

- 資金怎麼變
- 交易怎麼記錄
- 績效怎麼算

這樣設計的好處是：

- 策略本身很純粹
- 未來換 RSI 策略時，不必動到回測引擎

#### `BacktestEngine`

它的角色是執行者。

它負責：

- 接收策略給出的訊號
- 模擬何時買進賣出
- 更新 cash 和 quantity
- 累積 equity curve
- 建立交易紀錄

這樣設計的好處是：

- 策略和執行流程分開
- 同一個 engine 理論上可以搭配不同策略
- 回測主流程集中，較容易解釋與測試

#### `BacktestTrade`

為什麼交易也要是獨立物件？

因為每一筆回測交易不只是表格的一列，它有自己的語意：

- 交易型別
- 日期
- 價格
- 股數
- 現金變化
- 績效結果
- 交易原因

這樣設計的好處是：

- 每筆交易都能被明確描述
- 儲存時可以用 `toPersistence()` 轉成資料庫格式
- 日後若要顯示更完整交易明細，也容易擴充

#### `PerformanceReport`

績效計算獨立出來，是因為：

> 「如何模擬交易」和「如何統計績效」其實是兩個不同問題。

`PerformanceReport` 負責：

- final value
- total return
- max drawdown
- win rate
- trade count

這樣設計的好處是：

- 引擎專心處理模擬流程
- 績效公式集中
- 日後新增更多績效指標時，不必讓 engine 越來越胖

#### `BacktestMarketDataService`

它負責拿歷史價格資料。

這樣做的好處是：

- 回測邏輯不用直接知道 Prisma 怎麼查
- 資料來源未來可以替換
- 回測 domain 和資料存取分離

### 9.3.2 Backtest 類別圖要怎麼講得漂亮

你們可以這樣講：

> 在 Backtest Domain 中，我們把策略生成、流程執行、交易紀錄與績效統計分成不同物件。MovingAverageCrossStrategy 負責產生訊號，BacktestEngine 負責模擬交易流程，BacktestTrade 表示單筆回測交易，PerformanceReport 負責產出績效指標。這樣的設計讓策略可以替換、流程可以重用、績效計算可以獨立擴充。

### 9.3.3 如果不這樣設計，會發生什麼問題

如果把所有回測邏輯塞在一個地方：

- 新增策略時容易破壞既有流程
- 績效計算和交易模擬會互相糾纏
- 程式很難解釋，也很難測試
- 類別圖會退化成「一個大類別做全部事情」

所以這樣的拆法最大的好處，是讓回測從「一段大流程」變成「可解釋、可維護、可擴充的物件合作」。

### 9.4 一個最重要的總結：你們類別圖到底為什麼這樣設計

如果要把全部設計理由濃縮成一句話，就是：

> 因為我們希望每個重要問題，都由最適合的物件負責，而不是把所有邏輯塞進 API、資料表或單一大類別。

再拆開來說，就是四個理由：

1. 把不同責任分開，避免單一類別過胖
2. 讓未來新增規則或策略時，只改局部，不要重寫全部
3. 讓每個物件名稱本身就能說明它的用途
4. 讓類別圖真正能反映系統行為，而不只是資料表結構

### 9.5 你們可以直接背的高品質回答

如果老師問：

> 為什麼你們的類別圖要這樣設計？

你們可以直接回答：

> 我們的設計原則是把不同責任拆到最合適的物件中。例如在投資組合領域，Portfolio 負責整體聚合，Position 負責單一持股計算，TransactionValidator 負責交易規則；在警示領域，AlertRule 負責規則抽象，AlertEvaluator 負責批次評估，NotificationService 負責通知持久化；在回測領域，Strategy 負責產生訊號，Engine 負責模擬流程，PerformanceReport 負責績效統計。這樣設計的好處是責任清楚、擴充性高，也更能符合 OOAD 對物件合作與行為分工的要求。

---

## 10. 報告時最容易被問的問題

這段直接當口試準備。

### Q1：你們這個系統和以前資料庫課程的差別是什麼？

可以答：

> 以前比較偏資料查詢與 CRUD，這次我們把投資組合、警示規則與策略回測整理成 domain objects，讓系統有更明確的責任分工與規則判斷流程，更符合 OOAD 的要求。

### Q2：為什麼說原本太像 CRUD？

可以答：

> 因為原本很多功能主要是新增、查詢、修改、刪除資料，雖然功能存在，但物件之間的互動與規則判斷不夠明顯。這次新增警示規則與回測流程後，系統開始有真正的行為與演算法。

### Q3：為什麼回測能增加複雜度？

可以答：

> 因為回測不是單一資料操作，它包含參數驗證、歷史資料檢查、策略物件、訊號生成、交易模擬與績效報告，是一條完整的業務流程。

### Q4：為什麼要有 `AlertRule` 這種抽象類別？

可以答：

> 因為不同規則的判斷方式不一樣，但它們都屬於「警示規則」這個概念。用抽象類別可以統一介面，讓評估器不用知道每一種規則的內部細節。

### Q5：Strategy Pattern 在你們系統裡真的有用到嗎？

可以答：

> 有。警示規則和回測策略都可以視為可替換演算法。主流程只知道要執行規則或策略，不需要依賴某個具體實作，因此未來新增規則或策略時，主流程可以維持穩定。

### Q6：Factory Pattern 在你們系統裡的實際用途是什麼？

可以答：

> 資料庫只存規則類型，例如 `PRICE_ABOVE`，但系統執行判斷時需要真正的物件，所以 `createAlertRule()` 會依據類型建立正確的規則類別，這就是 factory 的角色。

### Q7：為什麼你們還是保留 MySQL？

可以答：

> 因為這個專題原本就是從資料庫課程延續而來，而目前 Prisma + MySQL 已經完整串接。對這次 OOAD 報告而言，重點不在換資料庫，而在物件設計、領域拆分與規則流程。除非未來部署需求改變，否則目前沒有必要為了「比較新」而重換資料庫。

---

## 11. 組員最低限度一定要背熟的內容

如果有人真的沒時間，不可能整份都讀完，至少要熟這些：

### 必背 1：一句話講專題

> 這是一個股市投資組合、警示與策略回測分析平台，我們把原本偏 CRUD 的查詢網站，提升成規則與策略驅動的 OOAD 專題。

### 必背 2：三個補強方向

- Portfolio Domain 重構
- Alert & Notification Domain
- Strategy & Backtest Domain

### 必背 3：為什麼不是只有 CRUD

因為系統現在有：

- 規則判斷
- 交易驗證
- 回測流程
- 設計模式
- 物件責任分工

### 必背 4：兩個設計模式

- Strategy Pattern：讓規則與策略可以替換
- Factory Pattern：讓資料紀錄可以轉成正確的規則物件

### 必背 5：最複雜使用案例

就是執行策略回測，因為它包含驗證、歷史資料檢查、訊號生成、交易模擬、績效計算。

---

## 12. 建議你們怎麼一起準備

最有效率的方式不是每個人各自硬背整份，而是分層準備。

### 第一輪：所有人都先讀

- 本手冊第 1 到第 7 節
- 逐字稿檔案
- 簡報 13 頁

目的只是建立共同語言。

### 第二輪：依分工各自加深

- 負責資料庫的人：重看 schema、FinLab 匯入、Prisma
- 負責投資組合的人：重看 Portfolio Domain 與投資組合 API
- 負責警示的人：重看 AlertRule、AlertEvaluator、通知流程
- 負責回測的人：重看 strategy、engine、performance report

### 第三輪：互相口頭解釋

每個人輪流用白話講一次：

- 這個功能在幹嘛
- 流程怎麼走
- 為什麼它不是 CRUD

如果講不出來，就代表還沒真的理解。

---

## 13. 給你們報告時的說話原則

這幾條比背一堆術語更重要。

### 原則 1：先白話，再專業

不要一開始就說：

> 我們實作了 domain-driven responsibility decomposition with strategy abstraction...

這種講法聽起來很厲害，但如果自己沒完全掌握，很容易被追問卡住。

比較安全的是：

> 這個功能的白話意思是……  
> 在設計上，我們把它拆成……  
> 對應的 OOAD 概念是……

### 原則 2：每一頁都要回答一個問題

例如：

- 第 4 頁回答「誰可以做什麼」
- 第 5 頁回答「最複雜流程怎麼跑」
- 第 6 頁回答「系統怎麼分層」
- 第 9、10 頁回答「重要物件怎麼分工」

### 原則 3：不要把資料表當成物件設計

資料表是資料表，類別圖是類別圖。  
兩者相關，但不是同一件事。

你們要一直強調：

> 我們不是只設計資料表，而是設計會處理規則、計算與模擬的物件。

### 原則 4：有實作就講實作，沒做完不要硬裝

如果某功能還是 prototype，就說 prototype。  
如果目前只支援均線交叉，就說目前只支援均線交叉。

這比亂吹更安全，也比較像真的有掌握系統。

---

## 14. 最後的總結

如果你現在要把整份專題濃縮成最核心的幾句話，可以記這個版本：

1. 這個專題是一個股市分析平台，功能包含股票查詢、投資組合、警示通知、策略回測。
2. 原本系統偏資料查詢與 CRUD，老師提醒我們複雜度不夠明顯。
3. 因此我們新增並重構三個核心 domain：Portfolio、Alerts、Backtests。
4. 這些功能不是只存資料，而是包含交易驗證、規則判斷、訊號產生、交易模擬與績效計算。
5. 所以這次報告真正想展示的是：系統已經從資料網站，變成有明確物件責任與 OOAD 結構的分析平台。

---

## 15. 你們接下來應該怎麼用這份手冊

最實際的用法是：

1. 所有人先讀第 1 到第 7 節，把基本概念搞懂。
2. 再對著簡報讀第 7 節的逐頁解說。
3. 之後每個人看第 8 到第 10 節，對照自己負責的程式部分。
4. 最後用第 10 節常見問答做模擬口試。

如果你們要，我下一步可以直接再幫你們做兩份補充資料：

- 一份「組員快速背誦版」，壓縮成 2 到 3 頁
- 一份「老師可能追問問題與標準答法」，專門做口試準備
