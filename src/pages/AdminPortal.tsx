import { useState, useMemo } from "react";
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
import {
  Plus,
  Search,
  FileText,
  Eye,
  Trash2,
  IndianRupee,
  Users,
  TrendingUp,
  Download,
  Filter,
  ArrowUpDown,
  Calendar,
  User,
  CreditCard,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortField = "date" | "amount" | "invoiceNo" | "customer";
type SortDirection = "asc" | "desc";
type FilterPeriod = "all" | "today" | "week" | "month" | "quarter" | "year";

const AdminPortal = () => {
  const navigate = useNavigate();
  const { invoices, deleteInvoice } = useInvoiceStorage();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");

  // Extract unique customers for filter
  const uniqueCustomers = useMemo(() => {
    const customers = invoices.map((inv) => inv.buyer.name);
    return ["all", ...new Set(customers)];
  }, [invoices]);

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

    // Apply time period filter
    if (filterPeriod !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      result = result.filter((inv) => {
        const invDate = new Date(inv.details.date);
        
        switch (filterPeriod) {
          case "today":
            return invDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return invDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return invDate >= monthAgo;
          case "quarter":
            const quarterAgo = new Date(today);
            quarterAgo.setMonth(quarterAgo.getMonth() - 3);
            return invDate >= quarterAgo;
          case "year":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return invDate >= yearAgo;
          default:
            return true;
        }
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
        case "date":
          aValue = new Date(a.details.date).getTime();
          bValue = new Date(b.details.date).getTime();
          break;
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
  }, [invoices, searchQuery, sortField, sortDirection, filterPeriod, selectedCustomer]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const uniqueCustomers = new Set(invoices.map((inv) => inv.buyer.name)).size;
    
    const now = new Date();
    const thisMonthRevenue = invoices
      .filter((inv) => {
        const invDate = new Date(inv.details.date);
        return (
          invDate.getMonth() === now.getMonth() &&
          invDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const thisMonthCount = invoices.filter((inv) => {
      const invDate = new Date(inv.details.date);
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
      total: invoices.length 
    };
  }, [invoices]);

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

  const handleExport = () => {
    // Implement export functionality
    console.log("Exporting invoices...");
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3" />;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Invoice Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage and track all your invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => navigate("/create")} className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-card to-card/95 border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.thisMonthCount} this month
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/95 border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(stats.thisMonthRevenue)} this month
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                  <IndianRupee className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/95 border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Customers</p>
                  <p className="text-2xl font-bold">{stats.uniqueCustomers}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((stats.uniqueCustomers / stats.total) * 100 || 0).toFixed(1)}% repeat
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/95 border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg. Invoice</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.averageInvoice)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {stats.total} invoices
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
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
                <Select value={filterPeriod} onValueChange={(value: FilterPeriod) => setFilterPeriod(value)}>
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
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
                  onClick={() => {
                    setSearchQuery("");
                    setFilterPeriod("all");
                    setSelectedCustomer("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle>Invoice History</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredInvoices.length} invoices found
                  {searchQuery && ` for "${searchQuery}"`}
                  {filterPeriod !== "all" && ` in ${filterPeriod}`}
                  {selectedCustomer !== "all" && ` for ${selectedCustomer}`}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || filterPeriod !== "all" || selectedCustomer !== "all" 
                    ? "No matching invoices found" 
                    : "No invoices yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery || filterPeriod !== "all" || selectedCustomer !== "all"
                    ? "Try adjusting your search terms or filters to find what you're looking for."
                    : "Create your first invoice to start managing your billing and payments."}
                </p>
                {!searchQuery && !(filterPeriod !== "all") && !(selectedCustomer !== "all") && (
                  <Button onClick={() => navigate("/create")} size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Invoice
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("invoiceNo")}
                          className="flex items-center gap-1 -ml-3"
                        >
                          Invoice No.
                          {getSortIcon("invoiceNo")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("date")}
                          className="flex items-center gap-1 -ml-3"
                        >
                          Date
                          {getSortIcon("date")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("customer")}
                          className="flex items-center gap-1 -ml-3"
                        >
                          Customer
                          {getSortIcon("customer")}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {filteredInvoices.map((invoice) => {
                      const isRecent = new Date(invoice.details.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                      
                      return (
                        <TableRow 
                          key={invoice.details.invoiceNo}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/view/${invoice.details.invoiceNo}`)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono">{invoice.details.invoiceNo}</span>
                              {isRecent && (
                                <Badge variant="outline" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatDate(new Date(invoice.details.date))}</span>
                              <span className="text-xs text-muted-foreground">
                                {invoice.details.modeOfPayment || "Cash"}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{invoice.buyer.name}</span>
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
                              Paid
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/view/${invoice.details.invoiceNo}`)}
                                title="View Invoice"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => navigate(`/view/${invoice.details.invoiceNo}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/edit/${invoice.details.invoiceNo}`)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Edit Invoice
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.print()}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Print/Download
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive"
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete invoice{" "}
                                          <span className="font-bold">{invoice.details.invoiceNo}</span> 
                                          for {invoice.buyer.name}. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(invoice.details.invoiceNo)}
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminPortal;