import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    // 使用類似 stocks/search 的邏輯，但包含價格信息
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
      WHERE security_status != '下市'
        AND (
          stock_id = ${query}
          OR stock_id LIKE CONCAT(${query}, '%')
          OR company_name LIKE CONCAT(${query}, '%')
          OR stock_id LIKE CONCAT('%', ${query}, '%')
          OR company_name LIKE CONCAT('%', ${query}, '%')
        )
      ORDER BY relevance_score ASC, stock_id ASC
      LIMIT 5
    `;

    if (stocks.length === 0) {
      return NextResponse.json([]);
    }

    // 第二步：為每個股票分別獲取最新價格
    const stocksWithPrices = await Promise.all(
      stocks.map(async (stock) => {
        try {
          // 獲取最新價格
          const latestPrice = await prisma.historicalprices.findFirst({
            where: { stock_id: stock.stock_id },
            orderBy: { date: "desc" },
            select: {
              close_price: true,
              date: true,
            },
          });

          // 獲取前一日價格（用於計算漲跌）
          const previousPrice = await prisma.historicalprices.findFirst({
            where: {
              stock_id: stock.stock_id,
              date: { lt: latestPrice?.date || new Date() },
            },
            orderBy: { date: "desc" },
            select: {
              close_price: true,
            },
          });

          const currentPrice = latestPrice?.close_price
            ? Number(latestPrice.close_price)
            : 0;
          const prevPrice = previousPrice?.close_price
            ? Number(previousPrice.close_price)
            : currentPrice;

          const changeAmount = currentPrice - prevPrice;
          const changePercent =
            prevPrice !== 0 ? (changeAmount / prevPrice) * 100 : 0;

          return {
            stock_id: stock.stock_id,
            symbol: stock.stock_id,
            name: stock.company_name,
            current_price: currentPrice,
            is_up: changeAmount >= 0,
            change_amount: changeAmount,
            change_percent: changePercent,
            last_updated: latestPrice?.date,
            relevance_score: Number(stock.relevance_score), // 轉換 BigInt 為 Number
          };
        } catch (error) {
          console.error(`獲取 ${stock.stock_id} 價格失敗:`, error);
          // 如果獲取價格失敗，返回基本信息
          return {
            stock_id: stock.stock_id,
            symbol: stock.stock_id,
            name: stock.company_name,
            current_price: 0,
            is_up: true,
            change_amount: 0,
            change_percent: 0,
            last_updated: null,
            relevance_score: Number(stock.relevance_score), // 轉換 BigInt 為 Number
          };
        }
      })
    );

    return NextResponse.json(stocksWithPrices);
  } catch (error) {
    console.error("交易搜索錯誤:", error);
    return NextResponse.json({ error: "搜索失敗" }, { status: 500 });
  }
}
