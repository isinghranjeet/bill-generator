import { Button } from "@/components/ui/button";
import { usePwaInstallAndUpdate } from "@/hooks/usePwaInstallAndUpdate";
import { Download } from "lucide-react";

export function PwaInstallButton() {
  const { installable, actions } = usePwaInstallAndUpdate();

  if (!installable) return null;

  return (
    <Button variant="outline" onClick={actions.install} className="gap-2">
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}

