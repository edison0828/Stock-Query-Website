// app/api/stocks/search/route.js (簡化示例)
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
    const stocks = await prisma.stocks.findMany({
      where: {
        OR: [
          { stock_id: { contains: query } }, // 你的 stock_id 就是 tickerSymbol
          { company_name: { contains: query } },
        ],
      },
      select: {
        stock_id: true, // 這就是 tickerSymbol
        company_name: true,
        // 你可以根據需要選擇更多欄位
      },
      take: 10, // 限制結果數量
    });

    // 為了與前端 AddWatchlistItemDialog 的期望一致，將 stock_id 複製一份到 tickerSymbol
    const formattedStocks = stocks.map((stock) => ({
      stock_id: stock.stock_id,
      tickerSymbol: stock.stock_id, // 因為前端可能期望 tickerSymbol 屬性
      companyName: stock.company_name,
    }));

    return NextResponse.json(formattedStocks, { status: 200 });
  } catch (error) {
    console.error("股票搜尋失敗:", error);
    return NextResponse.json({ error: "搜尋股票時發生錯誤" }, { status: 500 });
  }
}
