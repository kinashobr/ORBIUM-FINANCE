"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { FixedBillSelectorModal } from "./FixedBillSelectorModal";
import { AddPurchaseInstallmentDialog } from "./AddPurchaseInstallmentDialog";
import { Button } from "@/components/ui/button";
import { Settings2, FastForward, ShoppingCart, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    getBillsForMonth, 
    getOtherPaidExpensesForMonth,
    updateBill, 
    deleteBill, 
    setBillsTracker 
  } = useFinance();
  
  const [currentDate] = useState(new Date());
  const [fixedBillSelectorOpen, setFixedBillSelectorOpen] = useState(false);
  const [fixedBillSelectorMode, setFixedBillSelectorMode] = useState<"current" | "future">("current");
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  const trackerBills = getBillsForMonth(currentDate);
  const externalPaidBills = getOtherPaidExpensesForMonth(currentDate);
  const allDisplayBills = [...trackerBills, ...externalPaidBills];

  const handleTogglePaid = (bill: any, isChecked: boolean) => {
    updateBill(bill.id, { isPaid: isChecked, paymentDate: isChecked ? format(new Date(), 'yyyy-MM-dd') : undefined });
  };

  const openFixedSelector = (mode: "current" | "future") => {
    setFixedBillSelectorMode(mode);
    setFixedBillSelectorOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Rastreador de Contas</DialogTitle>
                <p className="text-sm text-muted-foreground capitalize">
                  {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pr-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPurchaseDialogOpen(true)}
                className="rounded-lg border-pink-500/50 text-pink-500 hover:bg-pink-500 hover:text-white gap-2 h-9"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Compras Parceladas</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => openFixedSelector("current")}
                className="rounded-lg gap-2 h-9"
              >
                <Settings2 className="w-4 h-4" />
                <span>Gerenciar Fixas</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => openFixedSelector("future")}
                className="rounded-lg gap-2 h-9"
              >
                <FastForward className="w-4 h-4" />
                <span>Adiantar</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6">
          <BillsTrackerList
            bills={allDisplayBills}
            onUpdateBill={updateBill}
            onDeleteBill={deleteBill}
            onTogglePaid={handleTogglePaid}
            onAddBill={(bill) => {
                const newId = `bill_${Date.now()}`;
                setBillsTracker(prev => [...prev, { ...bill, id: newId, isPaid: false, type: 'tracker' }]);
            }}
            currentDate={currentDate}
          />
        </div>

        <FixedBillSelectorModal
          open={fixedBillSelectorOpen}
          onOpenChange={setFixedBillSelectorOpen}
          mode={fixedBillSelectorMode}
          currentDate={currentDate}
        />

        <AddPurchaseInstallmentDialog 
          open={isPurchaseDialogOpen}
          onOpenChange={setIsPurchaseDialogOpen}
          currentDate={currentDate}
        />
      </DialogContent>
    </Dialog>
  );
}