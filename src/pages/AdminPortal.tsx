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

type SortField = "date" | "amount" | "invoiceNo" | "customer";
type SortDirection = "asc" | "desc";
type FilterPeriod = "all" | "today" | "week" | "month" | "quarter" | "year";
type FilterType = "all" | "quotation" | "with_gst" | "without_gst";

const AdminPortal = () => {
  const navigate = useNavigate();
  const { invoices, deleteInvoice, apiState } = useInvoiceStorage();

  useInvoiceOfflineCache({
    setInvoices: undefined,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");

  // Extract unique customers for filter
  const uniqueCustomers = useMemo(() => {
    const customers = invoices.map((inv) => inv.buyer.name);
    return ["all", ...new Set(customers)];
  }, [invoices]);

  // Helper functions
  const hasGST = (invoice: SavedInvoice) => {
    return invoice.items.some(item => 
      (item.sgstRate && item.sgstRate > 0) || 
      (item.cgstRate && item.cgstRate > 0) || 
      (item.igstRate && item.igstRate > 0)
    );
  };

  const isQuotation = (invoice: SavedInvoice) => {
    return invoice.details.invoiceTitle?.toLowerCase().includes("quotation") || 
           !!invoice.details.quotationNo;
  };

  // Get date from invoice with proper fallback
  const getInvoiceDate = (invoice: SavedInvoice): Date => {
    let dateValue = null;
    
    if (invoice.details?.date) {
      dateValue = invoice.details.date;
    } else if ((invoice as any).createdAt) {
      dateValue = (invoice as any).createdAt;
    } else if ((invoice as any).updatedAt) {
      dateValue = (invoice as any).updatedAt;
    } else if (invoice.details?.createdAt) {
      dateValue = invoice.details.createdAt;
    }
    
    if (!dateValue) {
      return new Date();
    }
    
    let parsedDate: Date;
    if (typeof dateValue === 'string') {
      parsedDate = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      parsedDate = dateValue;
    } else if (typeof dateValue === 'number') {
      parsedDate = new Date(dateValue);
    } else {
      parsedDate = new Date();
    }
    
    if (isNaN(parsedDate.getTime())) {
      return new Date();
    }
    
    return parsedDate;
  };

  // Debug - Log all dates
  useEffect(() => {
    console.log('📅 Total Invoices:', invoices.length);
    invoices.forEach((inv, index) => {
      const date = getInvoiceDate(inv);
      console.log(`📅 Invoice ${index + 1}: ${inv.details.invoiceNo} - Date: ${date.toISOString()} (${formatDate(date)})`);
    });
  }, [invoices]);

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    console.log('🔍 Filtering started. Total invoices:', result.length);

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
      console.log('🔍 After search filter:', result.length);
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
      console.log('🔍 After type filter:', result.length);
    }

    // Apply time period filter
    if (filterPeriod !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log('📅 Filter Period:', filterPeriod);
      console.log('📅 Today:', today.toISOString());
      
      result = result.filter((inv) => {
        const invDate = getInvoiceDate(inv);
        const invDateOnly = new Date(invDate.getFullYear(), invDate.getMonth(), invDate.getDate());
        
        console.log(`📅 Invoice: ${inv.details.invoiceNo}, Date: ${invDateOnly.toISOString()}`);
        
        let include = false;
        switch (filterPeriod) {
          case "today": {
            include = invDateOnly.getTime() === today.getTime();
            break;
          }
          case "week": {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            include = invDateOnly >= weekAgo;
            break;
          }
          case "month": {
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            include = invDateOnly >= monthAgo;
            break;
          }
          case "quarter": {
            const quarterAgo = new Date(today);
            quarterAgo.setMonth(quarterAgo.getMonth() - 3);
            include = invDateOnly >= quarterAgo;
            break;
          }
          case "year": {
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            include = invDateOnly >= yearAgo;
            break;
          }
          default:
            include = true;
        }
        return include;
      });
      console.log('🔍 After time filter:', result.length);
    }

    // Apply customer filter
    if (selectedCustomer !== "all") {
      result = result.filter((inv) => inv.buyer.name === selectedCustomer);
      console.log('🔍 After customer filter:', result.length);
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

    console.log('✅ Final filtered count:', result.length);
    return result;
  }, [invoices, searchQuery, sortField, sortDirection, filterPeriod, filterType, selectedCustomer]);

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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3" />;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterPeriod("all");
    setFilterType("all");
    setSelectedCustomer("all");
  };

  // Generate PDF Report
  const generateReport = async (reportType: 'quotation' | 'with_gst' | 'without_gst' | 'all') => {
    try {
      let filteredReportInvoices: SavedInvoice[] = [];
      
      switch (reportType) {
        case 'all':
          filteredReportInvoices = invoices;
          break;
        case 'quotation':
          filteredReportInvoices = invoices.filter(inv => isQuotation(inv));
          break;
        case 'with_gst':
          filteredReportInvoices = invoices.filter(inv => !isQuotation(inv) && hasGST(inv));
          break;
        case 'without_gst':
          filteredReportInvoices = invoices.filter(inv => !isQuotation(inv) && !hasGST(inv));
          break;
      }

      if (filteredReportInvoices.length === 0) {
        toast.warning(`No ${reportType.replace('_', ' ')} invoices found to generate report.`);
        return;
      }

      toast.loading(`Generating ${filteredReportInvoices.length} ${reportType.replace('_', ' ')} report...`);

      const reportTitle = reportType === 'all' ? 'COMPLETE INVOICE REPORT' : `${reportType.replace('_', ' ').toUpperCase()} REPORT`;
      const reportDate = new Date().toLocaleString();
      const totalAmount = filteredReportInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalItems = filteredReportInvoices.reduce((sum, inv) => sum + inv.items.length, 0);

      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              background: white;
              color: #1a1a1a;
            }
            .report-container {
              max-width: 1100px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 28px;
              color: #1a1a1a;
              margin: 0;
            }
            .header .subtitle {
              color: #666;
              margin-top: 8px;
              font-size: 14px;
            }
            .header .meta {
              color: #666;
              margin-top: 5px;
              font-size: 13px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
              background: #f8fafc;
              padding: 20px;
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
            }
            .summary-item .value {
              font-size: 20px;
              font-weight: bold;
              color: #1a1a1a;
              margin-top: 5px;
            }
            .invoice-item {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 20px;
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .invoice-item .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }
            .invoice-item .invoice-header h3 {
              font-size: 18px;
              color: #2563eb;
              margin: 0;
            }
            .invoice-item .invoice-header .invoice-no {
              font-weight: bold;
              color: #1a1a1a;
            }
            .invoice-details {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px;
              margin: 10px 0 15px 0;
              font-size: 14px;
            }
            .invoice-details .label {
              font-weight: 600;
              color: #555;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 14px;
            }
            th {
              background-color: #f1f5f9;
              text-align: left;
              padding: 10px;
              border: 1px solid #e2e8f0;
              font-weight: 600;
            }
            td {
              padding: 8px 10px;
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
              margin-top: 10px;
              font-size: 13px;
              color: #666;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              .invoice-item { page-break-inside: avoid; page-break-after: always; }
              .invoice-item:last-child { page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <h1>${reportTitle}</h1>
              <div class="subtitle">Invoice Management System</div>
              <div class="meta">Generated on: ${reportDate}</div>
              <div class="meta">Total Documents: ${filteredReportInvoices.length}</div>
            </div>

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
        const docType = isQuote ? 'Quotation' : (isGST ? 'GST Invoice' : 'Non-GST Invoice');

        htmlContent += `
          <div class="invoice-item">
            <div class="invoice-header">
              <h3>${docType}</h3>
              <span class="invoice-no">#${invoice.details.invoiceNo}</span>
            </div>
            <div class="invoice-details">
              <div><span class="label">Date:</span> ${formatDate(getInvoiceDate(invoice))}</div>
              <div><span class="label">Customer:</span> ${invoice.buyer.name}</div>
              <div><span class="label">GSTIN:</span> ${invoice.buyer.gstin || 'N/A'}</div>
              <div><span class="label">Address:</span> ${invoice.buyer.address}</div>
              <div><span class="label">Payment:</span> ${invoice.details.modeOfPayment || 'Cash'}</div>
              <div><span class="label">Total:</span> ${formatCurrency(invoice.totalAmount)}</div>
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
              <td>${item.description}</td>
              <td>${item.hsn || '-'}</td>
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
                  <td class="text-right">${formatCurrency(invoice.totalAmount)}</td>
                </tr>
                ${invoice.totalTax > 0 ? `
                <tr>
                  <td colspan="5" style="text-align:right;">Total Tax:</td>
                  <td class="text-right">${formatCurrency(invoice.totalTax)}</td>
                </tr>
                ` : ''}
              </tfoot>
            </table>
            ${invoice.remarks ? `<div class="remarks"><strong>Remarks:</strong> ${invoice.remarks}</div>` : ''}
          </div>
        `;

        if (index < filteredReportInvoices.length - 1) {
          htmlContent += `<div style="page-break-after: always;"></div>`;
        }
      });

      htmlContent += `
            <div class="footer">
              <p>This report is generated automatically by Invoice Management System</p>
              <p>© ${new Date().getFullYear()} - All rights reserved</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=1024,height=768,scrollbars=yes');
      if (!printWindow) {
        toast.dismiss();
        toast.error('Please allow popups to generate PDF reports.');
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
      console.error('Error generating report:', error);
      toast.dismiss();
      toast.error('Failed to generate report. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
                <DropdownMenuItem onClick={() => generateReport('all')} className="flex items-center gap-2 py-2">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-md flex items-center justify-center">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Complete Report</span>
                    <span className="text-xs text-muted-foreground">All invoices & quotations</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => generateReport('quotation')} className="flex items-center gap-2 py-2">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-md flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Quotation Report</span>
                    <span className="text-xs text-muted-foreground">All quotations</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => generateReport('with_gst')} className="flex items-center gap-2 py-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">With GST Report</span>
                    <span className="text-xs text-muted-foreground">All GST invoices</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => generateReport('without_gst')} className="flex items-center gap-2 py-2">
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
                    <DropdownMenuItem onClick={() => navigate("/create?type=invoice&gst=1")} className="flex items-center gap-2 py-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                        <FileCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">With GST</span>
                        <span className="text-xs text-muted-foreground">Tax invoice with GST</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/create?type=invoice&gst=0")} className="flex items-center gap-2 py-2">
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
                <DropdownMenuItem onClick={() => navigate("/create?type=quotation")} className="flex items-center gap-2 py-2">
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-card to-card/95 border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.thisMonthCount} this month</p>
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
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats.thisMonthRevenue)} this month</p>
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
                  <p className="text-xs text-muted-foreground mt-1">{((stats.uniqueCustomers / stats.total) * 100 || 0).toFixed(1)}% repeat</p>
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
                  <p className="text-xs text-muted-foreground mt-1">Total: {stats.total} invoices</p>
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

                  <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
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

                  <Button variant="outline" onClick={clearAllFilters} className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              </div>
              {/* Active Filters Display */}
              {(searchQuery || filterPeriod !== "all" || filterType !== "all" || selectedCustomer !== "all") && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground mr-2">Active Filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Search: {searchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                    </Badge>
                  )}
                  {filterPeriod !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Period: {filterPeriod.replace('_', ' ')}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterPeriod("all")} />
                    </Badge>
                  )}
                  {filterType !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Type: {filterType.replace('_', ' ')}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterType("all")} />
                    </Badge>
                  )}
                  {selectedCustomer !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Customer: {selectedCustomer}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCustomer("all")} />
                    </Badge>
                  )}
                </div>
              )}
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
                  {filterPeriod !== "all" && ` in ${filterPeriod.replace('_', ' ')}`}
                  {filterType !== "all" && ` (${filterType.replace('_', ' ')})`}
                  {selectedCustomer !== "all" && ` for ${selectedCustomer}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Button variant="outline" size="sm" onClick={() => handleSort("date")} className="flex items-center gap-1">
                  Date {getSortIcon("date")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSort("amount")} className="flex items-center gap-1">
                  Amount {getSortIcon("amount")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSort("customer")} className="flex items-center gap-1">
                  Customer {getSortIcon("customer")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || filterPeriod !== "all" || filterType !== "all" || selectedCustomer !== "all" 
                    ? "No matching invoices found" 
                    : "No invoices yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery || filterPeriod !== "all" || filterType !== "all" || selectedCustomer !== "all"
                    ? "Try adjusting your search terms or filters to find what you're looking for."
                    : "Create your first invoice to start managing your billing and payments."}
                </p>
                {!searchQuery && filterPeriod === "all" && filterType === "all" && selectedCustomer === "all" && (
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
                      <TableHead className="w-[15%]">
                        <Button variant="ghost" size="sm" onClick={() => handleSort("invoiceNo")} className="flex items-center gap-1 -ml-3">
                          Invoice No. {getSortIcon("invoiceNo")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[12%]">
                        <Button variant="ghost" size="sm" onClick={() => handleSort("date")} className="flex items-center gap-1 -ml-3">
                          Date {getSortIcon("date")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[25%]">
                        <Button variant="ghost" size="sm" onClick={() => handleSort("customer")} className="flex items-center gap-1 -ml-3">
                          Customer {getSortIcon("customer")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[10%]">Type</TableHead>
                      <TableHead className="w-[15%] text-right">Amount</TableHead>
                      <TableHead className="w-[8%] text-center">Status</TableHead>
                      <TableHead className="w-[15%] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => {
                      const invDate = getInvoiceDate(invoice);
                      const isRecent = !isNaN(invDate.getTime()) && invDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                      const isGST = hasGST(invoice);
                      const isQuote = isQuotation(invoice);
                      const docType = isQuote ? 'Quotation' : (isGST ? 'GST Invoice' : 'Non-GST');

                      return (
                        <TableRow 
                          key={invoice?.details?.invoiceNo ?? "unknown"} 
                          className="hover:bg-muted/30 transition-colors cursor-pointer" 
                          onClick={() => navigate(`/view/${invoice.details.invoiceNo}`)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono">{invoice.details.invoiceNo}</span>
                              {isRecent && <Badge variant="outline" className="text-xs">New</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatDate(invDate)}</span>
                              <span className="text-xs text-muted-foreground">{invoice.details.modeOfPayment || "Cash"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{invoice.buyer.name}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{invoice.buyer.address}</span>
                              {invoice.buyer.gstin && <span className="text-xs text-muted-foreground font-mono">GSTIN: {invoice.buyer.gstin}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isQuote ? "secondary" : (isGST ? "default" : "outline")} className="text-xs">
                              {docType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-lg">{formatCurrency(invoice.totalAmount)}</span>
                              <span className="text-xs text-muted-foreground">{invoice.items.length} items</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>
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
                                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => navigate(`/view/${invoice.details.invoiceNo}`)}>
                                    <Eye className="h-4 w-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/edit/${invoice.details.invoiceNo}`)}>
                                    <FileText className="h-4 w-4 mr-2" /> Edit Invoice
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.print()}>
                                    <Download className="h-4 w-4 mr-2" /> Print/Download
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
                                        <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete invoice <span className="font-bold">{invoice.details.invoiceNo}</span> for {invoice.buyer.name}. This action cannot be undone.
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