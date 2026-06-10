import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { AdminAuthorizationPolicy } from "@/lib/domain/admin";

export const runtime = "nodejs";

function serializeUser(user) {
  return {
    user_id: user.user_id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    created_at: user.created_at?.toISOString() || null,
    last_login: user.last_login?.toISOString() || null,
    provider: user.google_id ? "Google" : "Credentials",
    counts: {
      portfolios: user._count?.portfolios || 0,
      watchlistitems: user._count?.watchlistitems || 0,
      alertrules: user._count?.alertrules || 0,
      backtestruns: user._count?.backtestruns || 0,
    },
  };
}

function errorResponse(error) {
  return NextResponse.json(
    { error: error.message || "管理員帳號服務發生錯誤" },
    { status: error.status || 500 }
  );
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    new AdminAuthorizationPolicy(session).assertAdmin();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const role = (searchParams.get("role") || "all").trim();
    const page = Math.max(Number.parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(Number.parseInt(searchParams.get("pageSize") || "20", 10), 1),
      100
    );

    const where = {
      ...(role !== "all" ? { role } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [users, total, adminCount] = await Promise.all([
      prisma.users.findMany({
        where,
        orderBy: [{ role: "asc" }, { created_at: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              portfolios: true,
              watchlistitems: true,
              alertrules: true,
              backtestruns: true,
            },
          },
        },
      }),
      prisma.users.count({ where }),
      prisma.users.count({ where: { role: "admin" } }),
    ]);

    return NextResponse.json({
      users: users.map(serializeUser),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
      current_user_id: session.user.id,
      admin_count: adminCount,
    });
  } catch (error) {
    if (!error.status || error.status >= 500) {
      console.error("Admin users list failed:", error);
    }
    return errorResponse(error);
  }
}
