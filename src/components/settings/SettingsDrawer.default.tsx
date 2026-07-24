import SettingsDrawerShell from "./SettingsDrawer";

export type SettingsDrawerDefaultProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// NOTE: This file exists only to avoid runtime import errors if
// some callsites expect a default export from SettingsDrawer.tsx.
// Prefer importing from "@/components/settings/SettingsDrawer".
export default function SettingsDrawerDefault(props: SettingsDrawerDefaultProps) {
  return <SettingsDrawerShell {...props} />;
}

