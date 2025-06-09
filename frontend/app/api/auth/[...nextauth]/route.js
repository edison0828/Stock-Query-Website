// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma"; // <<< 引入 Prisma Client 實例
import { verifyPassword } from "@/lib/auth-utils"; // <<< 假設你將密碼驗證移到一個工具檔案
// 假設你之後會有使用者資料庫互動
// import { getUserByEmail, verifyPassword } from "@/lib/db/users"; // 範例

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.log("NextAuth Authorize: Missing credentials");
          throw new Error("請輸入電子郵件和密碼"); // 會被 signIn 捕獲並顯示為錯誤
        }
        try {
          const user = await prisma.users.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.log(`NextAuth Authorize: No user for ${credentials.email}`);
            throw new Error("電子郵件或密碼錯誤");
          }

          if (!user.password_hash) {
            console.log(
              `NextAuth Authorize: User ${credentials.email} has no password (OAuth user?)`
            );
            throw new Error("此帳戶可能使用第三方登入，請嘗試其他登入方式");
          }

          const isValidPassword = await verifyPassword(
            credentials.password,
            user.password_hash
          );

          if (!isValidPassword) {
            console.log(
              `NextAuth Authorize: Invalid password for ${credentials.email}`
            );
            throw new Error("電子郵件或密碼錯誤");
          }

          // 如果驗證成功，更新用戶的 last_login 時間
          await prisma.users.update({
            where: { user_id: user.user_id },
            data: { last_login: new Date() },
          });
          return {
            id: user.user_id.toString(),
            name: user.username,
            email: user.email,
            role: user.role,
            // image: user.image, // 如果你資料庫有 image 欄位
          };
        } catch (error) {
          console.error(
            "NextAuth Authorize Catch Block - Original Error:",
            error.message
          ); // 打印原始錯誤訊息

          // 檢查是否是我們在 try 塊中明確拋出的錯誤類型
          // 這些是我們希望直接傳遞給前端的特定錯誤訊息
          const knownErrorMessages = [
            "請輸入電子郵件和密碼",
            "電子郵件或密碼錯誤",
            "此帳戶可能使用第三方登入，請嘗試其他登入方式",
          ];

          if (
            error instanceof Error &&
            knownErrorMessages.includes(error.message)
          ) {
            console.log(
              "NextAuth Authorize Catch Block - Rethrowing known error:",
              error.message
            );
            throw error; // 重新拋出我們自訂的、已知的錯誤
          }

          // 對於其他所有未預期的錯誤 (例如 Prisma 連接錯誤、查詢錯誤等)
          console.log(
            "NextAuth Authorize Catch Block - Throwing generic internal error for:",
            error.message
          );
          throw new Error("登入服務暫時無法使用，請稍後再試。"); // 一個更通用的內部錯誤訊息
        }
      },
    }),
  ],
  session: {
    strategy: "jwt", // 使用 JWT sessions
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // `user` 是 NextAuth 根據 Provider 返回的標準化 user object
      // `account` 包含 provider, access_token 等 OAuth 資訊
      // `profile` 是 OAuth provider 返回的原始 profile data

      // ... (在 signIn 回呼中)
      if (account.provider === "google") {
        if (!profile?.email) {
          console.error("Google profile missing email");
          return false; // 阻止登入
        }
        try {
          // 1. 優先嘗試通過 google_id 查找用戶 (如果用戶之前已用 Google 登入過)
          let dbUser = await prisma.users.findUnique({
            where: { google_id: profile.sub }, // profile.sub 是 Google 返回的唯一 ID
          });

          if (!dbUser) {
            // 2. 如果 google_id 找不到，再嘗試通過 email 查找
            //    這處理了用戶可能先用 Email/Password 註冊，然後再用 Google 登入的情況
            dbUser = await prisma.users.findUnique({
              where: { email: profile.email },
            });

            if (dbUser) {
              // Email 存在，但 google_id 未設置，表示這是第一次用 Google 登入這個 Email 帳戶
              // 更新現有帳戶以關聯 google_id
              dbUser = await prisma.users.update({
                where: { email: profile.email },
                data: {
                  google_id: profile.sub,
                  last_login: new Date(),
                  // image: dbUser.image || profile.picture, // 如果本地沒有頭像，則使用 Google 的
                  // email_verified: dbUser.email_verified || profile.email_verified (如果需要同步驗證狀態)
                },
              });
            } else {
              // 3. Email 也不存在，創建全新用戶
              let username =
                profile.name.replace(/\s+/g, "").toLowerCase() ||
                profile.email.split("@")[0]; // 使用 Google 名稱或 Email 前綴作為用戶名
              const existingUsername = await prisma.users.findUnique({
                where: { username },
              });
              if (existingUsername) {
                username = `${username}_${Math.random()
                  .toString(36)
                  .substring(2, 7)}`;
              }

              dbUser = await prisma.users.create({
                data: {
                  email: profile.email,
                  username: username,
                  role: "user",
                  // image: profile.picture,
                  google_id: profile.sub, // 儲存 google_id
                  last_login: new Date(),
                  created_at: new Date(),
                  password_hash: null, // OAuth 用戶通常沒有本地密碼
                },
              });
            }
          } else {
            // google_id 找到了用戶，直接更新 last_login 和可能的其他資訊
            dbUser = await prisma.users.update({
              where: { google_id: profile.sub },
              data: {
                last_login: new Date(),
                email: profile.email, // 保持 Email 與 Google 同步 (如果允許)
                username:
                  dbUser.username ||
                  profile.name?.replace(/\s+/g, "").toLowerCase() ||
                  profile.email.split("@")[0], // 如果 username 為空則更新
                // image: profile.picture, // 保持頭像與 Google 同步
              },
            });
          }

          // 將資料庫中的 user_id 等資訊賦值給 NextAuth 的 user 物件
          user.id = dbUser.user_id.toString();
          user.name = dbUser.username;
          user.email = dbUser.email;
          user.role = dbUser.role;
          // user.image = dbUser.image; // 如果你希望在 session 中使用
        } catch (error) {
          console.error(
            "Google Sign In DB Error (with google_id logic):",
            error
          );
          return false;
        }
      }
      return true; // 對於 CredentialsProvider 或其他情況，如果 authorize 成功則允許登入
    },

    async jwt({ token, user, account, profile }) {
      // `user` 參數只在第一次登入成功後 (Credentials 或 OAuth) 可用
      // 它是由 authorize (Credentials) 或 signIn (OAuth) callback 修改後的 user 物件
      if (user) {
        token.id = user.id; // 來自 dbUser.user_id (Google) 或 authorize (Credentials)
        token.name = user.name; // 來自 dbUser.username 或 authorize
        token.email = user.email; // 來自 dbUser.email 或 authorize
        token.role = user.role; // 來自 dbUser.role 或 authorize
        // token.image = user.image;
      }
      if (account) {
        // 這裡的 account 只在 OAuth 登入時可用
        token.provider = account.provider;
        // token.accessToken = account.access_token; // 如果需要儲存 access token
      }
      // 為 credentials 登入設置預設 provider
      if (!token.provider && user) {
        token.provider = "credentials";
      }
      return token;
    },

    async session({ session, token }) {
      // token 參數是從 jwt callback 返回的
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role;
        session.user.provider = token.provider;
        // session.user.image = token.image;
      }
      // session.accessToken = token.accessToken; // 如果需要暴露 access token 到客戶端
      return session;
    },
  },
  pages: {
    signIn: "/login", // 指定你的登入頁面路徑
    error: "/login", // 登入錯誤時可以跳轉回登入頁並帶上 ?error=...
    // error: '/auth/error', // (可選) 自訂錯誤頁面
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
