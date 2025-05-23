// app/auth-provider.jsx
"use client"; // <<< 關鍵：將這個組件標記為客戶端組件

import { SessionProvider } from "next-auth/react";
import React from "react";

export default function AuthProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
