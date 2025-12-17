import { useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, X, DollarSign, Shield, ListChecks } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { PotentialFixedBill, formatCurrency, BillTracker } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface AllInstallmentsReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceDate: Date;
  localBills: BillTracker[];
  onToggleInstallment: (potentialBill: PotentialFixedBill, isChecked: boolean) => void;
}

export function AllInstallmentsReviewModal({
  open,
  onOpenChange,
  referenceDate,
  localBills,
  onToggleInstallment,
}: AllInstallmentsReviewModalProps) {
  const { getPotentialFixedBillsForMonth, getFutureFixedBills } = useFinance();

  // Combina as parcelas potenciais do mês atual e as futuras
  const allFixedInstallments = useMemo(() => {
    const currentMonthBills = getPotentialFixedBillsForMonth(referenceDate, localBills);
    const futureBills = getFutureFixedBills(referenceDate, localBills);
    
    // Usa um Map para garantir a unicidade baseada na chave
    const combinedMap = new Map<string, PotentialFixedBill>();
    
    [...currentMonthBills, ...futureBills].forEach(bill => {
        combinedMap.set(bill.key, bill);
    });
    
    // Ordena pela data de vencimento
    return Array.from(combinedMap.values()).sort((a, b) => 
        parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime()
    );
  }, [referenceDate, localBills, getPotentialFixedBillsForMonth, getFutureFixedBills]);

  const handleToggle = useCallback((bill: PotentialFixedBill) => {
    if (bill.isPaid) {
        toast.info("Parcelas pagas não podem ser removidas ou adicionadas aqui. Use a lista principal para estornar.");
        return;
    }
    // Toggle inclusion status
    onToggleInstallment(bill, !bill.isIncluded);
  }, [onToggleInstallment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Revisão de Parcelas Fixas (Empréstimos e Seguros)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[120px]">Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right w-[150px]">Valor</TableHead>
                <TableHead className="w-[100px] text-center">Status</TableHead>
                <TableHead className="w-[100px] text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allFixedInstallments.map((bill) => {
                const dueDate = parseDateLocal(bill.dueDate);
                const isFuture = dueDate > referenceDate;
                const Icon = bill.sourceType === 'loan_installment' ? DollarSign : Shield;
                
                return (
                  <TableRow 
                    key={bill.key} 
                    className={cn(
                      bill.isPaid && "bg-success/5 text-success",
                      bill.isIncluded && !bill.isPaid && "bg-primary/5",
                      isFuture && !bill.isPaid && "text-muted-foreground/80"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {bill.sourceType === 'loan_installment' ? 'Empréstimo' : 'Seguro'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(dueDate, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{bill.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(bill.expectedAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                        {bill.isPaid ? (
                          <span className="text-success font-medium flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Paga
                          </span>
                        ) : (
                          <span className={cn("font-medium", isFuture ? "text-muted-foreground" : "text-warning")}>
                            <Clock className="w-4 h-4 inline mr-1" /> {isFuture ? 'Futura' : 'Pendente'}
                          </span>
                        )}
                    </TableCell>
                    <TableCell className="text-center">
                      {bill.isPaid ? (
                        <Button variant="ghost" size="sm" disabled className="h-8 text-success">
                            Paga
                        </Button>
                      ) : (
                        <Button 
                          variant={bill.isIncluded ? "destructive" : "default"} 
                          size="sm"
                          onClick={() => handleToggle(bill)}
                          className="h-8 text-xs"
                        >
                          {bill.isIncluded ? <X className="w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                          {bill.isIncluded ? 'Excluir' : 'Incluir'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {allFixedInstallments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma parcela fixa ativa encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}