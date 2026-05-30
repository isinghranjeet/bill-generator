import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { usePwaInstallAndUpdate } from "@/hooks/usePwaInstallAndUpdate";

export function PwaUpdateBanner() {
  const { showUpdate, actions } = usePwaInstallAndUpdate();

  if (!showUpdate) return null;

  return (
    <div className="no-print fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4">
      <div className="bg-card border border-border shadow-md rounded-lg px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold">New version available</div>
          <div className="text-xs text-muted-foreground">Update available for offline use.</div>
        </div>
        <Button onClick={actions.refreshApp} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

