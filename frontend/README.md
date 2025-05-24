# 股票查詢系統 - 前端

本專案是一個使用 Next.js 建置的股票查詢系統前端應用程式。

## 專案描述

股票市場分析與投資組合追蹤系統，提供使用者查詢股票資訊、管理自選股、建立與追蹤投資組合等功能。

## 開始使用

首先，執行開發伺服器：

首先，安裝專案依賴：

```bash
npm install
# 或
yarn install
# 或
pnpm install
# 或
bun install
```

然後，執行開發伺服器：

```bash
npm run dev
```

在您的瀏覽器中開啟 [http://localhost:3000](http://localhost:3000) 來查看結果。

您可以透過修改 `app/page.jsx` 來開始編輯頁面。當您編輯檔案時，頁面會自動更新。

本專案使用 [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) 來自動優化和載入 [Geist](https://vercel.com/font)，這是 Vercel 的新字型系列。

## 主要功能

- **使用者認證**: 支援 Email/密碼註冊與登入，以及 Google 第三方登入 ([`app/api/auth/[...nextauth]/route.js`](frontend/app/api/auth/[...nextauth]/route.js), [`app/(auth)/login/page.jsx`](<frontend/app/(auth)/login/page.jsx>), [`app/(auth)/register/page.jsx`](<frontend/app/(auth)/register/page.jsx>))。
- **儀表板**: 顯示整體市場概覽或使用者相關摘要 ([`app/(dashboard)/dashboard/page.jsx`](<frontend/app/(dashboard)/dashboard/page.jsx>))。
- **股票查詢**: 搜尋股票並查看詳細資訊 ([`components/shared/Navbar.jsx`](frontend/components/shared/Navbar.jsx) 中的搜尋功能, [`app/(dashboard)/stocks/[symbol]/page.jsx`](<frontend/app/(dashboard)/stocks/[symbol]/page.jsx>))。
- **自選股列表**: 管理使用者關注的股票列表 ([`app/(dashboard)/watchlist/page.jsx`](<frontend/app/(dashboard)/watchlist/page.jsx>), [`components/shared/AddWatchlistItemDialog.jsx`](frontend/components/shared/AddWatchlistItemDialog.jsx))。
- **投資組合管理**:
  - 建立、重命名、刪除投資組合 ([`app/(dashboard)/portfolios/page.jsx`](<frontend/app/(dashboard)/portfolios/page.jsx>), [`components/portfolios/CreatePortfolioDialog.jsx`](frontend/components/portfolios/CreatePortfolioDialog.jsx))。
  - 查看投資組合詳細資訊，包括持股和交易記錄 ([`app/(dashboard)/portfolios/[portfolioId]/page.jsx`](<frontend/app/(dashboard)/portfolios/[portfolioId]/page.jsx>))。
  - 記錄買入/賣出交易 ([`components/shared/TradeDialog.jsx`](frontend/components/shared/TradeDialog.jsx))。
- **響應式介面**: 適用於不同螢幕尺寸的介面設計。

## 技術棧

- **Next.js**: React 框架，用於伺服器渲染和靜態網站生成。
- **React**: 用於建構使用者介面的 JavaScript 函式庫。
- **Tailwind CSS**: 一個實用優先的 CSS 框架。
- **Shadcn/ui**: 可重用的 UI 元件 ([`components/ui/`](frontend/components/ui/)).
- **NextAuth.js**: 用於 Next.js 應用程式的認證解決方案。
- **Lucide React**: 圖示庫。
- **Recharts**: 圖表庫。

## 專案結構

以下是主要目錄的簡要說明：

- `frontend/app/`: 包含應用程式的所有路由、頁面和佈局。
  - `(auth)/`: 包含認證相關頁面（登入、註冊）。
  - `(dashboard)/`: 包含登入後的主要儀表板頁面。
  - `api/`: 包含 API 路由 (例如 NextAuth.js 的路由)。
- `frontend/components/`: 包含可重用的 UI 元件。
  - `shared/`: 跨多個頁面共享的元件 (例如 Navbar, Sidebar)。
  - `ui/`: Shadcn/ui 提供的基礎 UI 元件。
  - `portfolios/`: 投資組合相關的特定元件。
- `frontend/hooks/`: 包含自訂 React Hooks (例如 `use-toast`)。
- `frontend/lib/`: 包含公用函式和輔助工具 (例如 [`utils.js`](frontend/lib/utils.js))。
- `frontend/public/`: 包含靜態資源，如圖片。

## 可用腳本

在專案目錄中，您可以執行：

- `npm run dev`: 在開發模式下執行應用程式。
- `npm run build`: 建置生產版本的應用程式。
- `npm run start`: 啟動生產伺服器。
- `npm run lint`: 執行 ESLint 檢查程式碼風格。

## 環境變數

在專案根目錄下建立一個 `.env.local` 檔案來設定環境變數。以下是一些可能需要的變數：

```env
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000 # 開發環境的 URL
NEXTAUTH_SECRET= # 一個隨機的密鑰，用於簽署 JWT
GOOGLE_CLIENT_ID= # 您的 Google OAuth Client ID
GOOGLE_CLIENT_SECRET= # 您的 Google OAuth Client Secret

# API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 # 後端 API 的基本 URL
```

請確保將 `NEXTAUTH_SECRET` 替換為一個強隨機字串。

## 部署到 Vercel

部署 Next.js 應用程式最簡單的方法是使用 [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)，這是 Next.js 的創建者提供的平台。

更多詳細資訊請參閱 [Next.js 部署文件](https://nextjs.org/docs/app/building-your-application/deploying)。
