import { useState, useMemo, useEffect } from "react";
import { useInvoiceOfflineCache } from "@/hooks/useInvoiceOfflineCache";
import { useNavigate } from "react-router-dom";
import { useInvoiceStorage, SavedInvoice } from "@/hooks/useInvoiceStorage";
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
  Download,
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
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
import { cn } from "@/lib/utils";


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
                setCustomRange(range || { from: undefined, to: undefined });
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

  // Select all
  const selectAll = () => {
    if (selectedIds.size === paginatedInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedInvoices.map((inv) => inv.details.invoiceNo)));
    }
  };

  // Toggle individual
  const toggleSelection = (invoiceNo: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(invoiceNo)) {
      newSet.delete(invoiceNo);
    } else {
      newSet.add(invoiceNo);
    }
    setSelectedIds(newSet);
  };

  // Handle generate
  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.warning("Please select at least one invoice.");
      return;
    }

    setIsGenerating(true);
    try {
      await generateReport(Array.from(selectedIds));
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
                        paginatedInvoices.length > 0 &&
                        selectedIds.size === paginatedInvoices.length
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
                        key={invoice.details.invoiceNo}
                        className={cn(
                          "hover:bg-muted/30 transition-colors animate-slide-up",
                          selectedIds.has(invoice.details.invoiceNo) &&
                            "bg-primary/5"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(invoice.details.invoiceNo)}
                            onCheckedChange={() =>
                              toggleSelection(invoice.details.invoiceNo)
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
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate PDF ({selectedIds.size})
              </>
            )}
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
      const dateValue: string | number | Date | undefined | null =
      invoice.details?.date ||
      (invoice as { createdAt?: unknown }).createdAt ||
      (invoice as { updatedAt?: unknown }).updatedAt ||
      invoice.details?.createdAt ||
      null;

    return parseLocalDate(dateValue);
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
  const handleDelete = (invoiceNo: string) => {
    deleteInvoice(invoiceNo);
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

  // Generate PDF Report
  const generateReport = async (invoiceIds: string[]) => {
    try {
      const filteredReportInvoices = invoices.filter((inv) =>
        invoiceIds.includes(inv.details.invoiceNo)
      );

      if (filteredReportInvoices.length === 0) {
        toast.warning("No invoices selected.");
        return;
      }

      toast.loading(`Generating ${filteredReportInvoices.length} invoices...`);

      const reportTitle =
        reportType === "all"
          ? "COMPLETE INVOICE REPORT"
          : `${reportType.replace("_", " ").toUpperCase()} REPORT`;
      const reportDate = new Date().toLocaleString();
      const totalAmount = filteredReportInvoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0
      );
      const totalItems = filteredReportInvoices.reduce(
        (sum, inv) => sum + inv.items.length,
        0
      );

      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 40px; 
              background: #f8fafc;
              color: #1a1a1a;
            }
            .report-container {
              max-width: 1100px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 24px rgba(0,0,0,0.06);
              overflow: hidden;
            }
            .cover-page {
              padding: 60px 80px;
              text-align: center;
              border-bottom: 4px solid #2563eb;
              background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
              min-height: 400px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .cover-page .logo {
              font-size: 48px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 10px;
              letter-spacing: -1px;
            }
            .cover-page .logo span { color: #2563eb; }
            .cover-page .subtitle {
              font-size: 18px;
              color: #666;
              margin-bottom: 30px;
            }
            .cover-page h1 {
              font-size: 42px;
              color: #1a1a1a;
              margin: 20px 0 10px;
              letter-spacing: 1px;
            }
            .cover-page .divider {
              width: 80px;
              height: 4px;
              background: #2563eb;
              margin: 20px auto;
              border-radius: 2px;
            }
            .cover-page .meta {
              color: #666;
              font-size: 15px;
              line-height: 1.8;
            }
            .cover-page .meta strong { color: #1a1a1a; }
            .content {
              padding: 40px 60px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
              background: #f8fafc;
              padding: 24px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item .label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
            }
            .summary-item .value {
              font-size: 20px;
              font-weight: bold;
              color: #1a1a1a;
              margin-top: 5px;
            }
            .invoice-item {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 24px;
              margin-bottom: 30px;
              page-break-inside: avoid;
              background: white;
              transition: box-shadow 0.2s;
            }
            .invoice-item:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
            .invoice-item .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .invoice-item .invoice-header h3 {
              font-size: 20px;
              color: #2563eb;
              margin: 0;
            }
            .invoice-item .invoice-header .invoice-no {
              font-weight: 700;
              color: #1a1a1a;
              font-size: 16px;
            }
            .invoice-details {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 12px;
              margin: 12px 0 20px 0;
              font-size: 14px;
              background: #fafbfc;
              padding: 16px;
              border-radius: 6px;
            }
            .invoice-details .label {
              font-weight: 600;
              color: #555;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
              font-size: 14px;
            }
            th {
              background-color: #f1f5f9;
              text-align: left;
              padding: 12px;
              border: 1px solid #e2e8f0;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              color: #475569;
            }
            td {
              padding: 10px 12px;
              border: 1px solid #e2e8f0;
            }
            .text-right {
              text-align: right;
            }
            .total-row {
              font-weight: bold;
              background-color: #f8fafc;
            }
            .total-row td {
              border-top: 2px solid #1a1a1a;
            }
            .remarks {
              margin-top: 12px;
              font-size: 14px;
              color: #666;
              padding: 12px;
              background: #fafbfc;
              border-radius: 6px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #94a3b8;
              font-size: 12px;
            }
            .footer .page-number {
              color: #64748b;
            }
            @media print {
              body { padding: 0; background: white; }
              .report-container { box-shadow: none; border-radius: 0; }
              .cover-page { min-height: 300px; }
              .invoice-item { page-break-inside: avoid; page-break-after: always; }
              .invoice-item:last-child { page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="cover-page">
              <div class="logo">Invoice<span>Hub</span></div>
              <div class="subtitle">Professional Invoice Management</div>
              <div class="divider"></div>
              <h1>${reportTitle}</h1>
              <div class="meta">
                <div><strong>Generated Date:</strong> ${reportDate}</div>
                <div><strong>Total Documents:</strong> ${filteredReportInvoices.length}</div>
                <div><strong>Report Type:</strong> ${reportType === "all" ? "Complete" : reportType.replace("_", " ").toUpperCase()}</div>
              </div>
            </div>
            <div class="content">
              <div class="summary">
                <div class="summary-item">
                  <div class="label">Total Documents</div>
                  <div class="value">${filteredReportInvoices.length}</div>
                </div>
                <div class="summary-item">
                  <div class="label">Total Amount</div>
                  <div class="value">${formatCurrency(totalAmount)}</div>
                </div>
                <div class="summary-item">
                  <div class="label">Total Items</div>
                  <div class="value">${totalItems}</div>
                </div>
                <div class="summary-item">
                  <div class="label">Average Amount</div>
                  <div class="value">${formatCurrency(totalAmount / filteredReportInvoices.length)}</div>
                </div>
              </div>
      `;

      filteredReportInvoices.forEach((invoice, index) => {
        const isGST = hasGST(invoice);
        const isQuote = isQuotation(invoice);
        const docType = isQuote
          ? "Quotation"
          : isGST
          ? "GST Invoice"
          : "Non-GST Invoice";

        htmlContent += `
          <div class="invoice-item">
            <div class="invoice-header">
              <h3>${docType}</h3>
              <span class="invoice-no">#${invoice.details.invoiceNo}</span>
            </div>
            <div class="invoice-details">
              <div><span class="label">Date:</span> ${formatDate(
                getInvoiceDate(invoice)
              )}</div>
              <div><span class="label">Customer:</span> ${escapeHtml(invoice.buyer.name)}</div>
              <div><span class="label">GSTIN:</span> ${escapeHtml(invoice.buyer.gstin) || "N/A"}</div>
              <div><span class="label">Address:</span> ${escapeHtml(invoice.buyer.address)}</div>
              <div><span class="label">Payment:</span> ${
                escapeHtml(invoice.details.modeOfPayment) || "Cash"
              }</div>
              <div><span class="label">Total:</span> ${formatCurrency(
                invoice.totalAmount
              )}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:5%">#</th>
                  <th style="width:35%">Description</th>
                  <th style="width:10%">HSN</th>
                  <th style="width:10%">Qty</th>
                  <th style="width:15%">Rate</th>
                  <th style="width:25%;text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>
        `;

        invoice.items.forEach((item) => {
          htmlContent += `
            <tr>
              <td>${item.srNo}</td>
              <td>${escapeHtml(item.description)}</td>
              <td>${escapeHtml(item.hsn) || "-"}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.rate)}</td>
              <td class="text-right">${formatCurrency(item.amount)}</td>
            </tr>
          `;
        });

        htmlContent += `
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="5" style="text-align:right;">Total Amount:</td>
                  <td class="text-right">${formatCurrency(
                    invoice.totalAmount
                  )}</td>
                </tr>
                ${
                  (invoice.totalTax || 0) > 0
                    ? `
                <tr>
                  <td colspan="5" style="text-align:right;">Total Tax:</td>
                  <td class="text-right">${formatCurrency(
                    invoice.totalTax
                  )}</td>
                </tr>
                `
                    : ""
                }
              </tfoot>
            </table>
            ${
              invoice.remarks
                ? `<div class="remarks"><strong>Remarks:</strong> ${escapeHtml(invoice.remarks)}</div>`
                : ""
            }

          </div>
        `;

        if (index < filteredReportInvoices.length - 1) {
          htmlContent += `<div style="page-break-after: always;"></div>`;
        }
      });

      htmlContent += `
              <div class="footer">
                <p>Generated by Invoice Management System</p>
                <p class="page-number">Page ${"{page}"} of ${"{total}"}</p>
              </div>
            </div>
          </div>
          <script>
            (function() {
              const pages = document.querySelectorAll('.invoice-item');
              const totalPages = pages.length + 1;
              document.querySelectorAll('.page-number').forEach((el, i) => {
                el.textContent = 'Page ' + (i + 1) + ' of ' + totalPages;
              });
            })();
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank", "width=1024,height=768,scrollbars=yes");
      if (!printWindow) {
        toast.dismiss();
        toast.error("Please allow popups to generate PDF reports.");
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        toast.dismiss();
        toast.success(`${filteredReportInvoices.length} documents exported successfully!`);

        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.dismiss();
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
                            Invoice No. {getSortIcon("invoiceNo")}
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
                            key={invoice?.details?.invoiceNo ?? "unknown"}
                            className={cn(
                              "hover:bg-muted/50 transition-colors cursor-pointer animate-slide-up",
                              index % 2 === 0 && "bg-card/50"
                            )}
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() =>
                              navigate(`/view/${invoice.details.invoiceNo}`)
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono">
                                  {invoice.details.invoiceNo}
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
                                            `/view/${invoice.details.invoiceNo}`
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
                                          `/view/${invoice.details.invoiceNo}`
                                        )
                                      }
                                    >
                                      <Eye className="h-4 w-4 mr-2" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navigate(
                                          `/edit/${invoice.details.invoiceNo}`
                                        )
                                      }
                                    >
                                      <Edit className="h-4 w-4 mr-2" /> Edit Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => window.print()}
                                    >
                                      <Printer className="h-4 w-4 mr-2" /> Print
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => window.print()}
                                    >
                                      <Download className="h-4 w-4 mr-2" /> Download
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
                                              {invoice.details.invoiceNo}
                                            </span>{" "}
                                            for {invoice.buyer.name}. This action
                                            cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              handleDelete(
                                                invoice.details.invoiceNo
                                              )
                                            }
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete Invoice
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
    </div>
  );
};

export default AdminPortal;