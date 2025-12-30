import { useFinance } from "@/contexts/FinanceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FixedBillsList } from "./FixedBillsList";
import { Settings2, FastForward, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PotentialFixedBill, generateBillId } from "@/types/finance";

interface FixedBillSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "current" | "future";
  currentDate: Date;
}

export function FixedBillSelectorModal({ open, onOpenChange, mode, currentDate }: FixedBillSelectorModalProps) {
  const { 
    getPotentialFixedBillsForMonth, 
    getFutureFixedBills, 
    getBillsForMonth, 
    setBillsTracker 
  } = useFinance();

  const localBills = getBillsForMonth(currentDate);
  const potentialFixedBills = mode === "current" 
    ? getPotentialFixedBillsForMonth(currentDate, localBills)
    : getFutureFixedBills(currentDate, localBills);

  const onToggleFixedBill = (potential: PotentialFixedBill, isChecked: boolean) => {
    if (isChecked) {
      setBillsTracker(prev => [
        ...prev,
        {
          id: generateBillId(),
          type: 'tracker',
          description: potential.description,
          dueDate: potential.dueDate,
          expectedAmount: potential.expectedAmount,
          isPaid: potential.isPaid,
          sourceType: potential.sourceType,
          sourceRef: potential.sourceRef,
          parcelaNumber: potential.parcelaNumber,
          isExcluded: false,
        }
      ]);
    } else {
      setBillsTracker(prev => prev.filter(b => 
        !(b.sourceType === potential.sourceType && 
          b.sourceRef === potential.sourceRef && 
          b.parcelaNumber === potential.parcelaNumber)
      ));
    }
  };

  const isAdvance = mode === "future";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[75vw] p-0 overflow-hidden border-border shadow-xl rounded-3xl">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-2xl",
              isAdvance ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
            )}>
              {isAdvance ? <FastForward className="w-6 h-6" /> : <Settings2 className="w-6 h-6" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {isAdvance ? "Adiantar Parcelas" : "Gerenciar Contas Fixas"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                {isAdvance 
                  ? "Selecione parcelas de meses futuros para pagar agora" 
                  : `Selecione quais parcelas automáticas devem aparecer em ${format(currentDate, 'MMMM', { locale: ptBR })}`
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[70vh] overflow-y-auto bg-background">
          {potentialFixedBills.length > 0 ? (
            <div className="space-y-6">
               <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/50">
                 <AlertCircle className="w-4 h-4 text-primary" />
                 <span>As parcelas selecionadas serão adicionadas à sua lista de controle mensal.</span>
               </div>
               <FixedBillsList 
                  bills={potentialFixedBills} 
                  onToggleFixedBill={onToggleFixedBill}
                  mode={mode}
               />
            </div>
          ) : (
            <div className="py-16 text-center space-y-4">
              <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground/80">Tudo certo!</p>
                <p className="text-sm text-muted-foreground">Nenhuma parcela pendente encontrada para este critério.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}