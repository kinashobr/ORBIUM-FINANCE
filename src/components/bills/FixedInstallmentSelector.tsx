import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Shield, CheckCircle2, Clock, ListChecks } from "lucide-react";
import { PotentialFixedBill, BillTracker, formatCurrency } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";

interface FixedInstallmentSelectorProps {
  potentialBills: PotentialFixedBill[];
  localBills: BillTracker[];
  onToggleInstallment: (potentialBill: PotentialFixedBill, isChecked: boolean) => void;
  referenceDate: Date;
  onOpenAllInstallments: () => void; // NEW PROP
}

export function FixedInstallmentSelector({
  potentialBills,
  localBills,
  onToggleInstallment,
  referenceDate,
  onOpenAllInstallments,
}: FixedInstallmentSelectorProps) {
  
  // Filter bills for the current month that are not paid and not excluded
  const currentMonthPendingFixedBills = useMemo(() => {
    return potentialBills.filter(bill => !bill.isPaid);
  }, [potentialBills]);
  
  const totalFixed = currentMonthPendingFixedBills.reduce((acc, b) => b.isIncluded ? acc + b.expectedAmount : acc, 0);
  const includedCount = currentMonthPendingFixedBills.filter(b => b.isIncluded).length;

  return (
    <Card className="glass-card p-3 space-y-3">
      <CardHeader className="p-0 pb-2 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-1">
          <ListChecks className="w-4 h-4 text-primary" />
          Parcelas Fixas do Mês ({includedCount}/{currentMonthPendingFixedBills.length})
        </CardTitle>
        <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs px-2 gap-1"
            onClick={onOpenAllInstallments} // NEW ACTION
        >
            <ListChecks className="w-3 h-3" />
            Todas Parcelas
        </Button>
      </CardHeader>
      
      <CardContent className="p-0 space-y-2">
        {currentMonthPendingFixedBills.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Nenhuma parcela fixa (Empréstimo/Seguro) vence neste mês.
          </p>
        ) : (
          <div className="space-y-2">
            {currentMonthPendingFixedBills.map((bill) => {
              const Icon = bill.sourceType === 'loan_installment' ? DollarSign : Shield;
              
              return (
                <div key={bill.key} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={bill.key}
                      checked={bill.isIncluded}
                      onCheckedChange={(checked) => onToggleInstallment(bill, checked as boolean)}
                      className={cn("w-4 h-4", bill.isIncluded && "border-primary data-[state=checked]:bg-primary")}
                    />
                    <Label htmlFor={bill.key} className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      {bill.description}
                    </Label>
                  </div>
                  <div className="text-xs text-right">
                    <span className="font-semibold">{formatCurrency(bill.expectedAmount)}</span>
                    <span className="text-muted-foreground ml-1">({format(parseDateLocal(bill.dueDate), 'dd/MM')})</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <Separator />
        
        <div className="flex justify-between items-center pt-1">
          <span className="text-sm font-medium text-muted-foreground">Total Incluído:</span>
          <span className="text-sm font-bold text-destructive">{formatCurrency(totalFixed)}</span>
        </div>
      </CardContent>
    </Card>
  );
}