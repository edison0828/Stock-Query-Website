import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { AdminAuthorizationPolicy } from "@/lib/domain/admin";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["admin", "user"]);

function toUserId(value) {
  try {
    return BigInt(value);
  } catch {
    const error = new Error("使用者 ID 格式不正確");
    error.status = 400;
    throw error;
  }
}

function normalizeText(value, fieldName) {
  if (typeof value !== "string") {
    const error = new Error(`${fieldName} 格式不正確`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function serializeUser(user) {
  return {
    user_id: user.user_id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    created_at: user.created_at?.toISOString() || null,
    last_login: user.last_login?.toISOString() || null,
    provider: user.google_id ? "Google" : "Credentials",
  };
}

function errorResponse(error) {
  return NextResponse.json(
    { error: error.message || "管理員帳號服務發生錯誤" },
    { status: error.status || 500 }
  );
}

async function assertCanChangeAdminStatus(targetUser, nextRole) {
  if (targetUser.role === "admin" && nextRole !== "admin") {
    const adminCount = await prisma.users.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      const error = new Error("不能移除最後一位管理員");
      error.status = 400;
      throw error;
    }
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    new AdminAuthorizationPolicy(session).assertAdmin();

    const targetUserId = toUserId(params.userId);
    const body = await request.json().catch(() => ({}));
    const data = {};

    if (Object.prototype.hasOwnProperty.call(body, "username")) {
      const username = normalizeText(body.username, "使用者名稱");
      if (username.length < 2 || username.length > 100) {
        const error = new Error("使用者名稱需為 2 到 100 個字元");
        error.status = 400;
        throw error;
      }
      data.username = username;
    }

    if (Object.prototype.hasOwnProperty.call(body, "email")) {
      const email = normalizeText(body.email, "電子郵件");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
        const error = new Error("電子郵件格式不正確");
        error.status = 400;
        throw error;
      }
      data.email = email.toLowerCase();
    }

    if (Object.prototype.hasOwnProperty.call(body, "role")) {
      const role = normalizeText(body.role, "角色");
      if (!ALLOWED_ROLES.has(role)) {
        const error = new Error("角色只能是 admin 或 user");
        error.status = 400;
        throw error;
      }
      data.role = role;
    }

    if (Object.keys(data).length === 0) {
      const error = new Error("沒有可更新的欄位");
      error.status = 400;
      throw error;
    }

    const targetUser = await prisma.users.findUnique({
      where: { user_id: targetUserId },
    });

    if (!targetUser) {
      const error = new Error("找不到使用者");
      error.status = 404;
      throw error;
    }

    if (
      session.user.id === targetUserId.toString() &&
      data.role &&
      data.role !== targetUser.role
    ) {
      const error = new Error("不能變更目前登入帳號的角色");
      error.status = 400;
      throw error;
    }

    await assertCanChangeAdminStatus(targetUser, data.role || targetUser.role);

    const updatedUser = await prisma.users.update({
      where: { user_id: targetUserId },
      data,
    });

    return NextResponse.json({ user: serializeUser(updatedUser) });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "使用者名稱或電子郵件已被使用" },
        { status: 409 }
      );
    }
    if (!error.status || error.status >= 500) {
      console.error("Admin user update failed:", error);
    }
    return errorResponse(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    new AdminAuthorizationPolicy(session).assertAdmin();

    const targetUserId = toUserId(params.userId);
    if (session.user.id === targetUserId.toString()) {
      const error = new Error("不能刪除目前登入中的管理員帳號");
      error.status = 400;
      throw error;
    }

    const targetUser = await prisma.users.findUnique({
      where: { user_id: targetUserId },
    });

    if (!targetUser) {
      const error = new Error("找不到使用者");
      error.status = 404;
      throw error;
    }

    if (targetUser.role === "admin") {
      const adminCount = await prisma.users.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        const error = new Error("不能刪除最後一位管理員");
        error.status = 400;
        throw error;
      }
    }

    await prisma.users.delete({
      where: { user_id: targetUserId },
    });

    return NextResponse.json({ deleted_user_id: targetUserId.toString() });
  } catch (error) {
    if (!error.status || error.status >= 500) {
      console.error("Admin user delete failed:", error);
    }
    return errorResponse(error);
  }
}
