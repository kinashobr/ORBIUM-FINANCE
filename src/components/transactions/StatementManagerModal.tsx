import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, Trash2, Check, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { ContaCorrente, ImportedStatement, formatCurrency } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";
import { StatementUploadPanel } from "./StatementUploadPanel"; // Importar o componente de upload

interface StatementManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (accountId: string) => void; // Função para ir para a tela de revisão
}

export function StatementManagerModal({ open, onOpenChange, onReview }: StatementManagerModalProps) {
  const { 
    contasMovimento, 
    importedStatements, 
    addStatement, 
    deleteStatement,
    markStatementContabilized,
  } = useFinance();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Filtra apenas contas correntes (que podem importar extratos)
  const currentAccounts = useMemo(() => 
    contasMovimento.filter(c => c.accountType === 'conta_corrente'),
    [contasMovimento]
  );
  
  // Extratos pendentes para a conta selecionada
  const statementsForReview = useMemo(() => 
    importedStatements
      .filter(s => s.accountId === selectedAccountId)
      .sort((a, b) => parseDateLocal(a.dateFrom).getTime() - parseDateLocal(b.dateFrom).getTime()),
    [importedStatements, selectedAccountId]
  );
  
  const pendingStatements = statementsForReview.filter(s => s.status === 'pending_review');
  const contabilizedStatements = statementsForReview.filter(s => s.status === 'contabilized');

  const handleStatementAdded = useCallback((statement: Omit<ImportedStatement, "id" | "status">) => {
    addStatement(statement);
    toast.success(`Extrato '${statement.fileName}' importado com sucesso!`);
  }, [addStatement]);

  const handleDeleteStatement = (statementId: string, fileName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o extrato ${fileName}?`)) {
      deleteStatement(statementId);
      toast.success(`Extrato ${fileName} excluído.`);
    }
  };
  
  const handleReview = () => {
    if (!selectedAccountId) {
      toast.error("Selecione uma conta para revisar.");
      return;
    }
    if (pendingStatements.length === 0) {
      toast.info("Nenhum extrato pendente para revisão nesta conta.");
      return;
    }
    onReview(selectedAccountId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Gerenciamento de Extratos
          </DialogTitle>
          <DialogDescription>
            Importe arquivos de extrato (.csv, .ofx) e prepare-os para contabilização.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Seleção de Conta */}
          <div className="space-y-2">
            <Label>Conta Movimento *</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={isUploading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a conta para importar..." />
              </SelectTrigger>
              <SelectContent>
                {currentAccounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.institution})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentAccounts.length === 0 && (
                <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Nenhuma Conta Corrente cadastrada.
                </p>
            )}
          </div>

          {/* Painel de Upload */}
          <StatementUploadPanel
            accountId={selectedAccountId}
            onStatementAdded={handleStatementAdded}
            onLoadingChange={setIsUploading}
            disabled={!selectedAccountId || isUploading}
          />

          {/* Listagem de Extratos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Extratos Importados ({statementsForReview.length})</h3>
                <Button 
                    onClick={handleReview} 
                    disabled={pendingStatements.length === 0}
                    className="gap-2"
                >
                    Revisar e Contabilizar ({pendingStatements.length})
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Transações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statementsForReview.map(s => (
                    <TableRow key={s.id} className={cn(s.status === 'contabilized' && 'bg-success/5')}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={s.fileName}>
                        {s.fileName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {parseDateLocal(s.dateFrom).toLocaleDateString('pt-BR')} - {parseDateLocal(s.dateTo).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{s.rawTransactions.length}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            s.status === 'pending_review' && 'border-warning text-warning',
                            s.status === 'contabilized' && 'border-success text-success'
                          )}
                        >
                          {s.status === 'pending_review' ? 'Pendente' : 'Contabilizado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteStatement(s.id, s.fileName)}
                          disabled={s.status === 'contabilized'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {statementsForReview.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum extrato importado para esta conta.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}