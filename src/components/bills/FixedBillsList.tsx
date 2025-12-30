import { PotentialFixedBill, formatCurrency } from "@/types/finance";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FixedBillsListProps {
  bills: PotentialFixedBill[];
  onToggle: (bill: PotentialFixedBill, isChecked: boolean) => void;
  emptyMessage?: string;
}

export function FixedBillsList({ bills, onToggle, emptyMessage }: FixedBillsListProps) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
        <p>{emptyMessage || "Nenhuma conta encontrada."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bills.map((bill) => (
        <div 
          key={bill.key}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
            bill.isIncluded 
              ? "bg-primary/5 border-primary/20" 
              : "bg-background border-border hover:border-primary/30"
          )}
        >
          <div className="flex items-center gap-4">
            <Checkbox 
              id={bill.key}
              checked={bill.isIncluded}
              onCheckedChange={(checked) => onToggle(bill, checked as boolean)}
              className="w-5 h-5"
            />
            <div className="space-y-1">
              <label htmlFor={bill.key} className="text-sm font-semibold cursor-pointer">
                {bill.description}
              </label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-muted px-2 py-0.5 rounded">Vencimento: {bill.dueDate}</span>
                {bill.isPaid && <span className="text-success font-medium">● Pago</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary">{formatCurrency(bill.expectedAmount)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}