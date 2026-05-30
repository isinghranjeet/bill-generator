import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { setupInstallPrompt, triggerInstall } from "@/lib/pwaInstall";
import { setupPwaUpdate } from "@/lib/pwaUpdate";

export function usePwaInstallAndUpdate() {
  const [installable, setInstallable] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);


  useEffect(() => {
    setupInstallPrompt(() => setInstallable(true));
  }, []);

  useEffect(() => {
    return setupPwaUpdate(() => {
      setShowUpdate(true);
      toast.message("New version available", {
        description: "Refresh to update.",
      });
    });
  }, []);

  const actions = useMemo(
    () => ({
      async install() {
        const ok = await triggerInstall();
        if (!ok) toast.message("Install unavailable");
      },
      refreshApp() {
        setShowUpdate(false);
        window.location.reload();
      },
    }),
    []
  );

  return {
    installable,
    showUpdate,
    actions,
  };
}

