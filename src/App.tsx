import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminPortal from "./pages/AdminPortal";

import CreateInvoice from "./pages/CreateInvoice";
import ViewInvoice from "./pages/ViewInvoice";
import EditInvoice from "./pages/EditInvoice";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { PwaUpdateBanner } from "@/components/PwaUpdateBanner";
import { OfflineBanner } from "@/components/OfflineBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PwaUpdateBanner />
        <OfflineBanner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="no-print">
            <header className="fixed top-4 right-4 z-[100] pointer-events-none">
              <div className="flex flex-col items-end gap-2 pointer-events-auto">
                <PwaInstallButton />
              </div>
            </header>
          </div>
          <Routes>
            <Route path="/" element={<AdminPortal />} />
            <Route path="/create" element={<CreateInvoice />} />
            <Route path="/view/:invoiceNo" element={<ViewInvoice />} />
            <Route path="/edit/:invoiceNo" element={<EditInvoice />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </NextThemesProvider>
  </QueryClientProvider>
);

export default App;

