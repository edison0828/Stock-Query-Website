# 股票查詢網站（Stock Query Website）

本專案是一套以 **Next.js App Router** 打造的股票資訊查詢平台，整合使用者登入、自選股追蹤、投資組合管理與市場分析等功能。

## 功能總覽

### 儀表板總覽

- 登入後即顯示市場概況、投資組合績效、自選股漲跌等資訊，一眼掌握關鍵資料。
- 以卡片、圖表與表格呈現數據，支援桌機與行動裝置的響應式配置。
  ![儀表板總覽](frontend/public/screenshots/HyBZQTF7xe-1.png)

### 股票搜尋與詳細資訊

- 透過頂部搜尋列或儀表板捷徑輸入股票代號，即可查看最新匯入報價、歷史走勢與財務指標。
- 歷史走勢支援線圖與 K 線圖，`MAX` 區間會顯示資料庫中可用的完整歷史資料。
  ![股票搜尋列表](frontend/public/screenshots/Bk8V4pKQge.png)
  ![股票詳細資訊](frontend/public/screenshots/HJunHTYmxe.png)

- 提供模擬下單操作，協助使用者快速評估交易策略。
  ![模擬下單操作](frontend/public/screenshots/S14XL6KQeg.png)

### 自選股管理

- 快速新增、移除或批次檢查關注的股票，並同步顯示漲跌幅與重要消息。
- 搭配 Toast 與通知顯示操作結果，維持流暢互動體驗。
  ![自選股管理](frontend/public/screenshots/SJydIptXel.png)

### 投資組合與交易紀錄

- 建立多個投資組合，記錄每筆買賣交易，自動計算損益與持股分布。
- 透過圖表視覺化投資成果，協助掌握長期績效。
  ![投資組合列表](frontend/public/screenshots/SJNo8aF7ee.png)
  ![投資組合詳細資訊](frontend/public/screenshots/BJGgwTKXlg.png)

### 使用者驗證與帳戶管理

- 支援電子郵件註冊/登入與 Google OAuth，登入後可在個人資料頁變更密碼。
- 所有 API 依 Session 控制權限，確保資料安全。
![登入與帳戶管理](frontend/public/screenshots/BJB6X6tQxg.png)

### 管理員後台

- 管理員可查看使用者清單、搜尋帳號、調整角色，並刪除不再使用的帳號。
- 管理員可在後台查看 `stocks`、`historicalprices`、`financialreports`、`dividends` 與 `stocksplits` 的資料量與最新日期。
- 後台同步支援 FinLab 優先與免費來源備援，也可選擇上市上櫃、ETF 或全部可用範圍。
- 每次同步會保留工作紀錄，並在完成後產生資料品質快照，協助檢查缺價格、價格日期落後、長期標的資料過少與名稱缺漏。

## 系統架構與技術

| 面向       | 技術                                         | 目的                                                          |
| ---------- | -------------------------------------------- | ------------------------------------------------------------- |
| 前端框架   | [Next.js 15 App Router](https://nextjs.org/) | 提供伺服器元件、路由與 SSR/SSG 支援                           |
| UI / 樣式  | Tailwind CSS、shadcn/ui、Lucide Icons        | 快速建構一致的互動介面                                        |
| 資料視覺化 | Recharts、lightweight-charts                 | 呈現趨勢線圖、迷你圖表與 K 線圖                               |
| 驗證       | NextAuth.js（Email + Google OAuth）          | 提供 Session 與 OAuth 流程                                    |
| 資料庫 ORM | Prisma（MySQL）                              | 操作 `users`、`stocks`、`portfolios`、`transactions` 等資料表 |
| 密碼處理   | bcryptjs                                     | 帳號密碼雜湊                                                  |

## 專案目錄結構

```
Stock-Query-Website/
├─ README.md              # 根目錄說明文件（本檔）
└─ frontend/              # Next.js App Router 前端程式碼與 API Routes
   ├─ app/                # App Router 頁面、佈局與 API Route Handlers
   │  ├─ (auth)/          # 登入、註冊等公開頁面
   │  ├─ (dashboard)/     # 登入後儀表板與子頁面（stocks、watchlist、portfolios）
   │  └─ api/             # 使用 Prisma 與 NextAuth 的伺服器端 API
   ├─ components/
   │  ├─ shared/          # Navbar、Sidebar、Dialog 等跨頁面共用元件
   │  ├─ portfolios/      # 投資組合專用元件
   │  └─ ui/              # shadcn/ui 產生的基礎元件
   ├─ contexts/           # 例如 WatchlistContext，集中管理全域狀態
   ├─ lib/                # Prisma Client、工具函式與 NextAuth 設定
   ├─ prisma/             # Prisma schema 與 migrations
   └─ public/             # 靜態資源，可放置 Logo、截圖等
```

## 安裝與啟動步驟

1. **安裝 Node.js 與套件管理工具**  
   建議使用 Node.js 18.18+ 或 20.x，以符合 Next.js 15 需求。

2. **安裝依賴**

   ```bash
   cd frontend
   npm install
   # 或依個人習慣改用 yarn / pnpm / bun
   ```

3. **設定環境變數**  
   在 `frontend/.env.local` 建立以下內容（開發環境範例）：

   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=請改成隨機長字串
   GOOGLE_CLIENT_ID=你的 Google OAuth Client ID
   GOOGLE_CLIENT_SECRET=你的 Google OAuth Client Secret
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

   DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE?connection_limit=5"
   FINLAB_API_TOKEN=你的 FinLab VIP / API Token
   FINMIND_API_TOKEN=可選，免費來源若需較高額度可設定
   CRON_SECRET=請改成隨機長字串
   ```

   - 若未啟用 Google OAuth，可先留空 `GOOGLE_CLIENT_*`，但登入功能將僅限 Email/密碼。
   - `DATABASE_URL` 請替換為實際 MySQL 連線字串。
   - `FINLAB_API_TOKEN` 是完整匯入歷史股價與財報的主要資料來源；若缺少 token，管理員同步的 Auto 模式會改用免費來源。
   - `CRON_SECRET` 用於保護排程 API，建議使用 `openssl rand -hex 24` 產生。

4. **初始化資料庫結構（沒有備份時使用）**

   ```bash
   npm run db:push
   ```

   如果下一步會匯入完整 MySQL dump 備份，可以略過本步，因為 dump 會包含資料表結構與資料。若你是從零建立空資料庫、且沒有可用備份，才需要執行 `npm run db:push`。

   目前 repo 內的 `prisma/migrations` 與 `prisma/schema.prisma` 並非完全同步；如果你是從零重建資料庫，請優先使用 `prisma db push`，不要直接用舊 migration 做 fresh bootstrap。

5. **從 Google Drive 備份還原資料庫（建議）**

   若要在另一台電腦重建出和目前開發機接近的資料庫狀態，建議優先使用 MySQL dump 備份還原。備份檔體積較大，不建議放進 Git repo；可放在 Google Drive，讓新環境下載後匯入。

   備份檔：

   ```text
   stock_query_website_YYYYMMDD_HHMMSS_portable.sql.gz
   ```

   Google Drive 下載連結：

   [stock_query_website MySQL dump](https://drive.google.com/file/d/1x_nJRVkf0tmbazpmBj7oGg83SAg9q2cj/view?usp=sharing)

   請先從瀏覽器下載到新電腦，例如放在 `~/Downloads/stock_query_website_YYYYMMDD_HHMMSS_portable.sql.gz`。也可以使用 `gdown` 下載公開或已授權的 Google Drive 檔案：

   ```bash
   pip install gdown
   gdown "https://drive.google.com/uc?id=1x_nJRVkf0tmbazpmBj7oGg83SAg9q2cj" \
     -O ~/Downloads/stock_query_website_YYYYMMDD_HHMMSS_portable.sql.gz
   ```

   在新電腦建立資料庫與應用程式使用者：

   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS stock_query_website CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p -e "CREATE USER IF NOT EXISTS 'stock_query_app'@'localhost' IDENTIFIED BY '請改成你的密碼';"
   mysql -u root -p -e "GRANT ALL PRIVILEGES ON stock_query_website.* TO 'stock_query_app'@'localhost'; FLUSH PRIVILEGES;"
   ```

   匯入備份：

   ```bash
   gunzip -c ~/Downloads/stock_query_website_YYYYMMDD_HHMMSS_portable.sql.gz \
     | mysql -u stock_query_app -p stock_query_website
   ```

   匯入後可用以下指令確認資料表與主要歷史價格資料是否存在：

   ```bash
   mysql -u stock_query_app -p stock_query_website -e "SHOW TABLES;"
   mysql -u stock_query_app -p stock_query_website -e "SELECT COUNT(*) AS historical_price_rows FROM historicalprices;"
   ```

   接著在 `frontend/.env.local` 設定和新電腦一致的連線字串：

   ```env
   DATABASE_URL="mysql://stock_query_app:請改成你的密碼@127.0.0.1:3306/stock_query_website?connection_limit=5"
   ```

   還原 dump 後通常不需要再跑 `npm run db:push` 或 seed 指令；只有在 schema 有新變更、或你刻意要補最新市場資料時，才需要再執行資料庫同步或匯入流程。

6. **匯入市場資料（沒有備份時使用）**

   ```bash
   npm run db:seed:finlab
   ```

   這支腳本會補回以下核心市場資料表：

   - `stocks`
   - `historicalprices`
   - `financialreports`
   - `dividends`

   預設 `scope` 是 `TSE_OTC`，會匯入上市與上櫃股票。若只要補 ETF，可使用：

   ```bash
   npm run db:seed:finlab -- --scope ETF
   ```

   若要包含 ETF 與其他 FinLab 可用標的，請使用：

   ```bash
   npm run db:seed:finlab -- --scope ALL
   ```

   若只想補股票主檔與歷史價格，不更新財報與股利，可加上略過參數：

   ```bash
   npm run db:seed:finlab -- --scope ALL --skip-financials --skip-dividends
   ```

   專案也提供免費來源備援：

   ```bash
   npm run db:seed:free
   ```

   免費來源使用 FinMind 股票主檔、財報與股利資料，並以 TWSE / TPEx 官方最新每日行情補價格；它適合作為備援或快速補最新日資料，不等同於 FinLab 的完整歷史價格匯入。

   若已有歷史股價，只想不依賴 FinLab 補齊上次同步後缺漏的上市 / 上櫃 / ETF 日線，可使用官方公開來源增量同步：

   ```bash
   npm run db:sync:public-incremental -- --scope ALL
   ```

   這支腳本會從既有 `historicalprices` 的每檔最新日期往後補，逐檔呼叫 TWSE / TPEx 月資料並 upsert 到資料庫。它會即時輸出進度、對官方端暫時節流自動退避重試，並在 `frontend/tmp/public_incremental_checkpoints/` 建立 checkpoint，讓中斷後同參數重跑可跳過已完成標的。

   若只要補最新一天，建議保留預設節流或使用小幅節流，不要把 request 間隔降到 0：

   ```bash
   npm run db:sync:public-incremental -- --scope ALL --request-sleep 0.2
   ```

   若要修補特定歷史區間，可指定：

   ```bash
   npm run db:sync:public-incremental -- --scope ALL --force-start-date 2026-05-01 --end-date 2026-05-31
   ```

   目前 `stocksplits` 會先保留空表，因為 FinLab 目前主要提供 ETF split 資料，和現有 generic schema 並不完全對應。

7. **後台同步市場資料（選用）**

   登入管理員帳號後可進入「市場資料維護」頁面，由 API 執行同步工作，並查看最近同步紀錄與資料品質快照。同步模式支援：

   - `AUTO`：有 `FINLAB_API_TOKEN` 時優先使用 FinLab，失敗或未設定 token 時改用免費來源。
   - `FINLAB`：強制使用 FinLab。
   - `FREE`：強制使用 FinMind + TWSE + TPEx 免費來源。
   - `PUBLIC_INCREMENTAL`：強制使用 TWSE + TPEx 官方公開來源，依資料庫既有日期增量補齊股價。

   完整同步可能需要較久時間，部署環境需具備 `DATABASE_URL`、`uv` 與對應資料來源 token。

8. **自動評估警示通知（選用）**

   專案提供排程專用 API，可在不需要使用者手動按按鈕的情況下，評估所有啟用中的警示規則並寫入站內通知：

   ```text
   GET 或 POST /api/notifications/evaluate-cron
   Authorization: Bearer <CRON_SECRET>
   ```

   本機測試可使用：

   ```bash
   curl -X POST \
     -H "Authorization: Bearer $CRON_SECRET" \
     http://localhost:3000/api/notifications/evaluate-cron
   ```

   若部署在 Vercel，`frontend/vercel.json` 已設定每天 `08:00 UTC` 執行一次，也就是台灣時間 16:00。請在 Vercel Project Settings 的 Environment Variables 設定同一組 `CRON_SECRET`；Vercel Cron 會在排程呼叫時自動帶入 Bearer token。若使用其他平台，也可以用 GitHub Actions、Linux crontab 或第三方 cron 服務定時呼叫同一個 API。

9. **啟動開發伺服器**

   ```bash
   npm run dev
   ```

   瀏覽器開啟 [http://localhost:3000](http://localhost:3000) 即可開始使用。修改 `app/page.jsx` 或其他檔案會自動觸發 HMR 更新。

10. **建置與部署（選用）**
   ```bash
   npm run build   # 建置生產版
   npm run start   # 啟動生產伺服器（需事先執行 build）
   ```
   專案預設與 Vercel 相容，亦可部署至任何支援 Node.js 的平台。

## 常用指令

| 指令            | 說明                                     |
| --------------- | ---------------------------------------- |
| `npm run dev`   | 啟動開發伺服器（使用 Next.js Turbopack） |
| `npm run lint`  | 執行 ESLint，確保程式碼風格一致          |
| `npm run db:push` | 依 `schema.prisma` 建立或同步資料庫結構 |
| `npm run db:seed:finlab` | 使用 FinLab 匯入核心市場資料，預設範圍為上市與上櫃 |
| `npm run db:seed:finlab -- --scope ETF` | 使用 FinLab 只匯入 ETF |
| `npm run db:seed:finlab -- --scope ALL` | 使用 FinLab 匯入全部可用範圍，包含 ETF |
| `npm run db:seed:free` | 使用 FinMind + TWSE + TPEx 免費來源匯入市場資料 |
| `npm run db:sync:public-incremental -- --scope ALL` | 使用 TWSE + TPEx 官方公開來源增量補齊既有標的股價 |
| `npm run build` | 建置生產版本                             |
| `npm run start` | 以生產模式啟動伺服器                     |

## 注意事項與最佳實務

- **Session 保護**：儀表板及其子頁面透過 `useSession({ required: true })` 自動導向登入頁，確保資料安全。
- **API 權限**：所有 `app/api` Route Handler 都會根據 Session 判斷能否查詢或異動資料；未登入請求將回傳 401。
- **樂觀更新**：例如自選股的加入/移除操作會先更新 UI，再同步後端，並透過 Toast 呈現成功或錯誤訊息。
- **效能與型別**：Prisma 查詢時限制欄位與筆數（如儀表板僅取前 5 筆摘要），部分 API（如 `app/api/stocks/route.js`）使用原生 SQL 實作全文搜尋與分頁提升效能。
- **市場資料不是即時串流**：股價、財報與股利資料先由匯入腳本寫入 MySQL，前端查詢時讀取資料庫。
