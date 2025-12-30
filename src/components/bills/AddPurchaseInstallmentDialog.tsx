"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Calendar, DollarSign, ListOrdered, Check } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface AddPurchaseInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
}

export function AddPurchaseInstallmentDialog({ open, onOpenChange, currentDate }: AddPurchaseInstallmentDialogProps) {
  const { addPurchaseInstallments, contasMovimento, categoriasV2 } = useFinance();
  
  const [formData, setFormData] = useState({
    description: "",
    totalAmount: "",
    installments: "2",
    firstDueDate: format(currentDate, 'yyyy-MM-dd'),
    accountId: "",
    categoryId: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.totalAmount.replace(',', '.'));
    const inst = parseInt(formData.installments);

    if (!formData.description || isNaN(amount) || amount <= 0 || isNaN(inst) || inst < 2) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    addPurchaseInstallments({
      description: formData.description,
      totalAmount: amount,
      installments: inst,
      firstDueDate: formData.firstDueDate,
      suggestedAccountId: formData.accountId || undefined,
      suggestedCategoryId: formData.categoryId || undefined,
    });

    toast.success(`${inst} parcelas geradas com sucesso!`);
    onOpenChange(false);
    setFormData({
      description: "",
      totalAmount: "",
      installments: "2",
      firstDueDate: format(currentDate, 'yyyy-MM-dd'),
      accountId: "",
      categoryId: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-2">
            <ShoppingCart className="w-6 h-6 text-pink-500" />
          </div>
          <DialogTitle className="text-xl">Nova Compra Parcelada</DialogTitle>
          <DialogDescription>
            Informe os detalhes para gerar as parcelas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Descrição da Compra</Label>
            <Input 
              placeholder="Ex: Novo Smartphone" 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Total (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="0,00"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nº Parcelas</Label>
              <div className="relative">
                <ListOrdered className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  min="2" 
                  className="pl-9"
                  value={formData.installments}
                  onChange={(e) => setFormData(prev => ({ ...prev, installments: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data da 1ª Parcela</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input 
                type="date" 
                className="pl-9"
                value={formData.firstDueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, firstDueDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conta sugerida</Label>
              <Select value={formData.accountId} onValueChange={(v) => setFormData(prev => ({ ...prev, accountId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {contasMovimento.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria sugerida</Label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData(prev => ({ ...prev, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categoriasV2.filter(c => c.nature !== 'receita').map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" className="rounded-xl bg-pink-500 hover:bg-pink-600 gap-2">
              <Check className="w-4 h-4" />
              Gerar Parcelas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}