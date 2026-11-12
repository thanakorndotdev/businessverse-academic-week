import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, apiBase } from "./api";
export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        return (await api.me()).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60000,
    retry: false,
  });
}
export function useRealtime() {
  const { data: user } = useUser();
  const cache = useQueryClient();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!user) {
      setConnected(false);
      return;
    }
    const source = new EventSource(`${apiBase}/realtime/stream`, {
      withCredentials: true,
    });
    const refresh = () => {
      cache.invalidateQueries({ queryKey: ["user"] });
      cache.invalidateQueries({ queryKey: ["departments"] });
      cache.invalidateQueries({ queryKey: ["passport"] });
      cache.invalidateQueries({ queryKey: ["quiz"] });
      cache.invalidateQueries({ queryKey: ["overview"] });
      cache.invalidateQueries({ queryKey: ["participants"] });
    };
    source.addEventListener("CONNECTED", () => {
      setConnected(true);
      refresh();
      cache.invalidateQueries({ queryKey: ["leaderboard"] });
    });
    source.addEventListener("DEPT_Q1_UNLOCKED", refresh);
    source.addEventListener("TARGET_UPDATED", refresh);
    source.addEventListener("COMPETITION_UPDATED", () => {
      refresh();
      cache.invalidateQueries({ queryKey: ["competition"] });
      cache.invalidateQueries({ queryKey: ["final"] });
      cache.invalidateQueries({ queryKey: ["leaderboard"] });
    });
    source.addEventListener("SCOREBOARD_UPDATED", () => {
      cache.invalidateQueries({ queryKey: ["leaderboard"] });
      cache.invalidateQueries({ queryKey: ["overview"] });
      cache.invalidateQueries({ queryKey: ["participants"] });
    });
    source.onerror = () => setConnected(false);
    return () => {
      source.close();
      setConnected(false);
    };
  }, [user?.id, cache]);
  return connected;
}

export function useCompetition() {
  return useQuery({
    queryKey: ["competition"],
    queryFn: api.competition,
    staleTime: 15000,
    refetchInterval: 30000,
  });
}
