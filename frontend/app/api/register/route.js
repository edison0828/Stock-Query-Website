// app/api/register/route.js
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { username, email, password } = await req.json();

    // 1. 基本後端驗證 (補充前端驗證)
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: "缺少必要欄位 (username, email, password)" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { message: "密碼長度至少需要6個字元" },
        { status: 400 }
      );
    }
    // 你可以添加更複雜的 Email 和 Username 格式驗證

    // 2. 檢查 Email 是否已存在
    const existingUserByEmail = await prisma.users.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      return NextResponse.json(
        { message: "此電子郵件已被註冊", field: "email" },
        { status: 409 }
      ); // 409 Conflict
    }

    // 3. 檢查用戶名是否已存在
    const existingUserByUsername = await prisma.users.findUnique({
      where: { username },
    });
    if (existingUserByUsername) {
      return NextResponse.json(
        { message: "此用戶名已被使用", field: "username" },
        { status: 409 }
      );
    }

    // 4. 雜湊密碼
    const hashedPassword = await hashPassword(password);

    // 5. 創建新用戶
    const newUser = await prisma.users.create({
      data: {
        username,
        email,
        password_hash: hashedPassword,
        role: "user", // 預設角色
        // created_at 由 Prisma @default(now()) 處理
        // last_login 可以是 null 或在首次註冊時也設置為 now()
        last_login: new Date(),
      },
    });

    // 6. 返回成功響應 (不包含密碼雜湊)
    const { password_hash, ...userWithoutPassword } = newUser;
    return NextResponse.json(
      {
        user: {
          // 確保返回的 user 物件結構與前端期望的一致
          id: userWithoutPassword.user_id.toString(),
          username: userWithoutPassword.username,
          email: userWithoutPassword.email,
          role: userWithoutPassword.role,
        },
        message: "註冊成功！您現在可以登入。",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration API Error:", error);
    // PrismaClientKnownRequestError 可以用來捕捉特定的資料庫錯誤
    if (error.code === "P2002" && error.meta?.target) {
      // Prisma unique constraint violation
      const field = error.meta.target[0];
      let friendlyField = field;
      if (field === "email") friendlyField = "電子郵件";
      if (field === "username") friendlyField = "用戶名";
      return NextResponse.json(
        { message: `此${friendlyField}已被使用`, field },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "註冊過程中發生錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
