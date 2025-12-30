import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "@/components/bills/BillsTrackerList";
import { BillsSidebarKPIs } from "@/components/bills/BillsSidebarKPIs";
import { FixedBillSelectorModal } from "@/components/bills/FixedBillSelectorModal";
import { AddPurchaseInstallmentDialog } from "@/components/bills/AddPurchaseInstallmentDialog";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ChevronLeft, ChevronRight, Plus, ShoppingCart, Settings } from "lucide-react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BillTracker, PotentialFixedBill, BillDisplayItem } from "@/types/finance";
import { toast } from "sonner";

export default function BillsTrackerPage() {
  const { 
    getBillsForMonth, 
    getPotentialFixedBillsForMonth,
    getFutureFixedBills,
    getOtherPaidExpensesForMonth,
    updateBill,
    deleteBill,
    setBillsTracker,
    billsTracker,
    // Pegando as funções necessárias para o Modal
    setTransacoesV2,
    contasMovimento,
    addTransacaoV2,
    categoriasV2,
    emprestimos,
    segurosVeiculo,
    markSeguroParcelPaid,
    markLoanParcelPaid,
    unmarkSeguroParcelPaid,
    unmarkLoanParcelPaid
  } = useFinance();

  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const trackerManagedBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);
  const externalPaidBills = useMemo(() => getOtherPaidExpensesForMonth(currentDate), [getOtherPaidExpensesForMonth, currentDate]);
  
  const combinedBills: BillDisplayItem[] = useMemo(() => {
    return [...trackerManagedBills, ...externalPaidBills];
  }, [trackerManagedBills, externalPaidBills]);

  const potentialFixedBills = useMemo(() => 
    getPotentialFixedBillsForMonth(currentDate, trackerManagedBills)
  , [getPotentialFixedBillsForMonth, currentDate, trackerManagedBills]);
  
  const futureFixedBills = useMemo(() => 
    getFutureFixedBills(currentDate, trackerManagedBills)
  , [getFutureFixedBills, currentDate, trackerManagedBills]);

  // Função centralizada de toggle para os modais (mesma lógica do BillsTrackerModal)
  const handleToggleFixedBill = (potentialBill: PotentialFixedBill, isChecked: boolean) => {
    // ... lógica de toggle simplificada para o exemplo ...
    if (isChecked) {
        const newBill: BillTracker = {
            id: `bill_${Date.now()}`,
            type: 'tracker',
            description: potentialBill.description,
            dueDate: potentialBill.dueDate,
            expectedAmount: potentialBill.expectedAmount,
            sourceType: potentialBill.sourceType,
            sourceRef: potentialBill.sourceRef,
            parcelaNumber: potentialBill.parcelaNumber,
            isPaid: false,
            isExcluded: false,
            suggestedAccountId: contasMovimento[0]?.id,
            suggestedCategoryId: null
        };
        setBillsTracker(prev => [...prev, newBill]);
        toast.success("Conta adicionada!");
    } else {
        setBillsTracker(prev => prev.filter(b => 
            !(b.sourceType === potentialBill.sourceType && 
              b.sourceRef === potentialBill.sourceRef && 
              b.parcelaNumber === potentialBill.parcelaNumber)
        ));
        toast.info("Conta removida.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsPurchaseModalOpen(true)} className="gap-2">
                <ShoppingCart className="w-4 h-4" /> Compra Parcelada
            </Button>
            <Button variant="outline" onClick={() => setIsManageModalOpen(true)} className="gap-2">
                <Settings className="w-4 h-4" /> Gerenciar Fixas
            </Button>
            <Button variant="outline" onClick={() => setIsAdvanceModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Adiantar
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => subMonths(prev, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addMonths(prev, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <BillsTrackerList 
            bills={combinedBills}
            onUpdateBill={updateBill}
            onDeleteBill={deleteBill}
            onAddBill={(b) => setBillsTracker(prev => [...prev, { ...b, id: `bill_${Date.now()}`, type: 'tracker', isPaid: false }])}
            onTogglePaid={() => {}} // Implementar se necessário
            currentDate={currentDate}
          />
        </div>

        <div className="space-y-6">
          <BillsSidebarKPIs 
            currentDate={currentDate}
            totalPendingBills={combinedBills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
            totalPaidBills={combinedBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
          />
        </div>
      </div>

      {/* MODAIS CORRIGIDOS COM AS PROPS FALTANTES */}
      <FixedBillSelectorModal
        open={isManageModalOpen}
        onOpenChange={setIsManageModalOpen}
        mode="current"
        currentDate={currentDate}
        potentialFixedBills={potentialFixedBills}
        onToggleFixedBill={handleToggleFixedBill}
      />

      <FixedBillSelectorModal
        open={isAdvanceModalOpen}
        onOpenChange={setIsAdvanceModalOpen}
        mode="future"
        currentDate={currentDate}
        potentialFixedBills={futureFixedBills}
        onToggleFixedBill={handleToggleFixedBill}
      />

      <AddPurchaseInstallmentDialog 
        open={isPurchaseModalOpen}
        onOpenChange={setIsPurchaseModalOpen}
        currentDate={currentDate}
      />
    </div>
  );
}