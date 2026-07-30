logo
more
question-ai-logo
managemanage
managemanage
useruser
fullfull
closeclose
Chat AI
Hello! Is there any question I can help you with?
What are the main industries driving the U.S. economy?
What can you do?
Ask AI
Caution
Refresh this page to activate the extension on this page.
Refresh
Feedback
import { useState, useMemo, useEffect, useRef } from "react";
import { useInvoiceOfflineCache } from "@/hooks/useInvoiceOfflineCache";
import { useNavigate } from "react-router-dom";
import { useInvoiceStorage, SavedInvoice } from "@/hooks/useInvoiceStorage";
import { getInvoice as getInvoiceApi } from "@/lib/invoiceApi";
import type { InvoiceData } from "@/types/invoice";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  FileText,
  Eye,
  Trash2,
  IndianRupee,
  Users,
  ArrowUpDown,
  Calendar,
  User,
  CreditCard,
  MoreVertical,
  FileSpreadsheet,
  FileCheck,
  BarChart3,
  X,
  Printer,
  Share2,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  File,
  ChevronLeft,
  ChevronRight,
  Filter,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfessionalInvoice } from "@/components/invoice/ProfessionalInvoice";
import { SettingsDrawer } from "@/components/settings";
import { cn } from "@/lib/utils";
import { generateReportPdf } from "@/lib/pdfService";



type SortField = "date" | "amount" | "invoiceNo" | "customer";

type SortDirection = "asc" | "desc";
type FilterPeriod = "all" | "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "thisYear" | "custom" | "customRange";
type FilterType = "all" | "quotation" | "with_gst" | "without_gst";

// =========================================
// UTILITY: Robust local date parsing
// A date-only string like "2024-01-10" is treated by JS `Date` as
// UTC midnight. Once converted to the user's local timezone this can
// land on a different calendar day (this was the "10 ban gaya 13/11"
// bug). Parsing the Y-M-D parts manually keeps it on the correct
// local day every time.
// =========================================
const parseLocalDate = (value: string | number | Date | undefined | null): Date => {
  if (!value) return new Date();

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  if (typeof value === "string") {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      const [, y, m, d] = dateOnlyMatch;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  return new Date();
};

// =========================================
// COMPONENT: DashboardStats
// =========================================
interface DashboardStatsProps {
  stats: {
    total: number;
    totalRevenue: number;
    uniqueCustomers: number;
    thisMonthCount: number;
    thisMonthRevenue: number;
    averageInvoice: number;
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const statCards = [
    {
      label: "Total Invoices",
      value: stats.total,
      sub: `${stats.thisMonthCount} this month`,
      icon: FileText,
      color: "primary",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      sub: `${formatCurrency(stats.thisMonthRevenue)} this month`,
      icon: IndianRupee,
      color: "green",
    },
    {
      label: "Customers",
      value: stats.uniqueCustomers,
      sub: `${((stats.uniqueCustomers / stats.total) * 100 || 0).toFixed(1)}% repeat`,
      icon: Users,
      color: "blue",
    },
    {
      label: "Avg. Invoice",
      value: formatCurrency(stats.averageInvoice),
      sub: `Total: ${stats.total} invoices`,
      icon: CreditCard,
      color: "purple",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        const colorClasses = {
          primary: "bg-primary/10 text-primary",
          green: "bg-green-500/10 text-green-600",
          blue: "bg-blue-500/10 text-blue-600",
          purple: "bg-purple-500/10 text-purple-600",
        };

        return (
          <div
            key={card.label}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Card className="bg-gradient-to-br from-card to-card/95 border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                    <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </div>
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", colorClasses[card.color as keyof typeof colorClasses])}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

// =========================================
// COMPONENT: DateFilter
// =========================================
interface DateFilterProps {
  filterPeriod: FilterPeriod;
  setFilterPeriod: (value: FilterPeriod) => void;
  customDate: Date | undefined;
  setCustomDate: (date: Date | undefined) => void;
  customRange: { from: Date | undefined; to: Date | undefined };
  setCustomRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  activeFilterDisplay: string;
}

const DateFilter: React.FC<DateFilterProps> = ({
  filterPeriod,
  setFilterPeriod,
  customDate,
  setCustomDate,
  customRange,
  setCustomRange,
  activeFilterDisplay,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRangeOpen, setIsRangeOpen] = useState(false);

  const handlePeriodChange = (value: FilterPeriod) => {
    setFilterPeriod(value);
    if (value !== "custom" && value !== "customRange") {
      setCustomDate(undefined);
      setCustomRange({ from: undefined, to: undefined });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={filterPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[160px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7">Last 7 Days</SelectItem>
          <SelectItem value="last30">Last 30 Days</SelectItem>
          <SelectItem value="thisMonth">This Month</SelectItem>
          <SelectItem value="lastMonth">Last Month</SelectItem>
          <SelectItem value="thisYear">This Year</SelectItem>
          <SelectItem value="custom">Custom Date</SelectItem>
          <SelectItem value="customRange">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {filterPeriod === "custom" && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
              <Calendar className="mr-2 h-4 w-4" />
              {customDate ? format(customDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={customDate}
              onSelect={(date) => {
                setCustomDate(date);
                setIsCalendarOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {filterPeriod === "customRange" && (
        <Popover open={isRangeOpen} onOpenChange={setIsRangeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
              <Calendar className="mr-2 h-4 w-4" />
              {customRange.from ? (
                customRange.to ? (
                  <>
                    {format(customRange.from, "LLL dd, y")} - {format(customRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(customRange.from, "LLL dd, y")
                )
              ) : (
                "Pick a range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={customRange}
              onSelect={(range) => {
            setCustomRange({
                  from: range?.from,
                  to: range?.to ?? undefined,
                });
                if (range?.from && range?.to) {
                  setIsRangeOpen(false);
                }
              }}
              initialFocus
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      {filterPeriod !== "all" && activeFilterDisplay && (
        <Badge variant="secondary" className="flex items-center gap-1 whitespace-nowrap">
          <Calendar className="h-3 w-3" />
          {activeFilterDisplay}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
            onClick={() => {
              setFilterPeriod("all");
              setCustomDate(undefined);
              setCustomRange({ from: undefined, to: undefined });
            }}
          />
        </Badge>
      )}
    </div>
  );
};

// =========================================
// COMPONENT: FilterChips
// =========================================
interface FilterChipsProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterPeriod: FilterPeriod;
  setFilterPeriod: (value: FilterPeriod) => void;
  filterType: FilterType;
  setFilterType: (value: FilterType) => void;
  selectedCustomer: string;
  setSelectedCustomer: (value: string) => void;
  customDate: Date | undefined;
  setCustomDate: (date: Date | undefined) => void;
  customRange: { from: Date | undefined; to: Date | undefined };
  setCustomRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  activeFilterDisplay: string;
  clearAllFilters: () => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  searchQuery,
  setSearchQuery,
  filterPeriod,
  setFilterPeriod,
  filterType,
  setFilterType,
  selectedCustomer,
  setSelectedCustomer,
  customDate,
  setCustomDate,
  customRange,
  setCustomRange,
  activeFilterDisplay,
  clearAllFilters,
}) => {
  const hasActiveFilters = searchQuery || filterPeriod !== "all" || filterType !== "all" || selectedCustomer !== "all";

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-border mt-2 animate-slide-down">
      <span className="text-sm text-muted-foreground mr-2 flex items-center">
        <Filter className="h-3 w-3 mr-1" />
        Active Filters:
      </span>

      {searchQuery && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Search: {searchQuery}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
            onClick={() => setSearchQuery("")}
          />
        </Badge>
      )}

      {filterPeriod !== "all" && activeFilterDisplay && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {activeFilterDisplay}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
            onClick={() => {
              setFilterPeriod("all");
              setCustomDate(undefined);
              setCustomRange({ from: undefined, to: undefined });
            }}
          />
        </Badge>
      )}

      {filterType !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Type: {filterType.replace("_", " ")}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
            onClick={() => setFilterType("all")}
          />
        </Badge>
      )}

      {selectedCustomer !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Customer: {selectedCustomer}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
            onClick={() => setSelectedCustomer("all")}
          />
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={clearAllFilters}
        className="text-muted-foreground hover:text-destructive h-6 px-2 text-xs"
      >
        Clear All
      </Button>
    </div>
  );
};

// =========================================
// COMPONENT: ReportDialog
// =========================================
interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: SavedInvoice[];
  reportType: "all" | "quotation" | "with_gst" | "without_gst";
  generateReport: (invoiceIds: string[]) => Promise<void>;
  hasGST: (invoice: SavedInvoice) => boolean;
  isQuotation: (invoice: SavedInvoice) => boolean;
}

const ReportDialog: React.FC<ReportDialogProps> = ({
  open,
  onOpenChange,
  invoices,
  reportType,
  generateReport,
  hasGST,
  isQuotation,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [invoiceNoSearch, setInvoiceNoSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSearchQuery("");
      setCustomerSearch("");
      setInvoiceNoSearch("");
      setCurrentPage(1);
    }
  }, [open]);

  // Filter invoices based on report type + search
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Only show invoices matching the report type that was clicked.
    // Previously this step was missing, so "With GST" (and every
    // other report type) showed ALL invoices instead of just the
    // matching ones.
    if (reportType !== "all") {
      result = result.filter((inv) => {
        switch (reportType) {
          case "quotation":
            return isQuotation(inv);
          case "with_gst":
            return !isQuotation(inv) && hasGST(inv);
          case "without_gst":
            return !isQuotation(inv) && !hasGST(inv);
          default:
            return true;
        }
      });
    }

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.details.invoiceNo.toLowerCase().includes(lower) ||
          inv.buyer.name.toLowerCase().includes(lower) ||
          inv.buyer.gstin?.toLowerCase().includes(lower)
      );
    }

    if (customerSearch) {
      const lower = customerSearch.toLowerCase();
      result = result.filter((inv) =>
        inv.buyer.name.toLowerCase().includes(lower)
      );
    }

    if (invoiceNoSearch) {
      const lower = invoiceNoSearch.toLowerCase();
      result = result.filter((inv) =>
        inv.details.invoiceNo.toLowerCase().includes(lower)
      );
    }

    return result;
  }, [invoices, reportType, hasGST, isQuotation, searchQuery, customerSearch, invoiceNoSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredInvoices.slice(start, end);
  }, [filteredInvoices, currentPage, rowsPerPage]);

/** Build a guaranteed-unique and STABLE key for a saved invoice record.
 *  The key MUST return the same value for the same record on EVERY call,
 *  because Set.has() lookups depend on referential equality of primitives.
 *
 *  Priority order:
 *   1. invoiceNo (primary identifier for all documents)
 *   2. quotationNo (fallback for quotations where invoiceNo is empty)
 *   3. A composite hash of other stable fields (buyer name + date + total)
 *      as last resort — NEVER use crypto.randomUUID() since that changes
 *      on every call and breaks Set.has() / checkbox sync.
 */
  const recordKey = (inv: { details: { invoiceNo?: string; quotationNo?: string; date?: unknown }; buyer?: { name?: string }; totalAmount?: number }): string => {
    const invNo = inv.details?.invoiceNo;
    if (invNo && invNo.trim() !== "") return invNo;
    const quoNo = inv.details?.quotationNo;
    if (quoNo && quoNo.trim() !== "") return quoNo;
    // Stable composite fallback: never use crypto.randomUUID() here!
    const buyerName = (inv.buyer?.name || "").trim();
    const dateStr = String(inv.details?.date ?? "");
    const amount = typeof inv.totalAmount === "number" ? inv.totalAmount : 0;
    return `__unidentified_${buyerName.slice(0, 20)}_${dateStr.slice(0, 10)}_${amount}`;
  };

  // Select all — uses filteredInvoices (ALL matching items) NOT paginatedInvoices (current page only)
  // This ensures Select All selects every invoice matching current filters regardless of pagination.
  const selectAll = () => {
    const allFilteredKeys = filteredInvoices.map((inv) => recordKey(inv));
    const allSelected = allFilteredKeys.every((key) => selectedIds.has(key));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredKeys));
    }
  };

  // Toggle individual
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Handle generate
  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.warning("Please select at least one invoice.");
      return;
    }

    // [DEBUG] Dialog: confirm what's being sent
    const idsArray = Array.from(selectedIds);
    console.log("[DEBUG ReportDialog] handleGenerate - selectedIds.size:", selectedIds.size);
    console.log("[DEBUG ReportDialog] handleGenerate - idsArray:", idsArray);
    console.log("[DEBUG ReportDialog] handleGenerate - filteredInvoices.length:", filteredInvoices.length);
    console.log("[DEBUG ReportDialog] handleGenerate - all filtered invoice numbers:", filteredInvoices.map(inv => inv.details?.invoiceNo || inv.details?.quotationNo || 'unnamed'));

    setIsGenerating(true);
    try {
      await generateReport(idsArray);
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getTypeLabel = () => {
    switch (reportType) {
      case "all":
        return "Complete Report";
      case "quotation":
        return "Quotation Report";
      case "with_gst":
        return "GST Report";
      case "without_gst":
        return "Without GST Report";
      default:
        return "Report";
    }
  };

  const getTypeIcon = () => {
    switch (reportType) {
      case "all":
        return <FileText className="h-5 w-5" />;
      case "quotation":
        return <FileSpreadsheet className="h-5 w-5" />;
      case "with_gst":
        return <FileCheck className="h-5 w-5" />;
      case "without_gst":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                {getTypeIcon()}
              </div>
              <div>
                <DialogTitle className="text-2xl">{getTypeLabel()}</DialogTitle>
                <DialogDescription>
                  Select invoices to include in the report
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {selectedIds.size} of {filteredInvoices.length} selected
            </Badge>
          </div>
        </DialogHeader>

        {/* Search Section */}
        <div className="p-6 pb-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice number..."
                value={invoiceNoSearch}
                onChange={(e) => setInvoiceNoSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6 pt-3">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        filteredInvoices.length > 0 &&
                        filteredInvoices.every((inv) => selectedIds.has(recordKey(inv)))
                      }
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground">No invoices found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice, index) => {
                    const isGST = invoice.items.some(
                      (item) =>
                        (item.sgstRate && item.sgstRate > 0) ||
                        (item.cgstRate && item.cgstRate > 0) ||
                        (item.igstRate && item.igstRate > 0)
                    );
                    const isQuote = invoice.details.invoiceTitle
                      ?.toLowerCase()
                      .includes("quotation") ||
                      !!invoice.details.quotationNo;
                    const docType = isQuote
                      ? "Quotation"
                      : isGST
                      ? "GST Invoice"
                      : "Non-GST";

                    const invDate = parseLocalDate(invoice.details?.date);

                    return (
                      <TableRow
                        key={recordKey(invoice)}
                        className={cn(
                          "hover:bg-muted/30 transition-colors animate-slide-up",
                          selectedIds.has(recordKey(invoice)) &&
                            "bg-primary/5"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(recordKey(invoice))}
                            onCheckedChange={() =>
                              toggleSelection(recordKey(invoice))
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {invoice.details.invoiceNo}
                        </TableCell>
                        <TableCell>{formatDate(invDate)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{invoice.buyer.name}</span>
                            {invoice.buyer.gstin && (
                              <span className="text-xs text-muted-foreground font-mono">
                                GST: {invoice.buyer.gstin}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              isQuote
                                ? "secondary"
                                : isGST
                                ? "default"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {docType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {filteredInvoices.length > 0 && (
          <div className="p-6 pt-0 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  setRowsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-2">
                {filteredInvoices.length} total
              </span>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={cn(
                      "cursor-pointer",
                      currentPage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNumber: number;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNumber)}
                        isActive={currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    className={cn(
                      "cursor-pointer",
                      currentPage === totalPages &&
                        "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="p-6 pt-0 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={selectedIds.size === 0 || isGenerating}
            className="min-w-[150px]"
          >
            {isGenerating ? "Generating..." : `Generate (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =========================================
// MAIN COMPONENT: AdminPortal
// =========================================
const AdminPortal = () => {
  const navigate = useNavigate();
  const { invoices, deleteInvoice, apiState } = useInvoiceStorage();

  useInvoiceOfflineCache({
    setInvoices: undefined,
  });

  // State
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customRange, setCustomRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<
    "all" | "quotation" | "with_gst" | "without_gst"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

// State for report print overlay
  const [reportInvoices, setReportInvoices] = useState<InvoiceData[] | null>(null);

  // Extract unique customers
  const uniqueCustomers = useMemo(() => {
    const customers = invoices.map((inv) => inv.buyer.name);
    return ["all", ...new Set(customers)];
  }, [invoices]);

  // Helper functions
  const hasGST = (invoice: SavedInvoice) => {
    return invoice.items.some(
      (item) =>
        (item.sgstRate && item.sgstRate > 0) ||
        (item.cgstRate && item.cgstRate > 0) ||
        (item.igstRate && item.igstRate > 0)
    );
  };

  const isQuotation = (invoice: SavedInvoice) => {
    return (
      invoice.details.invoiceTitle?.toLowerCase().includes("quotation") ||
      !!invoice.details.quotationNo
    );
  };

  const getInvoiceDate = (invoice: SavedInvoice): Date => {
    // Primary source for invoice listing/history date: details.date
    // (the user-selected invoice date from the form).
    // Fallback chain for backward compatibility with older records:
    //   1) invoice.details.date (user-selected invoice date)
    //   2) legacy: invoice.invoiceDate (older schema field name)
    //   3) legacy: invoice.date (generic date field)
    //   4) invoice.createdAt (server timestamp — last resort)
    const invoiceDateValue: string | number | Date | undefined | null =
      invoice.details?.date ??
      (invoice as { invoiceDate?: string | number | Date | null | undefined }).invoiceDate ??
      (invoice as { date?: string | number | Date | null | undefined }).date ??
      (invoice as { createdAt?: string | number | Date | null | undefined }).createdAt ??
      null;

    return parseLocalDate(invoiceDateValue);
  };

  // Get active filter display
  const activeFilterDisplay = useMemo(() => {
    switch (filterPeriod) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "last7":
        return "Last 7 Days";
      case "last30":
        return "Last 30 Days";
      case "thisMonth":
        return "This Month";
      case "lastMonth":
        return "Last Month";
      case "thisYear":
        return "This Year";
      case "custom":
        return customDate ? format(customDate, "dd MMM yyyy") : "";
      case "customRange":
        return customRange.from && customRange.to
          ? `${format(customRange.from, "dd MMM")} - ${format(
              customRange.to,
              "dd MMM yyyy"
            )}`
          : "";
      default:
        return "";
    }
  }, [filterPeriod, customDate, customRange]);

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.details.invoiceNo.toLowerCase().includes(lowerQuery) ||
          inv.buyer.name.toLowerCase().includes(lowerQuery) ||
          inv.consignee.name.toLowerCase().includes(lowerQuery) ||
          inv.buyer.gstin?.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply type filter
    if (filterType !== "all") {
      result = result.filter((inv) => {
        switch (filterType) {
          case "quotation":
            return isQuotation(inv);
          case "with_gst":
            return !isQuotation(inv) && hasGST(inv);
          case "without_gst":
            return !isQuotation(inv) && !hasGST(inv);
          default:
            return true;
        }
      });
    }

    // Apply time period filter
    if (filterPeriod !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter((inv) => {
        const invDate = getInvoiceDate(inv);
        const invDateOnly = new Date(
          invDate.getFullYear(),
          invDate.getMonth(),
          invDate.getDate()
        );
        const invTime = invDateOnly.getTime();

        let include = false;
        switch (filterPeriod) {
          case "today": {
            include = invTime === today.getTime();
            break;
          }
          case "yesterday": {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            include = invTime === yesterday.getTime();
            break;
          }
          case "last7": {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            include = invTime >= weekAgo.getTime();
            break;
          }
          case "last30": {
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            include = invTime >= monthAgo.getTime();
            break;
          }
          case "thisMonth": {
            include =
              invDate.getMonth() === now.getMonth() &&
              invDate.getFullYear() === now.getFullYear();
            break;
          }
          case "lastMonth": {
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            include =
              invDate.getMonth() === lastMonth.getMonth() &&
              invDate.getFullYear() === lastMonth.getFullYear();
            break;
          }
          case "thisYear": {
            include = invDate.getFullYear() === now.getFullYear();
            break;
          }
          case "custom": {
            if (customDate) {
              const customDateOnly = new Date(
                customDate.getFullYear(),
                customDate.getMonth(),
                customDate.getDate()
              );
              include = invTime === customDateOnly.getTime();
            }
            break;
          }
          case "customRange": {
            if (customRange.from && customRange.to) {
              const from = new Date(
                customRange.from.getFullYear(),
                customRange.from.getMonth(),
                customRange.from.getDate()
              );
              const to = new Date(
                customRange.to.getFullYear(),
                customRange.to.getMonth(),
                customRange.to.getDate()
              );
              include = invTime >= from.getTime() && invTime <= to.getTime();
            }
            break;
          }
          default:
            include = true;
        }
        return include;
      });
    }

    // Apply customer filter
    if (selectedCustomer !== "all") {
      result = result.filter((inv) => inv.buyer.name === selectedCustomer);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "date": {
          aValue = getInvoiceDate(a).getTime();
          bValue = getInvoiceDate(b).getTime();
          break;
        }
        case "amount":
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case "invoiceNo":
          aValue = a.details.invoiceNo;
          bValue = b.details.invoiceNo;
          break;
        case "customer":
          aValue = a.buyer.name.toLowerCase();
          bValue = b.buyer.name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    invoices,
    searchQuery,
    sortField,
    sortDirection,
    filterPeriod,
    filterType,
    selectedCustomer,
    customDate,
    customRange,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredInvoices.slice(start, end);
  }, [filteredInvoices, currentPage, rowsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPeriod, filterType, selectedCustomer, customDate, customRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const uniqueCustomers = new Set(invoices.map((inv) => inv.buyer.name)).size;

    const now = new Date();
    const thisMonthRevenue = invoices
      .filter((inv) => {
        const invDate = getInvoiceDate(inv);
        return (
          invDate.getMonth() === now.getMonth() &&
          invDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const thisMonthCount = invoices.filter((inv) => {
      const invDate = getInvoiceDate(inv);
      return (
        invDate.getMonth() === now.getMonth() &&
        invDate.getFullYear() === now.getFullYear()
      );
    }).length;

    const averageInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0;

    return {
      totalRevenue,
      uniqueCustomers,
      thisMonthCount,
      thisMonthRevenue,
      averageInvoice,
      total: invoices.length,
    };
  }, [invoices]);

  // Handlers
  const [deletingInvoiceNo, setDeletingInvoiceNo] = useState<string | null>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<InvoiceData | null>(null);

  const handleDelete = async (invoiceNo: string) => {
    setDeletingInvoiceNo(invoiceNo);
    try {
      await deleteInvoice(invoiceNo);
      toast.success(`Invoice ${invoiceNo} deleted successfully!`);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete invoice");
    } finally {
      setDeletingInvoiceNo(null);
    }
  };

  const handlePrintInvoice = (invoice: SavedInvoice) => {
    // Set the invoice data to render in the print overlay
    setPrintInvoiceData(invoice);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3" />;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterPeriod("all");
    setFilterType("all");
    setSelectedCustomer("all");
    setCustomDate(undefined);
    setCustomRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  };

  // Escapes free-text fields (customer name, address, item description,
  // remarks, etc.) before they're injected into the report's HTML string,
  // so values containing <, >, & or quotes can't break the layout.
  const escapeHtml = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // ==========================================================================
  // BUGFIX (invoice-count drop 5 -> 2 during report generation):
  //
  // Root cause: this function used to split selected ids into "found locally"
  // vs "needs API fetch" using a STRICT completeness check
  // (details && company && Array.isArray(items)). Any local record that
  // failed that check was pushed into apiIds instead of being used. Then,
  // if the corresponding API call failed OR the API response also failed
  // the same strict check, that invoice was DROPPED SILENTLY -- no log, no
  // toast naming which invoice was lost, no error thrown. Two independent
  // silent-drop paths (Promise.allSettled rejections, and the "isValid"
  // check discarding a fulfilled-but-imperfect API response) could each
  // remove invoices without anyone noticing until the PDF/print output was
  // inspected and found short.
  //
  // Fix: never discard an id outright.
  //   1. Prefer the local record if it exists, even if it doesn't pass the
  //      strict shape check (partial local records are still usable/better
  //      than nothing) -- but we only SKIP local and go to API when there is
  //      truly no local record with that invoiceNo at all is not what we do;
  //      instead we keep the original "prefer complete local record" order,
  //      but if the API path fails or returns bad data, we fall back to the
  //      local record instead of dropping the invoice.
  //   2. Only truly missing invoices are excluded, and are explicitly
  //      reported to the user via a warning toast that names the ids, so a
  //      short report is never mistaken for a "complete" one again.
  // ==========================================================================
const generateReport = async (invoiceIds: string[]) => {
    if (invoiceIds.length === 0) {
      toast.warning("No invoices selected.");
      return;
    }

    // [DEBUG] Step 1: count of IDs entering the function
    console.log("[DEBUG generateReport] STEP 1 - IDs received:", invoiceIds.length, invoiceIds.map(id => id.slice(0, 30)));

    try {
      // Build invoice data from local cache first, then API for any missing ones.
      const fetchedInvoices: InvoiceData[] = [];
      const apiIds: string[] = [];
      const droppedIds: string[] = [];

      for (const id of invoiceIds) {
        // Skip unidentified fallback keys generated by recordKey() for records
        // with no invoiceNo and no quotationNo — these cannot be resolved.
        if (!id || id.startsWith("__")) continue;

        // DETERMINISTIC lookup: match by BOTH invoiceNo AND quotationNo
        // in a single pass using an OR condition. This prevents the bug
        // where a sequential lookup (invoiceNo first, quotationNo second)
        // would match a REGULAR INVOICE whose invoiceNo coincidentally
        // equals the quotationNo being searched for.
        const local = invoices.find(
          (inv) => inv.details.invoiceNo === id || inv.details.quotationNo === id
        );

        // Validate that the local record has all required fields before using it
        if (local && local.details && local.company && Array.isArray(local.items)) {
          fetchedInvoices.push(local);
        } else if (id.trim() !== "") {
          apiIds.push(id);
        }
      }

      // [DEBUG] Step 2: count resolved from local cache
      console.log("[DEBUG generateReport] STEP 2 - resolved from local cache:", fetchedInvoices.length);
      console.log("[DEBUG generateReport] STEP 2b - local invoice numbers:", fetchedInvoices.map(i => i.details?.invoiceNo));
      console.log("[DEBUG generateReport] STEP 2c - still need API:", apiIds.length, apiIds);

      // Fetch any invoices not found locally (or found but incomplete) from the API
      if (apiIds.length > 0) {
        const apiResults = await Promise.allSettled(
          apiIds.map((id) => getInvoiceApi(id))
        );

        apiResults.forEach((result, i) => {
          const id = apiIds[i];
          const apiInv = result.status === "fulfilled" ? result.value : null;
          const isValid =
            !!apiInv &&
            !!apiInv.details &&
            !!apiInv.company &&
            Array.isArray(apiInv.items);

          if (isValid) {
            fetchedInvoices.push(apiInv as InvoiceData);
            return;
          }

          // API fetch failed or returned incomplete data.
          // FIX: fall back to the local record (even if it was the reason we
          // tried the API in the first place) instead of dropping the invoice.
          const localFallback = invoices.find(
            (inv) => inv.details.invoiceNo === id || inv.details.quotationNo === id
          );
          if (localFallback) {
            fetchedInvoices.push(localFallback);
          } else {
            droppedIds.push(id);
          }
        });
      }

      // [DEBUG] Step 3: final count after merge
      console.log("[DEBUG generateReport] STEP 3 - fetchedInvoices FINAL count:", fetchedInvoices.length);
      console.log("[DEBUG generateReport] STEP 3b - final invoice numbers:", fetchedInvoices.map(i => i.details?.invoiceNo || i.details?.quotationNo));
      console.log("[DEBUG generateReport] STEP 3c - dropped IDs:", droppedIds);

      if (fetchedInvoices.length === 0) {
        toast.error("Failed to load invoice data.");
        return;
      }

      if (droppedIds.length > 0) {
        toast.warning(
          `Could not load ${droppedIds.length} invoice(s): ${droppedIds.join(", ")}`
        );
      }

// [DEBUG] Step 4: generate PDF directly using html2canvas+jsPDF pipeline
      console.log("[DEBUG generateReport] STEP 4 - generating PDF for", fetchedInvoices.length, "invoices");

      try {
        const pdfBlob = await generateReportPdf(fetchedInvoices);
        const url = URL.createObjectURL(pdfBlob);
        
        // Trigger download
        const link = document.createElement("a");
        link.href = url;
        const reportTypeName = reportType === "all" ? "Complete" : reportType === "quotation" ? "Quotation" : reportType === "with_gst" ? "GST" : "NonGST";
        link.download = `InvoiceReport_${reportTypeName}_${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        
        toast.success(
          `Report generated: ${fetchedInvoices.length} invoice(s) in PDF.`
        );
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError);
        toast.error("Failed to generate PDF. Falling back to print view.");
        // Fallback: use the ReportPrintView overlay with window.print()
        setReportInvoices(fetchedInvoices);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report. Please try again.");
    }
  };

  // Open report dialog
  const openReportDialog = (type: "all" | "quotation" | "with_gst" | "without_gst") => {
    setReportType(type);
    setReportDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md transition-transform hover:scale-105 duration-200">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Invoice Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage and track all your invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Reports Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shadow-sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Download Reports (PDF)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => openReportDialog("all")}
                  className="flex items-center gap-2 py-2"
                >
                  <div className="w-8 h-8 bg-purple-500/10 rounded-md flex items-center justify-center">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Complete Report</span>
                    <span className="text-xs text-muted-foreground">All invoices & quotations</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => openReportDialog("quotation")}
                  className="flex items-center gap-2 py-2"
                >
                  <div className="w-8 h-8 bg-blue-500/10 rounded-md flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Quotation Report</span>
                    <span className="text-xs text-muted-foreground">All quotations</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openReportDialog("with_gst")}
                  className="flex items-center gap-2 py-2"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">With GST Report</span>
                    <span className="text-xs text-muted-foreground">All GST invoices</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openReportDialog("without_gst")}
                  className="flex items-center gap-2 py-2"
                >
                  <div className="w-8 h-8 bg-green-500/10 rounded-md flex items-center justify-center">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Without GST Report</span>
                    <span className="text-xs text-muted-foreground">All non-GST invoices</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsDrawerOpen(true)}
              className="shadow-sm"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>

            {/* New Invoice Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Create New</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Invoice</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-56">
                    <DropdownMenuItem
                      onClick={() => navigate("/create?type=invoice&gst=1")}
                      className="flex items-center gap-2 py-2"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                        <FileCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">With GST</span>
                        <span className="text-xs text-muted-foreground">Tax invoice with GST</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/create?type=invoice&gst=0")}
                      className="flex items-center gap-2 py-2"
                    >
                      <div className="w-8 h-8 bg-green-500/10 rounded-md flex items-center justify-center">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Without GST</span>
                        <span className="text-xs text-muted-foreground">Simple invoice without GST</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onClick={() => navigate("/create?type=quotation")}
                  className="flex items-center gap-2 py-2"
                >
                  <div className="w-8 h-8 bg-blue-500/10 rounded-md flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Quotation</span>
                    <span className="text-xs text-muted-foreground">Create a new quotation</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <DashboardStats stats={stats} />

        {/* Filters */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices by number, customer, or GSTIN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <DateFilter
                    filterPeriod={filterPeriod}
                    setFilterPeriod={setFilterPeriod}
                    customDate={customDate}
                    setCustomDate={setCustomDate}
                    customRange={customRange}
                    setCustomRange={setCustomRange}
                    activeFilterDisplay={activeFilterDisplay}
                  />

                  <Select
                    value={filterType}
                    onValueChange={(value: FilterType) => setFilterType(value)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <FileText className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="quotation">Quotations</SelectItem>
                      <SelectItem value="with_gst">With GST</SelectItem>
                      <SelectItem value="without_gst">Without GST</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedCustomer}
                    onValueChange={setSelectedCustomer}
                  >
                    <SelectTrigger className="w-[180px]">
                      <User className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueCustomers.map((customer) => (
                        <SelectItem key={customer} value={customer}>
                          {customer === "all" ? "All Customers" : customer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Filter Chips */}
              <FilterChips
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterPeriod={filterPeriod}
                setFilterPeriod={setFilterPeriod}
                filterType={filterType}
                setFilterType={setFilterType}
                selectedCustomer={selectedCustomer}
                setSelectedCustomer={setSelectedCustomer}
                customDate={customDate}
                setCustomDate={setCustomDate}
                customRange={customRange}
                setCustomRange={setCustomRange}
                activeFilterDisplay={activeFilterDisplay}
                clearAllFilters={clearAllFilters}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Invoice History
                  <Badge variant="secondary" className="ml-2">
                    {filteredInvoices.length}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredInvoices.length} invoices found
                  {searchQuery && ` for "${searchQuery}"`}
                  {filterPeriod !== "all" && ` in ${activeFilterDisplay}`}
                  {filterType !== "all" && ` (${filterType.replace("_", " ")})`}
                  {selectedCustomer !== "all" && ` for ${selectedCustomer}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-1"
                >
                  Date {getSortIcon("date")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSort("amount")}
                  className="flex items-center gap-1"
                >
                  Amount {getSortIcon("amount")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSort("customer")}
                  className="flex items-center gap-1"
                >
                  Customer {getSortIcon("customer")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-16">
                <div className="animate-float">
                  <FileText className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery ||
                  filterPeriod !== "all" ||
                  filterType !== "all" ||
                  selectedCustomer !== "all"
                    ? "No matching invoices found"
                    : "No invoices yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery ||
                  filterPeriod !== "all" ||
                  filterType !== "all" ||
                  selectedCustomer !== "all"
                    ? "Try adjusting your search terms or filters to find what you're looking for."
                    : "Create your first invoice to start managing your billing and payments."}
                </p>
                {!searchQuery &&
                  filterPeriod === "all" &&
                  filterType === "all" &&
                  selectedCustomer === "all" && (
                    <Button onClick={() => navigate("/create")} size="lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Invoice
                    </Button>
                  )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[15%]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("invoiceNo")}
                          className="flex items-center gap-1 -ml-3 font-semibold"
                        >
                          Doc No. {getSortIcon("invoiceNo")}
                        </Button>
                        </TableHead>
                        <TableHead className="w-[12%]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("date")}
                            className="flex items-center gap-1 -ml-3 font-semibold"
                          >
                            Date {getSortIcon("date")}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[25%]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("customer")}
                            className="flex items-center gap-1 -ml-3 font-semibold"
                          >
                            Customer {getSortIcon("customer")}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[10%]">Type</TableHead>
                        <TableHead className="w-[15%] text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("amount")}
                            className="flex items-center gap-1 -ml-3 font-semibold"
                          >
                            Amount {getSortIcon("amount")}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[8%] text-center">Status</TableHead>
                        <TableHead className="w-[15%] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInvoices.map((invoice, index) => {
                    const invDate = getInvoiceDate(invoice);
                    const isRecent =
                      !isNaN(invDate.getTime()) &&
                      invDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        const isGST = hasGST(invoice);
                        const isQuote = isQuotation(invoice);
                        const docType = isQuote
                          ? "Quotation"
                          : isGST
                          ? "GST Invoice"
                          : "Non-GST";

                        return (
<TableRow
                            key={invoice?.details?.invoiceNo || invoice?.details?.quotationNo || `__row_${crypto.randomUUID()}`}
                            className={cn(
                              "hover:bg-muted/50 transition-colors cursor-pointer animate-slide-up",
                              index % 2 === 0 && "bg-card/50"
                            )}
                            style={{ animationDelay: `${index * 30}ms` }}
onClick={() =>
                              navigate(`/view/${(invoice as { _id?: string })._id || invoice.details.invoiceNo || invoice.details.quotationNo}`)
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono">
                                  {invoice.details.invoiceNo || invoice.details.quotationNo}
                                </span>
                                {isRecent && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-green-50 text-green-700 border-green-200"
                                  >
                                    New
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{formatDate(invDate)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {invoice.details.modeOfPayment || "Cash"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {invoice.buyer.name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {invoice.buyer.address}
                                </span>
                                {invoice.buyer.gstin && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    GSTIN: {invoice.buyer.gstin}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  isQuote
                                    ? "secondary"
                                    : isGST
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {docType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-lg">
                                  {formatCurrency(invoice.totalAmount)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {invoice.items.length} items
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div
                                className="flex items-center justify-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          navigate(
                                            `/view/${(invoice as { _id?: string })._id || invoice.details.invoiceNo || invoice.details.quotationNo}`
                                          )
                                        }
                                        className="hover:bg-primary/10"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-muted"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
<DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navigate(
                                          `/view/${(invoice as { _id?: string })._id || invoice.details.invoiceNo || invoice.details.quotationNo}`
                                        )
                                      }
                                    >
                                      <Eye className="h-4 w-4 mr-2" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navigate(
                                          `/edit/${(invoice as { _id?: string })._id || invoice.details.invoiceNo || invoice.details.quotationNo}`
                                        )
                                      }
                                    >
                                      <Edit className="h-4 w-4 mr-2" /> Edit Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handlePrintInvoice(invoice)
                                      }
                                    >
                                      <Printer className="h-4 w-4 mr-2" /> Print
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onSelect={(e) => e.preventDefault()}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                          <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Delete Invoice?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently delete invoice{" "}
                                            <span className="font-bold">
                                              {invoice.details.invoiceNo || invoice.details.quotationNo}
                                            </span>{" "}
                                            for {invoice.buyer.name}. This action
                                            cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            disabled={deletingInvoiceNo === ((invoice as { _id?: string })._id || invoice.details.invoiceNo || invoice.details.quotationNo)}
                                            onClick={() =>
                                              handleDelete(
                                                (invoice as { _id?: string })._id || invoice.details.invoiceNo || invoice.details.quotationNo
                                              )
                                            }
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            {deletingInvoiceNo === ((invoice as { _id?: string })._id || invoice.details.invoiceNo || invoice.details.quotationNo) ? "Deleting..." : "Delete Invoice"}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Rows per page:
                    </span>
                    <Select
                      value={rowsPerPage.toString()}
                      onValueChange={(value) => {
                        setRowsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground ml-2">
                      {filteredInvoices.length} total
                    </span>
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          className={cn(
                            "cursor-pointer",
                            currentPage === 1 && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNumber: number;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNumber)}
                              isActive={currentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          className={cn(
                            "cursor-pointer",
                            currentPage === totalPages &&
                              "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Settings Drawer */}
      <SettingsDrawer
        open={settingsDrawerOpen}
        onOpenChange={setSettingsDrawerOpen}
      />

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        invoices={invoices}
        reportType={reportType}
        generateReport={generateReport}
        hasGST={hasGST}
        isQuotation={isQuotation}
      />

      {/* Add CSS animations */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
`}</style>

      {/* Report Print Overlay */}
      {reportInvoices && (
        <ReportPrintView
          invoices={reportInvoices}
          onClose={() => setReportInvoices(null)}
        />
      )}

      {/* Single Invoice Print Overlay */}
      {printInvoiceData && (
        <SingleInvoicePrintView
          invoice={printInvoiceData}
          onClose={() => setPrintInvoiceData(null)}
        />
      )}
    </div>
  );
};

// =========================================
// ReportPrintView: Full-screen overlay used to print selected invoices.
// Renders each invoice using ProfessionalInvoice (editable=false),
// one per page with page-break-after: always.
// =========================================
interface ReportPrintViewProps {
  invoices: InvoiceData[];
  onClose: () => void;
}

const ReportPrintView: React.FC<ReportPrintViewProps> = ({
  invoices,
  onClose,
}) => {
  // [DEBUG] Step 5: verify what the component actually received
  useEffect(() => {
    console.log("[DEBUG ReportPrintView] STEP 5 - invoices prop received:", invoices?.length);
    console.log("[DEBUG ReportPrintView] STEP 5b - is array?", Array.isArray(invoices));
    if (Array.isArray(invoices)) {
      invoices.forEach((inv, i) => {
        console.log(`[DEBUG ReportPrintView] invoice[${i}]:`, inv.details?.invoiceNo || inv.details?.quotationNo || `unnamed-${i}`);
      });
    }
  }, [invoices]);

  useEffect(() => {
    // Auto-trigger print after a short delay to allow rendering
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Listen for afterprint to auto-close
  useEffect(() => {
    const handleAfterPrint = () => {
      onClose();
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [onClose]);

  const safeDate = (d: unknown): Date => {
    if (d instanceof Date) return Number.isNaN(d.getTime()) ? new Date() : d;
    const parsed = new Date(String(d));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // [DEBUG] Step 6: log how many divs will be rendered
  const invoiceCount = invoices?.length || 0;
  console.log("[DEBUG ReportPrintView] STEP 6 - rendering", invoiceCount, "invoice divs");

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto">
      {/* Close button - hidden during print */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <span className="text-sm font-medium text-gray-700">
          Report: {invoiceCount} invoice(s)
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.print();
            }}
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Invoice pages */}
      {invoices.map((inv, idx) => {
        const invIdentifier = inv.details?.invoiceNo || inv.details?.quotationNo || `invoice-${idx}`;
        console.log(`[DEBUG ReportPrintView] Rendering invoice idx=${idx}, id=${invIdentifier}`);
        return (
        <div
          key={invIdentifier}
          className="report-invoice-page"
          style={
            idx < invoiceCount - 1
              ? { pageBreakAfter: "always", marginBottom: 0 }
              : {}
          }
        >
          <div className="print:mx-auto print:my-0">
            <ProfessionalInvoice
              company={inv.company}
              consignee={inv.consignee}
              buyer={inv.buyer}
              details={{
                ...inv.details,
                invoiceTitle: inv.details.invoiceTitle ?? "TAX INVOICE",
                date: safeDate(inv.details.date),
              }}
              items={inv.items}
              remarks={inv.remarks}
              editable={false}
              onCompanyChange={() => {}}
              onConsigneeChange={() => {}}
              onBuyerChange={() => {}}
              onDetailsChange={() => {}}
              onItemsChange={() => {}}
              onRemarksChange={() => {}}
            />
          </div>
        </div>
        );
      })}

      <style>{`
@media print {
          .report-invoice-page {
            page-break-inside: avoid;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};

// =========================================
// SingleInvoicePrintView: Full-screen overlay used to print a SINGLE
// invoice in isolation. Only the invoice/quotation is printed -
// NO dashboard, NO sidebar, NO navbar, NO filters.
// =========================================
interface SingleInvoicePrintViewProps {
  invoice: InvoiceData;
  onClose: () => void;
}

const SingleInvoicePrintView: React.FC<SingleInvoicePrintViewProps> = ({
  invoice,
  onClose,
}) => {
  useEffect(() => {
    // Auto-trigger print after a short delay to allow rendering
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Listen for afterprint to auto-close
  useEffect(() => {
    const handleAfterPrint = () => {
      onClose();
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [onClose]);

  const safeDate = (d: unknown): Date => {
    if (d instanceof Date) return Number.isNaN(d.getTime()) ? new Date() : d;
    const parsed = new Date(String(d));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto">
      {/* Close button - hidden during print */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <span className="text-sm font-medium text-gray-700">
          {invoice.details.invoiceTitle || "Invoice"}: {invoice.details.invoiceNo || invoice.details.quotationNo}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.print();
            }}
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Single Invoice - professional layout for print */}
      <div className="print:mx-auto print:my-0">
        <ProfessionalInvoice
          company={invoice.company}
          consignee={invoice.consignee}
          buyer={invoice.buyer}
          details={{
            ...invoice.details,
            invoiceTitle: invoice.details.invoiceTitle ?? "TAX INVOICE",
            date: safeDate(invoice.details.date),
          }}
          items={invoice.items}
          remarks={invoice.remarks}
          editable={false}
          onCompanyChange={() => {}}
          onConsigneeChange={() => {}}
          onBuyerChange={() => {}}
          onDetailsChange={() => {}}
          onItemsChange={() => {}}
          onRemarksChange={() => {}}
        />
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};


export default AdminPortal;
