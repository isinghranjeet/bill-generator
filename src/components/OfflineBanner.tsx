import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="no-print fixed top-20 left-0 right-0 z-[99] px-4">
      <div className="mx-auto max-w-7xl">
        <div className="bg-yellow-500 text-yellow-950 border border-yellow-600 rounded-lg px-4 py-3 shadow-sm">
          <div className="text-sm font-semibold">You are offline</div>
          <div className="text-xs opacity-90">
            Showing cached invoices (previously opened) when available.
          </div>
        </div>
      </div>
    </div>
  );
}

