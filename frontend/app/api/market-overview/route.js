import { NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    console.log("開始查詢市場概覽...");

    // 使用 SQL 查詢當天交易量×股價最高的前五支股票
    const topStocks = await prisma.$queryRaw`
      SELECT 
        hp.stock_id,
        s.company_name,
        hp.close_price,
        hp.volume,
        hp.trading_value,
        (hp.volume * hp.close_price) as trading_amount,
        hp.date,
        s.currency,
        s.security_status
      FROM historicalprices hp
      INNER JOIN stocks s ON hp.stock_id = s.stock_id
      INNER JOIN (
        SELECT 
          stock_id, 
          MAX(date) as latest_date
        FROM historicalprices
        WHERE volume IS NOT NULL 
          AND volume > 0 
          AND close_price IS NOT NULL 
          AND close_price > 0
          AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY stock_id
      ) latest ON hp.stock_id = latest.stock_id AND hp.date = latest.latest_date
      WHERE hp.volume IS NOT NULL 
        AND hp.close_price IS NOT NULL
        AND hp.volume > 0
        AND hp.close_price > 0
        AND s.security_status = '正常'
      ORDER BY (hp.volume * hp.close_price) DESC
      LIMIT 5
    `;

    console.log("查詢到的股票數量:", topStocks.length);
    console.log("原始數據:", topStocks);

    if (!topStocks || topStocks.length === 0) {
      console.log("沒有找到符合條件的股票");
      return NextResponse.json([], { status: 200 });
    }

    // 為每支股票獲取前日價格來計算漲跌幅
    const stocksWithChange = await Promise.all(
      topStocks.map(async (stock) => {
        try {
          // 使用 SQL 查詢前日價格
          const previousPriceResult = await prisma.$queryRaw`
            SELECT close_price
            FROM historicalprices
            WHERE stock_id = ${stock.stock_id}
              AND date < ${stock.date}
              AND close_price IS NOT NULL
            ORDER BY date DESC
            LIMIT 1
          `;

          const currentPrice = Number(stock.close_price);
          const prevPrice =
            previousPriceResult.length > 0
              ? Number(previousPriceResult[0].close_price)
              : currentPrice;
          const priceChange = currentPrice - prevPrice;
          const percentChange =
            prevPrice !== 0 ? (priceChange / prevPrice) * 100 : 0;

          return {
            stock_id: stock.stock_id,
            company_name: stock.company_name,
            current_price: currentPrice,
            volume: Number(stock.volume),
            trading_amount: Number(stock.trading_amount),
            trading_value: Number(stock.trading_value || 0),
            price_change: priceChange,
            percent_change: percentChange,
            is_up: priceChange >= 0,
            currency: stock.currency,
            date: stock.date,
          };
        } catch (error) {
          console.error(`處理股票 ${stock.stock_id} 失敗:`, error);

          // 如果出錯，返回基本資料但不計算漲跌幅
          return {
            stock_id: stock.stock_id,
            company_name: stock.company_name,
            current_price: Number(stock.close_price),
            volume: Number(stock.volume),
            trading_amount: Number(stock.volume) * Number(stock.close_price),
            trading_value: Number(stock.trading_value || 0),
            price_change: 0,
            percent_change: 0,
            is_up: true,
            currency: stock.currency,
            date: stock.date,
          };
        }
      })
    );

    console.log("最終結果數量:", stocksWithChange.length);
    console.log("最終結果:", stocksWithChange);

    return NextResponse.json(stocksWithChange, { status: 200 });
  } catch (error) {
    console.error("獲取市場概覽失敗:", error);
    return NextResponse.json(
      { error: "無法獲取市場概覽數據", details: error.message },
      { status: 500 }
    );
  }
}
