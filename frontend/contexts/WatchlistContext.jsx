"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const WatchlistContext = createContext();

export function WatchlistProvider({ children }) {
  const { data: session, status } = useSession();
  const [watchlistSummary, setWatchlistSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWatchlistSummary = async () => {
    if (!session?.user || status === "loading") return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/watchlist");
      if (response.ok) {
        const data = await response.json();
        setWatchlistSummary(data.slice(0, 5));
      }
    } catch (error) {
      console.error("獲取關注列表摘要失敗:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshWatchlist = () => {
    fetchWatchlistSummary();
  };

  useEffect(() => {
    fetchWatchlistSummary();
  }, [session, status]);

  return (
    <WatchlistContext.Provider
      value={{
        watchlistSummary,
        isLoading,
        refreshWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return context;
};
