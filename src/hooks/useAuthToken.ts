import { useEffect, useState } from "react";
import { fetchMe } from "@/lib/authApi";

export function useAuthToken() {
  const [user, setUser] = useState<null | { _id: string; email: string; name: string }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const token = localStorage.getItem("token") || "";
      if (!token) return;

      setLoading(true);
      setError(null);
      try {
        const u = await fetchMe();
        if (mounted) setUser(u);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to fetch user");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading, error };
}

