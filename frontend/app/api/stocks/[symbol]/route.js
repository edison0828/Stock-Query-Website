import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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

    // 3. 獲取歷史價格數據（不同時間區間）
    const historicalData = await getHistoricalPriceData(stockSymbol);

    // 4. 獲取最新價格和變化
    const latestPrice = await getLatestPriceInfo(stockSymbol);

    // 5. 獲取財務報告
    const financialReports = await prisma.financialreports.findMany({
      where: { stock_id: stockSymbol },
      orderBy: [{ year: "desc" }, { period_type: "desc" }],
      take: 4,
      select: {
        year: true,
        period_type: true,
        eps: true,
        revenue: true,
        net_income: true,
      },
    });

    // 6. 獲取股息記錄
    const dividends = await prisma.dividends.findMany({
      where: { stock_id: stockSymbol },
      orderBy: { dividend_date: "desc" },
      take: 10,
      select: {
        dividend_date: true,
        dividend_value: true,
      },
    });

    // 7. 獲取股票分割記錄
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

    // 8. 組合回應數據，整合 CSV 資訊
    const responseData = {
      symbol: stock.stock_id,
      companyName: stock.company_name,
      exchange: stock.market_type,
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
      historicalData,

      // 基本資訊（整合 CSV 數據）
      basicInfo: {
        description: `${stock.company_name} 是一家在 ${stock.market_type} 交易的公司。`,
        sector: csvBasicInfo.industry || "待補充",
        industry: csvBasicInfo.industry || "待補充",
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
        revenue: formatCurrency(report.revenue),
        netIncome: formatCurrency(report.net_income),
        eps: report.eps ? `$${Number(report.eps).toFixed(2)}` : "N/A",
      })),

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

// 獲取歷史價格數據的輔助函數
async function getHistoricalPriceData(stockSymbol) {
  const historicalData = {};

  try {
    // 獲取最新日期
    const latestRecord = await prisma.historicalprices.findFirst({
      where: { stock_id: stockSymbol },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    if (!latestRecord) {
      const ranges = ["5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];
      ranges.forEach((range) => (historicalData[range] = []));
      return historicalData;
    }

    const latestDate = new Date(latestRecord.date);

    // 計算最長的時間範圍（5年或 MAX）
    const fiveYearsAgo = new Date(latestDate);
    fiveYearsAgo.setDate(fiveYearsAgo.getDate() - 1825);

    // 一次性獲取所有需要的歷史數據
    const allPrices = await prisma.historicalprices.findMany({
      where: {
        stock_id: stockSymbol,
        date: { gte: fiveYearsAgo }, // 或者不設限制如果要 MAX
      },
      orderBy: { date: "asc" },
      select: {
        date: true,
        close_price: true,
      },
    });

    // 在記憶體中篩選不同時間範圍的數據
    const timeRanges = {
      "5D": 5,
      "1M": 30,
      "6M": 180,
      YTD: null,
      "1Y": 365,
      "5Y": 1825,
      MAX: null,
    };

    for (const [range, days] of Object.entries(timeRanges)) {
      let filteredPrices = allPrices;

      if (days) {
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - days);
        filteredPrices = allPrices.filter(
          (price) => new Date(price.date) >= startDate
        );
      } else if (range === "YTD") {
        const startOfYear = new Date(latestDate.getFullYear(), 0, 1);
        filteredPrices = allPrices.filter(
          (price) => new Date(price.date) >= startOfYear
        );
      }

      historicalData[range] = filteredPrices.map((price) => ({
        date: formatDateForChart(price.date, range),
        price: price.close_price ? Number(price.close_price) : 0,
      }));
    }
  } catch (error) {
    console.error("獲取歷史數據時發生錯誤:", error);
    const ranges = ["5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];
    ranges.forEach((range) => (historicalData[range] = []));
  }

  return historicalData;
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

function formatDate(date) {
  return new Date(date).toLocaleDateString("zh-TW");
}

function formatDateTime(date) {
  return new Date(date).toLocaleString("zh-TW");
}

function formatDateForChart(date, range) {
  const d = new Date(date);

  switch (range) {
    case "5D":
      // 使用 MM/DD 格式，更穩定
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const day = d.getDate().toString().padStart(2, "0");
      return `${month}/${day}`;
    case "1M":
    case "6M":
      return d.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
    default:
      return d.toLocaleDateString("zh-TW", {
        // year: "2-digit",
        month: "short",
        day: "numeric",
      });
  }
}
