import { InvoiceItem } from "@/types/invoice";
import { calculateItemTotals, CalculatedItem, generateProductId } from "@/utils/calculations";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface ItemsTableProps {
  items: InvoiceItem[];
  onItemsChange: (items: InvoiceItem[]) => void;
  editable?: boolean;
}

export const ItemsTable = ({ items, onItemsChange, editable = true }: ItemsTableProps) => {
  const calculatedItems: CalculatedItem[] = items.map(calculateItemTotals);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      productId: generateProductId(),
      description: "",
      hsn: "",
      rate: 0,
      qty: 1,
      gstPercent: 18,
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const inputClass = "invoice-cell-input text-center";

  return (
    <div className="overflow-x-auto">
      <table className="invoice-table">
        <thead>
          <tr>
            <th className="w-10 text-center">Sr.</th>
            <th className="w-20 text-center">Product ID</th>
            <th className="min-w-[200px]">Product Description</th>
            <th className="w-24 text-center">HSN</th>
            <th className="w-24 text-right">Rate</th>
            <th className="w-16 text-center">Qty</th>
            <th className="w-28 text-right">Taxable Value</th>
            <th className="w-16 text-center">GST %</th>
            <th className="w-28 text-right">Amount</th>
            {editable && <th className="w-12 text-center no-print">Action</th>}
          </tr>
        </thead>
        <tbody>
          {calculatedItems.map((item, index) => (
            <tr key={item.id}>
              <td className="text-center font-medium">{index + 1}</td>
              <td>
                <Input
                  value={item.productId}
                  onChange={(e) => updateItem(item.id, "productId", e.target.value)}
                  className={inputClass}
                  readOnly={!editable}
                />
              </td>
              <td>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  className="invoice-cell-input"
                  placeholder="Enter product description"
                  readOnly={!editable}
                />
              </td>
              <td>
                <Input
                  value={item.hsn}
                  onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                  className={inputClass}
                  placeholder="HSN Code"
                  readOnly={!editable}
                />
              </td>
              <td>
                <Input
                  type="number"
                  value={item.rate || ""}
                  onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                  className={`${inputClass} text-right`}
                  readOnly={!editable}
                />
              </td>
              <td>
                <Input
                  type="number"
                  value={item.qty || ""}
                  onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 0)}
                  className={inputClass}
                  min={1}
                  readOnly={!editable}
                />
              </td>
              <td className="text-right font-medium">
                {formatCurrency(item.taxableValue)}
              </td>
              <td>
                <Input
                  type="number"
                  value={item.gstPercent || ""}
                  onChange={(e) => updateItem(item.id, "gstPercent", parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  readOnly={!editable}
                />
              </td>
              <td className="text-right font-bold">
                {formatCurrency(item.amount)}
              </td>
              {editable && (
                <td className="text-center no-print">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <div className="p-3 border-t border-border no-print">
          <Button
            onClick={addItem}
            variant="outline"
            size="sm"
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      )}
    </div>
  );
};
