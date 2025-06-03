import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // 獲取查詢參數
  const query = searchParams.get("q") || "";
  const marketType = searchParams.get("market_type");
  const securityStatus = searchParams.get("security_status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  // 計算 offset
  const offset = (page - 1) * limit;

  try {
    const overallStartTime = Date.now();

    // 建立基本查詢條件
    let whereConditions = [];
    let queryParams = [];

    // 搜尋條件 (股票代號或公司名稱)
    if (query && query.length >= 1) {
      whereConditions.push(`(s.stock_id LIKE ? OR s.company_name LIKE ?)`);
      const searchPattern = `%${query}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    // 市場類型篩選
    if (marketType && marketType !== "ALL") {
      whereConditions.push(`s.market_type = ?`);
      queryParams.push(marketType);
    }

    // 證券狀態篩選
    if (securityStatus && securityStatus !== "ALL") {
      whereConditions.push(`s.security_status = ?`);
      queryParams.push(securityStatus);
    }

    // 組合 WHERE 子句
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // 查詢總數
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stocks s
      ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe(
      countQuery,
      ...queryParams
    );
    const total = Number(countResult[0].total);

    // 查詢股票列表 - 優化版本
    let orderBy = "s.stock_id ASC";

    // 如果有搜尋關鍵字，使用相關性排序
    if (query && query.length >= 1) {
      orderBy = `
        CASE 
          WHEN s.stock_id = ? THEN 1
          WHEN s.stock_id LIKE ? THEN 2
          WHEN s.company_name LIKE ? THEN 3
          WHEN s.stock_id LIKE ? THEN 4
          WHEN s.company_name LIKE ? THEN 5
          ELSE 6
        END ASC, s.stock_id ASC
      `;

      const exactMatch = query;
      const startsWith = `${query}%`;
      const contains = `%${query}%`;

      queryParams.push(exactMatch, startsWith, startsWith, contains, contains);
    }

    // 先查詢股票基本資訊
    const basicStocksQuery = `
      SELECT 
        s.stock_id,
        s.company_name,
        s.market_type,
        s.security_status,
        s.currency,
        s.transfer_agent
      FROM stocks s
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const startTime = Date.now();
    const basicStocks = await prisma.$queryRawUnsafe(
      basicStocksQuery,
      ...queryParams
    );
    console.log(`基本查詢耗時: ${Date.now() - startTime}ms`);

    // 如果沒有股票資料，直接返回
    if (basicStocks.length === 0) {
      return NextResponse.json({
        items: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: false,
        hasPrevPage: page > 1,
      });
    }

    // 優化的價格查詢
    const stockIds = basicStocks.map((stock) => stock.stock_id);
    const priceStartTime = Date.now();

    const priceQuery = `
      WITH RankedPrices AS (
        SELECT 
          stock_id,
          close_price,
          ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY date DESC) as rn
        FROM historicalprices
        WHERE stock_id IN (${stockIds.map(() => "?").join(",")})
      )
      SELECT 
        stock_id,
        MAX(CASE WHEN rn = 1 THEN close_price END) as current_price,
        MAX(CASE WHEN rn = 2 THEN close_price END) as previous_price
      FROM RankedPrices
      WHERE rn IN (1, 2)
      GROUP BY stock_id
    `;

    const priceData = await prisma.$queryRawUnsafe(priceQuery, ...stockIds);
    console.log(`價格查詢耗時: ${Date.now() - priceStartTime}ms`);

    // 合併資料
    const priceMap = new Map(priceData.map((p) => [p.stock_id, p]));

    const formattedStocks = basicStocks.map((stock) => {
      const prices = priceMap.get(stock.stock_id) || {};
      const currentPrice = prices.current_price
        ? Number(prices.current_price)
        : null;
      const previousPrice = prices.previous_price
        ? Number(prices.previous_price)
        : null;

      let priceChange = null;
      let changePercentage = null;

      if (currentPrice !== null && previousPrice !== null) {
        priceChange = Number((currentPrice - previousPrice).toFixed(2));
        changePercentage = Number(
          (((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2)
        );
      }

      return {
        ...stock,
        current_price: currentPrice,
        previous_price: previousPrice,
        price_change: priceChange,
        change_percentage: changePercentage,
      };
    });

    const totalTime = Date.now() - overallStartTime;
    console.log(
      `總查詢耗時: ${totalTime}ms, 股票數量: ${formattedStocks.length}`
    );

    // 計算總頁數
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        items: formattedStocks,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("獲取股票列表失敗:", error);
    return NextResponse.json(
      { error: "獲取股票列表時發生錯誤" },
      { status: 500 }
    );
  }
}
