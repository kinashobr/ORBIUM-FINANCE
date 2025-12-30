import React from "react";
import { Building2, Shield, Repeat, DollarSign, Info, ShoppingCart, Plus, Trash2 } from "lucide-react";
import { BillSourceType } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FixedBillsListProps {
  potentialBills: any[];
  onToggleInclusion: (bill: any) => void;
}

const SOURCE_CONFIG: Record<BillSourceType, { icon: React.ElementType; color: string; label: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', label: 'Empréstimo' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', label: 'Seguro' },
  fixed_expense: { icon: Repeat, color: 'text-purple-500', label: 'Fixa' },
  variable_expense: { icon: DollarSign, color: 'text-warning', label: 'Variável' },
  ad_hoc: { icon: Info, color: 'text-primary', label: 'Avulsa' },
  purchase_installment: { icon: ShoppingCart, color: 'text-pink-500', label: 'Parcela' },
};

export function FixedBillsList({ potentialBills, onToggleInclusion }: FixedBillsListProps) {
  return (
    <div className="space-y-2">
      {potentialBills.map((bill) => {
        const config = SOURCE_CONFIG[bill.sourceType as BillSourceType];
        const Icon = config.icon;

        return (
          <div 
            key={bill.key}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              bill.isIncluded ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-transparent opacity-60"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-full bg-background border", config.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium text-sm">{bill.description}</div>
                <div className="text-xs text-muted-foreground">Vence em: {bill.dueDate}</div>
              </div>
            </div>
            
            <Button
              variant={bill.isIncluded ? "ghost" : "outline"}
              size="sm"
              onClick={() => onToggleInclusion(bill)}
              className={cn("h-8 gap-1", bill.isIncluded ? "text-destructive hover:text-destructive" : "text-primary")}
            >
              {bill.isIncluded ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Incluir
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}