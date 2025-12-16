import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pin, ArrowLeftRight, TrendingUp, TrendingDown, AlertCircle, Check, PiggyBank, CreditCard, Car, Info } from "lucide-react";
import { ContaCorrente, Categoria, ImportedTransaction, OperationType, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { EditableCell } from "../EditableCell";

// Interface simplificada para Empréstimo
interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
}

// Interface simplificada para Investimento
interface InvestmentInfo {
  id: string;
  name: string;
}

interface TransactionReviewTableProps {
  transactions: ImportedTransaction[];
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[]; // NEW PROP
  loans: LoanInfo[]; // NEW PROP
  onUpdateTransaction: (id: string, updates: Partial<ImportedTransaction>) => void;
  onCreateRule: (transaction: ImportedTransaction) => void;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; color: string }[] = [
  { value: 'receita', label: 'Receita', color: 'text-success' },
  { value: 'despesa', label: 'Despesa', color: 'text-destructive' },
  { value: 'transferencia', label: 'Transferência', color: 'text-primary' },
  { value: 'aplicacao', label: 'Aplicação', color: 'text-purple-500' },
  { value: 'resgate', label: 'Resgate', color: 'text-amber-500' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', color: 'text-orange-500' },
  { value: 'liberacao_emprestimo', label: 'Liberação Empréstimo', color: 'text-emerald-500' },
  { value: 'veiculo', label: 'Veículo', color: 'text-blue-500' },
  { value: 'rendimento', label: 'Rendimento', color: 'text-teal-500' },
];

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function TransactionReviewTable({
  transactions,
  accounts,
  categories,
  investments, // USED
  loans, // USED
  onUpdateTransaction,
  onCreateRule,
}: TransactionReviewTableProps) {
  
  const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accountsMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  
  const getCategoryOptions = (operationType: OperationType | null) => {
    if (!operationType || operationType === 'transferencia' || operationType === 'initial_balance') return categories;
    
    const isIncome = operationType === 'receita' || operationType === 'rendimento' || operationType === 'liberacao_emprestimo';
    
    return categories.filter(c => 
      (isIncome && c.nature === 'receita') || 
      (!isIncome && c.nature !== 'receita')
    );
  };
  
  const availableDestinationAccounts = useMemo(() => 
    accounts.filter(a => !a.hidden), 
    [accounts]
  );
  
  const investmentAccounts = useMemo(() => investments, [investments]);
  const activeLoans = useMemo(() => loans.filter(l => !l.id.includes('pending')), [loans]);

  // Função para renderizar o seletor de Vínculo/Contraparte
  const renderVincularSelector = (tx: ImportedTransaction) => {
    const opType = tx.operationType;
    
    // 1. Transferência (Conta Destino)
    if (opType === 'transferencia') {
      const destinationOptions = availableDestinationAccounts.filter(a => a.id !== tx.accountId);
      return (
        <Select
          value={tx.destinationAccountId || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { destinationAccountId: v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Conta Destino..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {destinationOptions.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // 2. Aplicação / Resgate (Conta de Investimento)
    if (opType === 'aplicacao' || opType === 'resgate') {
      return (
        <Select
          value={tx.tempInvestmentId || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { tempInvestmentId: v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Conta Investimento..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {investmentAccounts.map(i => (
              <SelectItem key={i.id} value={i.id}>
                <span className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-purple-500" />
                    {i.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // 3. Pagamento Empréstimo (Contrato de Empréstimo)
    if (opType === 'pagamento_emprestimo') {
      return (
        <Select
          value={tx.tempLoanId || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { tempLoanId: v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Contrato..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {activeLoans.map(l => (
              <SelectItem key={l.id} value={l.id}>
                <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    {l.institution}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // 4. Veículo (Compra/Venda)
    if (opType === 'veiculo') {
      return (
        <Select
          value={tx.tempVehicleOperation || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { tempVehicleOperation: v as 'compra' | 'venda' })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Operação..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compra">
                <span className="flex items-center gap-2 text-destructive">
                    <Car className="w-4 h-4" /> Compra (Saída)
                </span>
            </SelectItem>
            <SelectItem value="venda">
                <span className="flex items-center gap-2 text-success">
                    <Car className="w-4 h-4" /> Venda (Entrada)
                </span>
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    // 5. Liberação Empréstimo (Apenas indicador)
    if (opType === 'liberacao_emprestimo') {
        return (
            <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-500">
                <Info className="w-3 h-3 mr-1" /> Config. Posterior
            </Badge>
        );
    }

    return <span className="text-muted-foreground text-xs">—</span>;
  };
  
  // Função para determinar se a categoria deve ser desabilitada
  const isCategoryDisabled = (tx: ImportedTransaction): boolean => {
    const opType = tx.operationType;
    if (!opType) return true;
    
    // Desabilita se for uma operação de vínculo
    return opType === 'transferencia' || 
           opType === 'aplicacao' || 
           opType === 'resgate' || 
           opType === 'pagamento_emprestimo' ||
           opType === 'liberacao_emprestimo' ||
           opType === 'veiculo';
  };

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1400px]"> {/* Aumentado min-width */}
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground w-[80px]">Data</TableHead>
            <TableHead className="text-muted-foreground w-[100px]">Valor</TableHead>
            <TableHead className="text-muted-foreground w-[300px]">Descrição Original</TableHead>
            <TableHead className="text-muted-foreground w-[180px]">Tipo Operação</TableHead>
            <TableHead className="text-muted-foreground w-[250px]">Vínculo / Contraparte</TableHead> {/* RENOMEADO */}
            <TableHead className="text-muted-foreground w-[200px]">Categoria</TableHead>
            <TableHead className="text-muted-foreground w-[250px]">Descrição Final</TableHead>
            <TableHead className="text-muted-foreground w-[80px] text-center">Regra</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isIncome = tx.operationType === 'receita' || tx.operationType === 'rendimento' || tx.operationType === 'liberacao_emprestimo' || (tx.operationType === 'veiculo' && tx.amount > 0);
            const currentCategory = tx.categoryId ? categoriesMap.get(tx.categoryId) : null;
            
            // Verifica se o vínculo está completo (para transferência, investimento, empréstimo, veículo)
            const isVincularComplete = 
                (tx.operationType === 'transferencia' && !!tx.destinationAccountId) ||
                ((tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && !!tx.tempInvestmentId) ||
                (tx.operationType === 'pagamento_emprestimo' && !!tx.tempLoanId) ||
                (tx.operationType === 'veiculo' && !!tx.tempVehicleOperation) ||
                // Se não for operação de vínculo, a categorização é o que importa
                (!isCategoryDisabled(tx) && !!tx.categoryId) ||
                // Liberação de empréstimo é considerada completa se tiver o tipo
                tx.operationType === 'liberacao_emprestimo';
            
            const isCategorized = isVincularComplete; // Usamos isVincularComplete como proxy para isCategorized
            
            return (
              <TableRow 
                key={tx.id} 
                className={cn(
                  "border-border hover:bg-muted/30 transition-colors",
                  !isCategorized && "bg-warning/5 hover:bg-warning/10"
                )}
              >
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className={cn(
                  "font-medium whitespace-nowrap text-sm",
                  isIncome ? "text-success" : "text-destructive"
                )}>
                  {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                </TableCell>
                <TableCell className="text-sm max-w-[300px] truncate" title={tx.originalDescription}>
                  {tx.originalDescription}
                </TableCell>
                
                {/* Tipo Operação */}
                <TableCell>
                  <Select
                    value={tx.operationType || ''}
                    onValueChange={(v) => onUpdateTransaction(tx.id, { 
                        operationType: v as OperationType, 
                        isTransfer: v === 'transferencia',
                        // Limpa vínculos e categoria ao mudar o tipo
                        categoryId: null,
                        destinationAccountId: null,
                        tempInvestmentId: null,
                        tempLoanId: null,
                        tempVehicleOperation: null,
                    })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATION_OPTIONS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          <span className={cn("flex items-center gap-2", op.color)}>
                            {op.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                
                {/* Vínculo / Contraparte (Dinâmico) */}
                <TableCell>
                  {renderVincularSelector(tx)}
                </TableCell>
                
                {/* Categoria */}
                <TableCell>
                  <Select
                    value={tx.categoryId || ''}
                    onValueChange={(v) => onUpdateTransaction(tx.id, { categoryId: v })}
                    disabled={isCategoryDisabled(tx)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {getCategoryOptions(tx.operationType).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label} ({CATEGORY_NATURE_LABELS[cat.nature]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                
                {/* Descrição Final */}
                <TableCell>
                  <EditableCell
                    value={tx.description}
                    type="text"
                    onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })}
                    className="text-sm"
                  />
                </TableCell>
                
                {/* Ações / Regra */}
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => onCreateRule(tx)}
                    disabled={!isCategorized}
                    title="Criar regra de padronização"
                  >
                    <Pin className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                Nenhuma transação para revisar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}