// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
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
        // 這裡是你驗證使用者帳號密碼的邏輯
        // 實際應用中，你會查詢資料庫
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 範例：假設有一個驗證函數
        // const user = await getUserByEmail(credentials.email);
        // if (user && await verifyPassword(credentials.password, user.passwordHash)) {
        //   return { id: user.id, name: user.username, email: user.email }; // 返回使用者物件
        // }

        // 暫時的模擬驗證 (請替換為真實邏輯)
        if (
          credentials.email === "test@example.com" &&
          credentials.password === "password"
        ) {
          return { id: "1", name: "Test User", email: "test@example.com" };
        }

        // 如果驗證失敗
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt", // 使用 JWT sessions
  },
  callbacks: {
    // async jwt({ token, user, account }) {
    //   // Persist the OAuth access_token to the token right after signin
    //   if (account && user) {
    //     token.accessToken = account.access_token;
    //     token.id = user.id; // 如果 user 物件有 id
    //   }
    //   return token;
    // },
    // async session({ session, token }) {
    //   // Send properties to the client, like an access_token and user id from a provider.
    //   if (session.user) {
    //      session.user.id = token.id; // 假設 token 中有 id
    //   }
    //   session.accessToken = token.accessToken;
    //   return session;
    // },
  },
  pages: {
    signIn: "/login", // 指定你的登入頁面路徑
    // error: '/auth/error', // (可選) 自訂錯誤頁面
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
