import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Calendar, DollarSign, Info, Shield, Building2, ShoppingCart, Check, X } from "lucide-react";
import { PotentialFixedBill, formatCurrency, BillSourceType } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FixedBillSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'current' | 'future';
  currentDate: Date;
  potentialFixedBills: PotentialFixedBill[];
  onToggleFixedBill: (bill: PotentialFixedBill, isChecked: boolean) => void;
}

const SOURCE_CONFIG: Record<BillSourceType, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', label: 'Empréstimo', bgColor: 'bg-orange-500/10' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', label: 'Seguro', bgColor: 'bg-blue-500/10' },
  purchase_installment: { icon: ShoppingCart, color: 'text-pink-500', label: 'Parcela', bgColor: 'bg-pink-500/10' },
  fixed_expense: { icon: Settings, color: 'text-purple-500', label: 'Fixa', bgColor: 'bg-purple-500/10' },
  variable_expense: { icon: DollarSign, color: 'text-warning', label: 'Variável', bgColor: 'bg-warning/10' },
  ad_hoc: { icon: Info, color: 'text-primary', label: 'Avulsa', bgColor: 'bg-primary/10' },
};

export function FixedBillSelectorModal({
  open,
  onOpenChange,
  mode,
  currentDate,
  potentialFixedBills,
  onToggleFixedBill,
}: FixedBillSelectorModalProps) {
  
  const isFuture = mode === 'future';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Cabeçalho padronizado */}
        <DialogHeader className={cn("px-6 pt-6 pb-4", isFuture ? "bg-accent/10" : "bg-primary/10")}>
          <div className="flex items-start gap-3">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", isFuture ? "bg-accent/20" : "bg-primary/20")}>
              {isFuture ? <Plus className="w-6 h-6 text-accent" /> : <Settings className="w-6 h-6 text-primary" />}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {isFuture ? "Adiantar Parcelas Futuras" : "Gerenciar Contas Fixas"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {isFuture 
                  ? "Selecione parcelas de meses futuros para pagar e baixar hoje" 
                  : `Selecione quais parcelas de Empréstimos e Seguros devem aparecer em ${format(currentDate, 'MMMM', { locale: ptBR })}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {potentialFixedBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Nenhuma conta encontrada</p>
                <p className="text-sm text-muted-foreground">
                  Não há parcelas {isFuture ? "futuras" : "pendentes"} para este período.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {potentialFixedBills.map((bill) => {
                const config = SOURCE_CONFIG[bill.sourceType];
                const Icon = config.icon;
                
                return (
                  <div 
                    key={bill.key}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:bg-muted/30",
                      bill.isIncluded ? "border-primary/20 bg-primary/5" : "border-transparent bg-muted/20"
                    )}
                  >
                    <Checkbox
                      id={bill.key}
                      checked={bill.isIncluded}
                      onCheckedChange={(checked) => onToggleFixedBill(bill, checked as boolean)}
                      className="w-5 h-5"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("gap-1 text-[10px] px-1.5 py-0 uppercase font-bold", config.color, config.bgColor)}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Vence em {format(parseDateLocal(bill.dueDate), 'dd/MM/yy')}
                        </span>
                      </div>
                      <label 
                        htmlFor={bill.key}
                        className="text-sm font-semibold text-foreground cursor-pointer block truncate"
                      >
                        {bill.description}
                      </label>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-foreground">
                        {formatCurrency(bill.expectedAmount)}
                      </div>
                      {bill.isPaid && (
                        <Badge variant="outline" className="text-[10px] text-success border-success bg-success/5">
                          PAGO
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 bg-muted/30 border-t flex justify-end">
          <Button 
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-8"
          >
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}