# OOAD Use Case Roadmap

> 專案：股市投資組合、警示與策略回測分析平台  
> 用途：整理本次報告建議使用的 11 個 use cases 與候選清單，標示目前完成狀態，並作為後續 OOAD 導向實作的追蹤清單

---

## 1. 先講結論

依 `OOAD.P2` 的要求：

> `2 to 4 use cases per member`

你們這組是 4 人，所以合理目標是：

- 最低達標：`8` 個 use cases
- 較穩妥：`10 到 12` 個 use cases

目前如果只拿本次已經整理好的 8 個 use cases 去報告，`數量上是達標的`。  
但從 OOAD 呈現完整度與風險控管來看，這次更建議直接升級成 `11 個主要 use cases`，另外再準備 `3 到 5 個候選 use cases` 當備援。

這樣做的目的不是硬湊數量，而是避免口頭報告後如果老師認為其中某個 use case 太大、太小、太像結果狀態，整體數量就掉到不穩定區間。

---

## 2. 狀態標記說明

- `已完成且適合本次報告`：目前系統已有明確 UI / API / Domain 支撐，適合直接放進這次 use case diagram
- `已完成但尚未納入本次報告主清單`：功能其實已有實作，但本次簡報為了集中重點，暫時不一定要放進主圖
- `未完成，建議下一階段實作`：目前尚未形成完整 user task，建議後續依 OOAD 方式繼續開發

---

## 3. 本次報告建議使用的 11 個主要 Use Cases

| 編號 | Use Case | 主要 Actor | 目前狀態 | 建議本次報告使用 | OOAD 說明 |
| --- | --- | --- | --- | --- | --- |
| UC01 | 查詢股票資訊 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應股票資料讀取、個股頁面、價格與財報顯示 |
| UC02 | 管理自選股 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應 watchlist 的新增、刪除、摘要刷新 |
| UC03 | 管理投資組合 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應投資組合建立、重新命名、刪除、列表管理 |
| UC04 | 記錄買進交易到投資組合 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應 TradeDialog、`/api/transactions`、PortfolioTransaction |
| UC05 | 記錄賣出交易並驗證庫存是否足夠 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應 TransactionValidator、Position、已實現損益 |
| UC06 | 建立警示規則 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應 AlertRule 建立與 rule type 選擇 |
| UC07 | 啟用 / 停用警示規則 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應 alert lifecycle 與規則狀態切換 |
| UC08 | 查看通知與標記已讀 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應通知讀取、通知狀態更新 |
| UC09 | 執行策略回測 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應回測參數輸入、策略執行、交易模擬 |
| UC10 | 查看回測結果 | 投資者 / 使用者 | 已完成且適合本次報告 | 是 | 對應績效摘要、equity curve、交易紀錄 |
| UC11 | 更新市場資料 | 管理者 / 資料維護者 | 已完成且適合本次報告 | 是 | 對應 FinLab 匯入腳本與 MySQL 重建 |

---

## 4. 本次報告建議先使用的 11 個

如果你們這次報告要直接提高完整度，建議主清單就用這 11 個：

1. 查詢股票資訊
2. 管理自選股
3. 管理投資組合
4. 記錄買進交易到投資組合
5. 記錄賣出交易並驗證庫存是否足夠
6. 建立警示規則
7. 啟用 / 停用警示規則
8. 查看通知與標記已讀
9. 執行策略回測
10. 查看回測結果
11. 更新市場資料

這 11 個的好處是：

- 已經超過最低門檻，數量更穩
- 比 8 個版本更能展示驗證、狀態切換與交易流程
- 與你們現有 UI / API / Domain 實作一致
- 更容易支撐類別圖與設計模式的說明

---

## 5. 3 到 5 個候選 Use Cases

這些候選 use cases 的目的，是避免報告時老師認為某個 use case 不夠獨立，或覺得某項功能比較像主 use case 的子步驟。  
如果發生這種情況，你們可以直接從下面替換。

| 候選編號 | 候選 Use Case | 主要 Actor | 目前狀態 | 為什麼適合當備援 |
| --- | --- | --- | --- | --- |
| ALT01 | 刪除警示規則 | 投資者 / 使用者 | 已完成 | 與建立、啟停規則同屬 alert lifecycle，獨立性高 |
| ALT02 | 查看投資組合摘要 | 投資者 / 使用者 | 已完成 | 可以從「管理投資組合」中拆出一個更明確的查詢任務 |
| ALT03 | 查看投資組合交易紀錄 | 投資者 / 使用者 | 已完成 | 有獨立頁面資料呈現，也和交易 use cases 關聯清楚 |
| ALT04 | 手動執行警示評估 | 投資者 / 使用者 | 已完成 | 對應 `/api/notifications/evaluate`，可視為獨立任務 |
| ALT05 | 比較不同回測參數結果 | 投資者 / 使用者 | 未完成 | 若後續補做成功，會是最強的複雜度補強項 |

### 候選替換建議

如果老師認為下列項目不夠像獨立 use case，可以這樣替換：

- 如果 `查看通知與標記已讀` 太像結果頁，可換成 `手動執行警示評估`
- 如果 `管理投資組合` 太大太泛，可拆成 `查看投資組合摘要`
- 如果 `更新市場資料` 太偏管理者或系統維護，可換成 `查看投資組合交易紀錄`

---

## 6. 為什麼這次改成 11 個是合理的

這次直接把 `UC04`、`UC05`、`UC07` 納入主清單，是合理的，因為它們已經不是想像中的功能，而是有實作支撐的 user task。

### 記錄買進交易到投資組合

這個 use case 已經有實作基礎，而且其實比「管理投資組合」更具體。

OOAD 價值：

- 不是只是新增一筆資料
- 會牽涉交易物件、投資組合、持股狀態
- 是 Portfolio Domain 很自然的核心 use case

### 記錄賣出交易並驗證庫存是否足夠

這個 use case 很適合展現「不是 CRUD」。

OOAD 價值：

- 有驗證流程
- 有領域規則
- 有已實現損益計算
- 非常適合之後補 activity diagram 或口試問答

### 啟用 / 停用警示規則

這個功能雖然不大，但在設計上很重要。

OOAD 價值：

- 它展示規則有生命週期，不是建立完就結束
- 可以自然連到 alert state、rule lifecycle
- 能補強 alert domain 的完整性

---

## 7. 目前 use case 與現有實作的對應

這裡不是要把所有技術細節講完，而是讓你們知道這份 use case 清單不是空想。

### 股票 / 自選股

- 個股頁：[stocks/[symbol]/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/stocks/[symbol]/page.jsx)
- 自選股頁：[watchlist/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/watchlist/page.jsx)

### 投資組合 / 交易

- 投資組合列表頁：[portfolios/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/portfolios/page.jsx)
- 投資組合明細頁：[portfolios/[portfolioId]/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/portfolios/[portfolioId]/page.jsx)
- 交易對話框：[TradeDialog.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/components/shared/TradeDialog.jsx)
- 交易 API：[api/transactions/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/transactions/route.js)

### 警示 / 通知

- 警示頁：[alerts/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/alerts/page.jsx)
- 警示 API：[api/alerts/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/alerts/route.js)
- 警示狀態切換 API：[api/alerts/[alertId]/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/alerts/[alertId]/route.js)
- 通知 API：[api/notifications/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/notifications/route.js)
- 評估 API：[api/notifications/evaluate/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/notifications/evaluate/route.js)

### 回測

- 回測頁：[backtests/page.jsx](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/(dashboard)/backtests/page.jsx)
- 回測 API：[api/backtests/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/backtests/route.js)
- 回測明細 API：[api/backtests/[backtestId]/route.js](/Users/edisonlin/Documents/Stock-Query-Website/frontend/app/api/backtests/[backtestId]/route.js)

### 市場資料更新

- FinLab 匯入腳本：[rebuild_finlab_market_data.py](/Users/edisonlin/Documents/Stock-Query-Website/frontend/scripts/rebuild_finlab_market_data.py)

---

## 8. 後續實作應該怎麼符合 OOAD 思想

這堂課的重點不是單純把功能做多，而是要讓功能的「設計方式」符合 OOAD。

後續新增 use case 時，建議照下面原則做。

### 原則 1：先定義 user task，再設計物件

不要先想「我要加一張表」或「我要多一個 API」。  
應該先想：

> 使用者想完成什麼任務？這個任務有哪些規則？哪些物件應該負責？

例如：

- 使用者想「比較兩組回測參數」
- 那就代表系統可能需要「比較器」或更清楚的報告物件

### 原則 2：讓 use case 對應到 domain responsibility

每新增一個 use case，都要問自己：

- 這個 use case 主要屬於哪個 domain？
- 它的核心責任應該落在哪個 object？
- 哪些部分是 entity？哪些部分是 service？哪些部分是 validation？

例如 UC10：

- Domain：Portfolio
- 主要 object：Portfolio、Position、PortfolioTransaction
- 規則：TransactionValidator

### 原則 3：避免把新功能全部塞回 API 或 page

如果後續新增功能時，所有邏輯都直接寫進：

- `page.jsx`
- `route.js`

那系統很快又會退回「功能有了，但 OOAD 味道變弱」。

比較好的做法是：

- Page 負責互動
- API 負責請求處理與權限
- Domain objects 負責規則與計算
- Prisma / service 負責資料存取

### 原則 4：優先補「有規則、有流程、有分支」的 use case

最能加分的 use case，通常不是單純新增資料，而是像這種：

- 有驗證規則
- 有狀態轉換
- 有多步驟流程
- 有不同物件合作

所以比起再新增一個單純清單頁，更值得做的是：

- 比較回測結果
- 排程自動評估警示
- 交易後自動更新投資組合摘要

### 原則 5：新增 use case 時，同步更新圖

只要正式新增 use case，建議同步更新：

1. use case diagram
2. 如有複雜流程，補 activity diagram
3. class diagram 中的相關物件責任
4. 設計模式是否因此更明確

這樣專題會比較像「持續演化的設計」，而不是程式和簡報分開長。

---

## 9. 建議的後續開發順序

如果你們接下來要繼續做，而且想兼顧 OOAD 表現，我建議順序是：

1. 先把這次 11 個 use cases 正式更新進 use case diagram
2. 準備 3 到 5 個候選 use cases 當口頭備援
3. 再做 `ALT05 / 比較不同回測參數結果`
4. 如果還有時間，再考慮更進一步的候補功能

原因是：

- 11 個主 use cases 已有實作支撐，整理成本低
- 候選清單能降低老師現場挑戰定義時的風險
- `比較不同回測參數結果` 則是真正可以再提升一層設計複雜度的功能

---

## 10. 更後續的延伸候補 use cases

如果你們之後想繼續擴充到 12 以上，或是把 `ALT05` 真的做出來之後再往上走，可以考慮這些延伸功能：

- 排程自動執行警示評估
- 支援多種回測策略
- 匯出投資組合摘要報表
- 比較不同股票的回測結果

這些都比單純新增頁面更符合 OOAD 課的主題。

---

## 11. 最終建議

本次報告：

- 直接用 `11 個已完成且已有實作支撐` 的 use cases
- 再準備 `3 到 5 個候選 use cases` 當備援
- 這樣比較能避免老師質疑其中某個 use case 後，整體數量掉太多

專案內部追蹤：

- 先把 `11 個主 use cases + 候選清單` 定下來
- 用這份檔案當後續 roadmap
- 新增功能時優先考慮能展現物件責任、流程分支、設計模式效果的 use case

這樣做的好處是：

- 這次報告穩
- 現場應對彈性更高
- 後續開發有方向
- 整個專題會更像 OOAD 專題，而不是功能拼裝
