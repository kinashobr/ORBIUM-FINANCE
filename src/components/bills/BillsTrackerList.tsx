import { useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, Plus, Edit, Trash2, CalendarCheck, TrendingUp, TrendingDown, DollarSign, Wallet, Target, Info, Save, LogOut, RefreshCw, ListChecks } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillDisplayItem, BillTracker, ExternalPaidBill, formatCurrency, BillSourceType } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { EditableCell } from "../EditableCell";

interface BillsTrackerListProps {
  bills: BillDisplayItem[];
  onUpdateBill: (id: string, updates: Partial<BillTracker>) => void;
  onDeleteBill: (id: string) => void;
  onAddBill: (bill: Omit<BillTracker, "id" | "isPaid" | "type">) => void;
  onTogglePaid: (bill: BillTracker, isChecked: boolean) => void;
  currentDate: Date;
}

// Predicado de tipo para BillTracker
const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => {
  return bill.type === 'tracker';
};

// Predicado de tipo para ExternalPaidBill
const isExternalPaidBill = (bill: BillDisplayItem): bill is ExternalPaidBill => {
  return bill.type === 'external_paid';
};

export function BillsTrackerList({
  bills,
  onUpdateBill,
  onDeleteBill,
  onAddBill,
  onTogglePaid,
  currentDate,
}: BillsTrackerListProps) {
  const { contasMovimento, categoriasV2 } = useFinance();

  // Agrupar por fonte
  const groupedBills = useMemo(() => {
    const groups: Record<string, BillDisplayItem[]> = {
      'loan_installment': [],
      'insurance_installment': [],
      'fixed_expense': [],
      'variable_expense': [],
      'ad_hoc': [],
      'external_paid': [],
    };

    bills.forEach(bill => {
      if (isBillTracker(bill)) {
        groups[bill.sourceType].push(bill);
      } else if (isExternalPaidBill(bill)) {
        groups['external_paid'].push(bill);
      }
    });

    return groups;
  }, [bills]);

  // Contas de alta liquidez para sugestão de conta de pagamento
  const highLiquidityAccounts = useMemo(() => 
    contasMovimento.filter(c => ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType)),
  [contasMovimento]);

  // Categorias de despesa para sugestão
  const expenseCategories = useMemo(() => 
    categoriasV2.filter(c => c.nature === 'despesa_variavel' || c.nature === 'despesa_fixa'),
  [categoriasV2]);

  // Cálculo de totais
  const totals = useMemo(() => {
    const totalUnpaid = bills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0);
    const totalPaid = bills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0);
    
    console.log('DEBUG - BillsTrackerList - totals calculation:', {
      totalBills: bills.length,
      unpaidBills: bills.filter(b => !b.isPaid).map(b => ({ type: b.type, description: b.description, amount: b.expectedAmount, isPaid: b.isPaid })),
      paidBills: bills.filter(b => b.isPaid).map(b => ({ type: b.type, description: b.description, amount: b.expectedAmount, isPaid: b.isPaid })),
      totalUnpaid,
      totalPaid
    });

    return { totalUnpaid, totalPaid };
  }, [bills]);

  const handleUpdateBill = useCallback((id: string, updates: Partial<BillTracker>) => {
    onUpdateBill(id, updates);
  }, [onUpdateBill]);

  const handleDeleteBill = useCallback((id: string) => {
    onDeleteBill(id);
  }, [onDeleteBill]);

  const handleTogglePaid = useCallback((bill: BillTracker, isChecked: boolean) => {
    onTogglePaid(bill, isChecked);
  }, [onTogglePaid]);

  const handleAddBill = useCallback(() => {
    const newBill: Omit<BillTracker, "id" | "isPaid" | "type"> = {
      description: "",
      dueDate: format(currentDate, 'yyyy-MM-dd'),
      expectedAmount: 0,
      sourceType: 'ad_hoc',
      suggestedAccountId: highLiquidityAccounts[0]?.id,
      suggestedCategoryId: expenseCategories[0]?.id || null,
      isExcluded: false,
    };
    onAddBill(newBill);
  }, [onAddBill, currentDate, highLiquidityAccounts, expenseCategories]);

  const renderBillRow = (bill: BillDisplayItem, index: number) => {
    const isTracker = isBillTracker(bill);
    const isExternal = isExternalPaidBill(bill);
    const dueDate = parseDateLocal(bill.dueDate);
    const isOverdue = !bill.isPaid && dueDate < currentDate;
    const isFuture = !bill.isPaid && dueDate > currentDate;

    return (
      <TableRow 
        key={bill.id} 
        className={cn(
          "hover:bg-muted/30 transition-colors h-12",
          bill.isPaid && "bg-success/5 hover:bg-success/10",
          isOverdue && "bg-destructive/5 hover:bg-destructive/10",
          isFuture && "bg-muted/30"
        )}
      >
        <TableCell className="text-center p-2 text-base">
          {isTracker ? (
            <input
              type="checkbox"
              checked={bill.isPaid}
              onChange={(e) => handleTogglePaid(bill as BillTracker, e.target.checked)}
              className="w-5 h-5"
              disabled={isExternal}
            />
          ) : (
            <Badge variant="outline" className="text-xs bg-muted/50">Pago</Badge>
          )}
        </TableCell>
        
        <TableCell className="font-medium whitespace-nowrap text-sm">
          {format(dueDate, 'dd/MM/yyyy')}
        </TableCell>
        
        <TableCell className="text-right font-semibold whitespace-nowrap text-sm">
          {formatCurrency(bill.expectedAmount)}
        </TableCell>
        
        <TableCell className="text-sm max-w-[300px] truncate">
          {bill.description}
        </TableCell>
        
        <TableCell className="text-sm">
          {isTracker ? (
            <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5">
              {getSourceIcon(bill.sourceType)}
              {getSourceLabel(bill.sourceType)}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-muted/50">Externa</Badge>
          )}
        </TableCell>
        
        <TableCell className="text-center text-sm">
          {bill.isPaid ? (
            <Badge variant="default" className="text-xs bg-success hover:bg-success/90">Pago</Badge>
          ) : isOverdue ? (
            <Badge variant="destructive" className="text-xs">Vencido</Badge>
          ) : isFuture ? (
            <Badge variant="outline" className="text-xs">Futuro</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Pendente</Badge>
          )}
        </TableCell>
        
        <TableCell className="text-center text-sm">
          {isTracker ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleUpdateBill(bill.id, { description: prompt("Nova descrição:", bill.description) || bill.description })}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteBill(bill.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const getSourceIcon = (sourceType: BillSourceType) => {
    switch (sourceType) {
      case 'loan_installment': return <TrendingDown className="w-3 h-3" />;
      case 'insurance_installment': return <Shield className="w-3 h-3" />;
      case 'fixed_expense': return <DollarSign className="w-3 h-3" />;
      case 'variable_expense': return <TrendingUp className="w-3 h-3" />;
      case 'ad_hoc': return <Info className="w-3 h-3" />;
      default: return <Info className="w-3 h-3" />;
    }
  };

  const getSourceLabel = (sourceType: BillSourceType) => {
    switch (sourceType) {
      case 'loan_installment': return 'Empréstimo';
      case 'insurance_installment': return 'Seguro';
      case 'fixed_expense': return 'Fixa';
      case 'variable_expense': return 'Variável';
      case 'ad_hoc': return 'Avulsa';
      default: return 'Outro';
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Contas do Mês</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="w-4 h-4 text-success" />
            {totals.totalPaid.toFixed(2)} pagos
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-warning" />
            {totals.totalUnpaid.toFixed(2)} pendentes
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
          <Table className="min-w-[1000px]">
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground w-12 text-center">Pago</TableHead>
                <TableHead className="text-muted-foreground">Vencimento</TableHead>
                <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                <TableHead className="text-muted-foreground">Descrição</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-muted-foreground text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill, index) => renderBillRow(bill, index))}
              {bills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma conta encontrada para este mês.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Pendente</p>
          <p className="text-lg font-bold text-warning">
            {formatCurrency(totals.totalUnpaid)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Pago</p>
          <p className="text-lg font-bold text-success">
            {formatCurrency(totals.totalPaid)}
          </p>
        </div>
      </div>

      {/* Botão de Adicionar Conta */}
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={handleAddBill} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Conta
        </Button>
      </div>
    </div>
  );
}