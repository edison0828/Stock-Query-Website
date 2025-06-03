import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { symbol } = await params;
    const userIdAsBigInt = BigInt(session.user.id);

    const watchlistItem = await prisma.watchlistitems.findUnique({
      where: {
        user_id_stock_id: {
          user_id: userIdAsBigInt,
          stock_id: symbol.toUpperCase(),
        },
      },
    });

    return NextResponse.json({ isWatched: !!watchlistItem }, { status: 200 });
  } catch (error) {
    console.error("檢查關注狀態失敗:", error);
    return NextResponse.json(
      { error: "檢查關注狀態時發生錯誤" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { symbol } = await params;
    const userIdAsBigInt = BigInt(session.user.id);
    const stockId = symbol.toUpperCase();

    // 檢查股票是否存在
    const stockExists = await prisma.stocks.findUnique({
      where: { stock_id: stockId },
    });

    if (!stockExists) {
      return NextResponse.json(
        { error: `找不到股票代號 ${stockId}` },
        { status: 404 }
      );
    }

    // 新增到關注列表
    const newWatchlistItem = await prisma.watchlistitems.create({
      data: {
        user_id: userIdAsBigInt,
        stock_id: stockId,
      },
    });

    return NextResponse.json(
      { message: `${stockId} 已加入關注列表`, isWatched: true },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "該股票已在您的關注列表中", isWatched: true },
        { status: 200 }
      );
    }

    console.error("新增關注失敗:", error);
    return NextResponse.json({ error: "新增關注時發生錯誤" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "未授權：需要登入" }, { status: 401 });
  }

  try {
    const { symbol } = await params;
    const userIdAsBigInt = BigInt(session.user.id);
    const stockId = symbol.toUpperCase();

    await prisma.watchlistitems.delete({
      where: {
        user_id_stock_id: {
          user_id: userIdAsBigInt,
          stock_id: stockId,
        },
      },
    });

    return NextResponse.json(
      { message: `${stockId} 已從關注列表移除`, isWatched: false },
      { status: 200 }
    );
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "該股票不在您的關注列表中", isWatched: false },
        { status: 200 }
      );
    }

    console.error("移除關注失敗:", error);
    return NextResponse.json({ error: "移除關注時發生錯誤" }, { status: 500 });
  }
}
