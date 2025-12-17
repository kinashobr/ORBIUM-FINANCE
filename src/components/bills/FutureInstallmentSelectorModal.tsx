import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calendar, Check, X, CheckCircle2 } from "lucide-react";
import { PotentialFixedBill, formatCurrency, BillTracker } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { format } from "date-fns";
import { cn, parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";

interface FutureInstallmentSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localBills: BillTracker[];
  onIncludeBills: (bills: PotentialFixedBill[]) => void;
  referenceDate: Date; // NOVO: Data de referência do Bills Tracker
}

export function FutureInstallmentSelectorModal({
  open,
  onOpenChange,
  localBills,
  onIncludeBills,
  referenceDate,
}: FutureInstallmentSelectorModalProps) {
  const { getFutureFixedBills } = useFinance();
  
  // Obtém todas as parcelas futuras (incluindo pagas)
  const allFutureBills = useMemo(() => {
    return getFutureFixedBills(referenceDate, localBills);
  }, [getFutureFixedBills, referenceDate, localBills]);

  // O estado de seleção só deve rastrear parcelas que podem ser incluídas (não pagas e não incluídas)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  
  // Reset state when opening
  useMemo(() => {
    if (open) {
        // Inicializa a seleção apenas com itens que já estão incluídos no localBills
        const initialSelected = new Set(
            allFutureBills.filter(b => b.isIncluded).map(b => b.key)
        );
        setSelectedKeys(initialSelected);
    }
  }, [open, allFutureBills]);

  const handleToggleSelect = useCallback((bill: PotentialFixedBill, isChecked: boolean) => {
    if (bill.isPaid) return; // Não permite selecionar parcelas pagas
    
    setSelectedKeys(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(bill.key);
      } else {
        newSet.delete(bill.key);
      }
      return newSet;
    });
  }, []);

  const handleIncludeSelected = () => {
    // Filtra apenas as chaves que foram selecionadas E que não estavam previamente incluídas
    const keysToInclude = Array.from(selectedKeys).filter(key => {
        const bill = allFutureBills.find(b => b.key === key);
        return bill && !bill.isIncluded;
    });
    
    if (keysToInclude.length === 0) {
      toast.info("Selecione pelo menos uma parcela pendente para adiantar.");
      return;
    }
    
    const billsToInclude = allFutureBills.filter(bill => keysToInclude.includes(bill.key));
    
    onIncludeBills(billsToInclude);
    onOpenChange(false);
    toast.success(`${billsToInclude.length} parcela(s) adiantada(s) para o planejamento do mês.`);
  };
  
  const totalSelectedAmount = useMemo(() => {
    return allFutureBills
      .filter(bill => selectedKeys.has(bill.key) && !bill.isPaid)
      .reduce((sum, bill) => sum + bill.expectedAmount, 0);
  }, [allFutureBills, selectedKeys]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Adiantar Parcelas Futuras
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Selecione parcelas de empréstimos ou seguros com vencimento futuro (após {format(referenceDate, 'MMMM/yyyy')}) para incluir no planejamento deste mês. Parcelas já pagas são exibidas em verde.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center">Incluir</TableHead>
                <TableHead className="w-[100px]">Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[120px] text-right">Valor</TableHead>
                <TableHead className="w-[100px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allFutureBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    <Check className="w-6 h-6 mx-auto mb-2 text-success" />
                    Não há parcelas futuras pendentes.
                  </TableCell>
                </TableRow>
              ) : (
                allFutureBills.map((bill) => {
                    const isSelectable = !bill.isPaid && !bill.isIncluded;
                    const isChecked = bill.isIncluded || selectedKeys.has(bill.key);
                    
                    return (
                      <TableRow 
                        key={bill.key} 
                        className={cn(
                            bill.isPaid && "bg-success/5 hover:bg-success/10",
                            bill.isIncluded && !bill.isPaid && "bg-primary/5 hover:bg-primary/10"
                        )}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isChecked}
                            disabled={!isSelectable}
                            onCheckedChange={(checked) => handleToggleSelect(bill, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {format(parseDateLocal(bill.dueDate), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          {bill.description}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(bill.expectedAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {bill.isPaid ? (
                            <span className="text-xs text-success font-medium flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Paga
                            </span>
                          ) : bill.isIncluded ? (
                            <span className="text-xs text-primary font-medium">Incluída</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Futura</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex justify-between items-center pt-4">
          <div className="text-sm font-medium">
            Total Selecionado: <span className="font-bold text-primary">{formatCurrency(totalSelectedAmount)}</span>
          </div>
          <Button 
            onClick={handleIncludeSelected} 
            disabled={Array.from(selectedKeys).filter(key => !allFutureBills.find(b => b.key === key)?.isIncluded).length === 0}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Adicionar {Array.from(selectedKeys).filter(key => !allFutureBills.find(b => b.key === key)?.isIncluded).length} Parcelas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}