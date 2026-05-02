import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import AdminMarketDataClient from "@/components/admin/AdminMarketDataClient";

export default async function AdminMarketDataPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/admin/market-data");
  }

  if (session.user?.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminMarketDataClient />;
}
