// lib/prisma.js
import { PrismaClient } from "./generated/prisma";

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // 在開發環境中，避免因熱重載創建多個 PrismaClient 實例
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      // log: ['query', 'info', 'warn', 'error'], // 可選：啟用日誌記錄
    });
  }
  prisma = global.prisma;
}

export default prisma;
