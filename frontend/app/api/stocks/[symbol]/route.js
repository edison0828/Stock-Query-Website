import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { StockAnalysisService } from "@/lib/domain/stocks";
// 選擇方案 A：直接導入 JSON
import companyData from "@/data/company.json";
// 選擇方案 B：使用 CSV 解析器
// import { getCompanyData } from "@/lib/csv-parser";

export async function GET(request, { params }) {
  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json({ error: "缺少股票代號" }, { status: 400 });
    }

    const stockSymbol = symbol.toUpperCase();

    // 1. 獲取股票基本資訊
    const stock = await prisma.stocks.findUnique({
      where: { stock_id: stockSymbol },
      select: {
        stock_id: true,
        company_name: true,
        market_type: true,
        asset_type: true,
        industry_category: true,
        security_status: true,
        transfer_agent: true,
        currency: true,
      },
    });

    if (!stock) {
      return NextResponse.json(
        { error: `找不到股票代號 ${stockSymbol}` },
        { status: 404 }
      );
    }

    // 2. 獲取 CSV 中的基本資訊
    // 方案 A：使用 JSON 檔案
    const csvBasicInfo = companyData[stockSymbol] || {};

    // 方案 B：使用 CSV 解析器
    // const companyDataMap = getCompanyData();
    // const csvBasicInfo = companyDataMap.get(stockSymbol) || {};

    const analysisService = new StockAnalysisService(prisma);
    const priceAnalysis = await analysisService.buildPriceAnalysis(stockSymbol);

    // 3. 獲取最新價格和變化
    const latestPrice = await getLatestPriceInfo(stockSymbol);

    // 4. 獲取財務報告
    const financialReports = await prisma.financialreports.findMany({
      where: { stock_id: stockSymbol },
      orderBy: [{ year: "desc" }, { period_type: "desc" }],
      // 移除 take: 4 限制，顯示所有財務報告
      select: {
        year: true,
        period_type: true,
        eps: true,
        revenue: true,
        Income: true, // 注意這裡是大寫 I（營業利益）
        non_operating_income_expense: true, // 營業外收支
        net_income: true, // 淨利
      },
    });

    const financialTrend = analysisService.buildFinancialTrend(financialReports);

    // 5. 獲取股息記錄
    const dividends = await prisma.dividends.findMany({
      where: { stock_id: stockSymbol },
      orderBy: { dividend_date: "desc" },
      take: 10,
      select: {
        dividend_date: true,
        dividend_value: true,
      },
    });

    // 6. 獲取股票分割記錄
    const splits = await prisma.stocksplits.findMany({
      where: { stock_id: stockSymbol },
      orderBy: { split_date: "desc" },
      take: 5,
      select: {
        split_date: true,
        split_ratio_before: true,
        split_ratio_after: true,
      },
    });

    const etfProfile =
      stock.asset_type === "ETF"
        ? await prisma.etfprofiles.findUnique({
            where: { stock_id: stockSymbol },
          })
        : null;

    const etfNavSnapshots =
      stock.asset_type === "ETF"
        ? await prisma.etfnavsnapshots.findMany({
            where: { stock_id: stockSymbol },
            orderBy: { date: "desc" },
            take: 30,
            select: {
              date: true,
              nav: true,
              premium_discount: true,
              data_source: true,
            },
          })
        : [];

    const latestHoldingSnapshot =
      stock.asset_type === "ETF"
        ? await prisma.etfholdings.findFirst({
            where: { stock_id: stockSymbol },
            orderBy: { snapshot_date: "desc" },
            select: { snapshot_date: true },
          })
        : null;

    const etfHoldings =
      latestHoldingSnapshot !== null
        ? await prisma.etfholdings.findMany({
            where: {
              stock_id: stockSymbol,
              snapshot_date: latestHoldingSnapshot.snapshot_date,
            },
            orderBy: [{ weight: "desc" }, { holding_rank: "asc" }],
            take: 15,
            select: {
              component_symbol: true,
              component_name: true,
              snapshot_date: true,
              weight: true,
              shares: true,
              component_close_price: true,
              component_change_pct: true,
              contribution_pct: true,
              component_industry: true,
              holding_rank: true,
              data_source: true,
              source_url: true,
            },
          })
        : [];

    const etfHoldingCount =
      latestHoldingSnapshot !== null
        ? await prisma.etfholdings.count({
            where: {
              stock_id: stockSymbol,
              snapshot_date: latestHoldingSnapshot.snapshot_date,
            },
          })
        : 0;

    // 8. 組合回應數據，整合 CSV 資訊
    const responseData = {
      symbol: stock.stock_id,
      companyName: stock.company_name,
      exchange: stock.market_type,
      assetType: stock.asset_type,
      isEtf: stock.asset_type === "ETF",
      currency: stock.currency,
      securityStatus: stock.security_status,
      transferAgent: stock.transfer_agent,

      // 價格資訊
      currentPrice: latestPrice.currentPrice,
      priceChange: latestPrice.priceChange,
      percentChange: latestPrice.percentChange,
      isUp: latestPrice.isUp,
      lastUpdated: latestPrice.lastUpdated,
      marketStatus: getMarketStatus(),

      // 歷史數據
      historicalData: priceAnalysis.historicalData,
      priceQuality: priceAnalysis.priceQuality,
      technicalSummary: priceAnalysis.technicalSummary,
      performanceSummary: priceAnalysis.performanceSummary,

      // 基本資訊（整合 CSV 數據）
      basicInfo: {
        description:
          stock.asset_type === "ETF"
            ? `${stock.company_name} 是在 ${stock.market_type} 交易的 ETF。`
            : `${stock.company_name} 是一家在 ${stock.market_type} 交易的公司。`,
        sector: stock.industry_category || csvBasicInfo.industry || "待補充",
        industry: stock.industry_category || csvBasicInfo.industry || "待補充",
        marketCap: csvBasicInfo.capital
          ? formatCurrency(csvBasicInfo.capital)
          : "待補充",
        peRatio: csvBasicInfo.pe_ratio
          ? csvBasicInfo.pe_ratio.toString()
          : "待補充",
        dividendYield: csvBasicInfo.dividend_yield
          ? `${csvBasicInfo.dividend_yield}%`
          : calculateDividendYield(dividends, latestPrice.currentPrice),
        employees: "待補充",
        ceo: csvBasicInfo.chairman || "待補充",
        website: "待補充",
        // 新增的 CSV 欄位
        chairman: csvBasicInfo.chairman || "待補充",
        capital: csvBasicInfo.capital || null,
        pbRatio: csvBasicInfo.pb_ratio || null,
      },

      // 財務報告
      financialReports: financialReports.map((report) => ({
        period: `${report.period_type} ${report.year}`,
        date: `${report.year}`,
        periodType: report.period_type, // 新增期間類型
        revenue: formatCurrency(report.revenue),
        income: formatCurrency(report.Income), // 營業利益
        nonOperatingIncomeExpense: formatCurrency(
          report.non_operating_income_expense
        ), // 營業外收支
        netIncome: formatCurrency(report.net_income),
        eps: report.eps ? `$${Number(report.eps).toFixed(2)}` : "N/A",
      })),
      financialTrend,

      // 股息記錄
      dividends: dividends.map((div) => ({
        date: formatDate(div.dividend_date),
        amount: div.dividend_value
          ? `$${Number(div.dividend_value).toFixed(2)}`
          : "N/A",
      })),

      // 股票分割記錄
      splits: splits.map((split) => ({
        date: formatDate(split.split_date),
        ratio: `${Number(split.split_ratio_before)}-for-${Number(
          split.split_ratio_after
        )}`,
      })),

      etfProfile: formatEtfProfile(etfProfile, etfNavSnapshots),
      etfNavHistory: etfNavSnapshots
        .slice()
        .reverse()
        .map((snapshot) => ({
          date: formatDate(snapshot.date),
          nav: toNumberOrNull(snapshot.nav),
          premiumDiscount: toNumberOrNull(snapshot.premium_discount),
          dataSource: snapshot.data_source,
        })),
      etfHoldings: formatEtfHoldings(
        etfHoldings,
        latestHoldingSnapshot,
        etfHoldingCount
      ),

      // 新聞
      news: [],
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("獲取股票詳細資訊失敗:", error);
    return NextResponse.json(
      { error: "獲取股票資訊時發生錯誤" },
      { status: 500 }
    );
  }
}

// 獲取最新價格資訊的輔助函數
async function getLatestPriceInfo(stockSymbol) {
  const latestPrices = await prisma.historicalprices.findMany({
    where: { stock_id: stockSymbol },
    orderBy: { date: "desc" },
    take: 2,
    select: {
      date: true,
      close_price: true,
    },
  });

  if (latestPrices.length === 0) {
    return {
      currentPrice: 0,
      priceChange: 0,
      percentChange: 0,
      isUp: false,
      lastUpdated: "N/A",
    };
  }

  const currentPrice = Number(latestPrices[0].close_price || 0);
  const previousPrice =
    latestPrices.length > 1
      ? Number(latestPrices[1].close_price || 0)
      : currentPrice;

  const priceChange = currentPrice - previousPrice;
  const percentChange =
    previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;

  return {
    currentPrice,
    priceChange,
    percentChange,
    isUp: priceChange >= 0,
    lastUpdated: formatDateTime(latestPrices[0].date),
  };
}

// 輔助函數
function getMarketStatus() {
  const now = new Date();
  const hour = now.getHours();

  // 簡單的市場狀態判斷（可以根據實際市場時間調整）
  if (hour >= 9 && hour < 14) {
    return "Market open.";
  }
  return "Market closed.";
}

function calculateDividendYield(dividends, currentPrice) {
  if (!dividends.length || !currentPrice) return "N/A";

  // 計算過去12個月的股息總額
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const recentDividends = dividends.filter(
    (div) => new Date(div.dividend_date) >= oneYearAgo
  );

  const totalDividends = recentDividends.reduce(
    (sum, div) => sum + Number(div.dividend_value || 0),
    0
  );

  const yield_ = (totalDividends / currentPrice) * 100;
  return `${yield_.toFixed(2)}%`;
}

function formatCurrency(amount) {
  if (!amount) return "N/A";

  const num = Number(amount);
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatEtfProfile(profile, navSnapshots) {
  if (!profile) return null;

  const latestNav = navSnapshots[0] || null;

  return {
    fundShortName: profile.fund_short_name,
    fundName: profile.fund_name,
    fundEnglishName: profile.fund_english_name,
    issuer: profile.issuer,
    etfCategory: profile.etf_category,
    trackingIndex: profile.tracking_index,
    isCustomIndex: profile.is_custom_index,
    hasForeignComponents: profile.has_foreign_components,
    benchmarkName: profile.benchmark_name,
    benchmarkEnglishName: profile.benchmark_english_name,
    inceptionDate: profile.inception_date
      ? formatDate(profile.inception_date)
      : null,
    listingDate: profile.listing_date ? formatDate(profile.listing_date) : null,
    fundManager: profile.fund_manager,
    custodian: profile.custodian,
    unitsOutstanding:
      profile.units_outstanding === null || profile.units_outstanding === undefined
        ? null
        : Number(profile.units_outstanding),
    mopsFundId: profile.mops_fund_id,
    detailUrl: profile.detail_url,
    expenseRatio: toNumberOrNull(profile.expense_ratio),
    managementFeeRate: toNumberOrNull(profile.management_fee_rate),
    custodianFeeRate: toNumberOrNull(profile.custodian_fee_rate),
    expenseRatioPeriod: profile.expense_ratio_period,
    feeSource: profile.fee_source,
    dataSource: profile.data_source,
    sourceAsOfDate: profile.source_as_of_date
      ? formatDate(profile.source_as_of_date)
      : null,
    updatedAt: profile.updated_at ? formatDateTime(profile.updated_at) : null,
    latestNav: latestNav
      ? {
          date: formatDate(latestNav.date),
          nav: toNumberOrNull(latestNav.nav),
          premiumDiscount: toNumberOrNull(latestNav.premium_discount),
          dataSource: latestNav.data_source,
        }
      : null,
  };
}

function formatEtfHoldings(holdings, latestHoldingSnapshot, holdingCount) {
  return {
    snapshotDate: latestHoldingSnapshot
      ? formatDate(latestHoldingSnapshot.snapshot_date)
      : null,
    totalCount: holdingCount,
    items: holdings.map((holding) => ({
      symbol: holding.component_symbol,
      name: holding.component_name,
      weight: toNumberOrNull(holding.weight),
      shares:
        holding.shares === null || holding.shares === undefined
          ? null
          : Number(holding.shares),
      closePrice: toNumberOrNull(holding.component_close_price),
      changePercent: toNumberOrNull(holding.component_change_pct),
      contributionPercent: toNumberOrNull(holding.contribution_pct),
      industry: holding.component_industry,
      rank: holding.holding_rank,
      dataSource: holding.data_source,
      sourceUrl: holding.source_url,
    })),
  };
}

function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("zh-TW");
}

function formatDateTime(date) {
  return new Date(date).toLocaleString("zh-TW");
}
