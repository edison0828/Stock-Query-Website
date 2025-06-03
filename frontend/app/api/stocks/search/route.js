// app/api/stocks/search/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "查詢字串至少需要2個字元" },
      { status: 400 }
    );
  }

  try {
    // 使用原始 SQL 來實現更精準的搜尋和排序
    const stocks = await prisma.$queryRaw`
      SELECT stock_id, company_name,
        CASE 
          -- 完全匹配股票代號 (最高優先級)
          WHEN stock_id = ${query} THEN 1
          -- 股票代號開頭匹配
          WHEN stock_id LIKE CONCAT(${query}, '%') THEN 2
          -- 公司名稱開頭匹配
          WHEN company_name LIKE CONCAT(${query}, '%') THEN 3
          -- 股票代號包含
          WHEN stock_id LIKE CONCAT('%', ${query}, '%') THEN 4
          -- 公司名稱包含
          WHEN company_name LIKE CONCAT('%', ${query}, '%') THEN 5
          ELSE 6
        END as relevance_score
      FROM stocks 
      WHERE stock_id LIKE CONCAT('%', ${query}, '%')
         OR company_name LIKE CONCAT('%', ${query}, '%')
      ORDER BY relevance_score ASC, stock_id ASC
      LIMIT 10
    `;

    const formattedStocks = stocks.map((stock) => ({
      stock_id: stock.stock_id,
      tickerSymbol: stock.stock_id,
      companyName: stock.company_name,
    }));

    return NextResponse.json(formattedStocks, { status: 200 });
  } catch (error) {
    console.error("股票搜尋失敗:", error);
    return NextResponse.json({ error: "搜尋股票時發生錯誤" }, { status: 500 });
  }
}
