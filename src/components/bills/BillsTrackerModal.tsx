import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Calculator, Menu, LogOut, X, Save } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsContextSidebar } from "./BillsContextSidebar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker, formatCurrency, TransacaoCompleta, getDomainFromOperation, generateTransactionId, Categoria } from "@/types/finance";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "sonner";

interface BillsTrackerModalProps {
// ... (omitted logic)
  
  // Lógica de Persistência (Salvar e Sair)
  const handleSaveAndClose = () => {
// ... (omitted logic)
    
    // Bills do contexto original (para comparação)
    const originalBillsMap = new Map(billsForPeriod.map(b => [b.id, b]));
    
    // Itera sobre as contas originais para ver o que mudou
    billsForPeriod.forEach(originalBill => {
        const localVersion = localBills.find(b => b.id === originalBill.id);
        
        if (!localVersion || localVersion.isExcluded) {
            // Se excluído localmente, não faz nada (será filtrado na próxima chamada de getBillsForPeriod)
            return;
        }
        
        const wasPaid = originalBill.isPaid;
        const isNowPaid = localVersion.isPaid;
        
        if (isNowPaid && !wasPaid) {
            // A. MARCAR COMO PAGO (Cria Transação)
            const bill = localVersion;
            const paymentDate = bill.paymentDate || format(referenceDate, 'yyyy-MM-dd');
            const transactionId = bill.transactionId || generateTransactionId();
            
            const suggestedAccount = contasMovimento.find(c => c.id === bill.suggestedAccountId);
            const suggestedCategory = categoriasV2.find(c => c.id === bill.suggestedCategoryId);
            
            if (!suggestedAccount) {
// ... (omitted logic)
            
            // Atualiza o Bill Tracker com o transactionId e status final
            updatedBillsTracker.push({ ...localVersion, transactionId });
            
        } else if (!isNowPaid && wasPaid) {
// ... (omitted logic)
            
        } else {
            // C. Nenhuma mudança de status de pagamento, mas pode ter mudado suggestedAccountId/expectedAmount
            updatedBillsTracker.push(localVersion);
        }
    });
    
    // 4. Adiciona novas transações ao contexto
// ... (omitted logic)
    
    // Bills que precisam de update/delete no contexto
    const billsToUpdateOrDelete = localBills.filter(b => originalBillsMap.has(b.id) && (b.isPaid !== (originalBillsMap.get(b.id) as BillTracker)?.isPaid || b.isExcluded || b.suggestedAccountId !== (originalBillsMap.get(b.id) as BillTracker)?.suggestedAccountId || b.expectedAmount !== (originalBillsMap.get(b.id) as BillTracker)?.expectedAmount));
    
    // Bills que precisam ser adicionadas (novas Ad-Hoc)
    const billsToAddNew = localBills.filter(b => !originalBillsMap.has(b.id));
    
    // Executa as operações no contexto global
// ... (rest of the file remains the same)