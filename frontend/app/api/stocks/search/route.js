import { NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

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
    console.log("搜尋查詢:", query);

    // 簡化為單一查詢，包含所有匹配模式
    const stocks = await prisma.$queryRaw`
      SELECT DISTINCT stock_id, company_name,
        CASE 
          WHEN stock_id = ${query} THEN 1
          WHEN stock_id LIKE CONCAT(${query}, '%') THEN 2
          WHEN company_name LIKE CONCAT(${query}, '%') THEN 3
          WHEN stock_id LIKE CONCAT('%', ${query}, '%') THEN 4
          WHEN company_name LIKE CONCAT('%', ${query}, '%') THEN 5
          ELSE 6
        END as relevance_score
      FROM stocks 
      WHERE stock_id = ${query}
         OR stock_id LIKE CONCAT(${query}, '%')
         OR company_name LIKE CONCAT(${query}, '%')
         OR stock_id LIKE CONCAT('%', ${query}, '%')
         OR company_name LIKE CONCAT('%', ${query}, '%')
      ORDER BY relevance_score ASC, stock_id ASC
      LIMIT 10
    `;

    const formattedStocks = stocks.map((stock) => ({
      stock_id: stock.stock_id,
      tickerSymbol: stock.stock_id,
      companyName: stock.company_name,
    }));

    console.log("搜尋結果:", formattedStocks);
    return NextResponse.json(formattedStocks, { status: 200 });
  } catch (error) {
    console.error("股票搜尋失敗:", error);
    return NextResponse.json({ error: "搜尋股票時發生錯誤" }, { status: 500 });
  }
}
