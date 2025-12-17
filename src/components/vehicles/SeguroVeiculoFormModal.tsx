import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SeguroVeiculo, Veiculo, formatCurrency } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { addMonths, format, parseISO } from "date-fns";

interface SeguroVeiculoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seguro?: SeguroVeiculo;
  veiculos: Veiculo[];
}

export function SeguroVeiculoFormModal({
  open,
  onOpenChange,
  seguro,
  veiculos,
}: SeguroVeiculoFormModalProps) {
  const { addSeguroVeiculo, updateSeguroVeiculo, deleteSeguroVeiculo } = useFinance();
  
  const [formData, setFormData] = useState<Partial<SeguroVeiculo>>({
    veiculoId: seguro?.veiculoId,
    numeroApolice: seguro?.numeroApolice || '',
    seguradora: seguro?.seguradora || '',
    vigenciaInicio: seguro?.vigenciaInicio || format(new Date(), 'yyyy-MM-dd'),
    vigenciaFim: seguro?.vigenciaFim || format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    valorTotal: seguro?.valorTotal || 0,
    numeroParcelas: seguro?.numeroParcelas || 1,
    meiaParcela: seguro?.meiaParcela || false,
  });
  
  const isEditing = !!seguro;

  useEffect(() => {
    if (open && seguro) {
      setFormData({
        veiculoId: seguro.veiculoId,
        numeroApolice: seguro.numeroApolice,
        seguradora: seguro.seguradora,
        vigenciaInicio: seguro.vigenciaInicio,
        vigenciaFim: seguro.vigenciaFim,
        valorTotal: seguro.valorTotal,
        numeroParcelas: seguro.numeroParcelas,
        meiaParcela: seguro.meiaParcela,
      });
    } else if (open && !seguro) {
      setFormData({
        veiculoId: veiculos.length > 0 ? veiculos[0].id : undefined,
        numeroApolice: '',
        seguradora: '',
        vigenciaInicio: format(new Date(), 'yyyy-MM-dd'),
        vigenciaFim: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
        valorTotal: 0,
        numeroParcelas: 1,
        meiaParcela: false,
      });
    }
  }, [open, seguro, veiculos]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };
  
  const handleSelectChange = (id: keyof SeguroVeiculo, value: string) => {
    if (id === 'veiculoId') {
        setFormData(prev => ({ ...prev, veiculoId: parseInt(value) }));
    } else {
        setFormData(prev => ({ ...prev, [id]: value }));
    }
  };
  
  const handleCheckboxChange = (id: keyof SeguroVeiculo, checked: boolean) => {
    setFormData(prev => ({ ...prev, [id]: checked }));
  };

  const calculateParcelas = (data: Partial<SeguroVeiculo>): SeguroVeiculo['parcelas'] => {
    const { valorTotal = 0, numeroParcelas = 1, vigenciaInicio = format(new Date(), 'yyyy-MM-dd') } = data;
    if (valorTotal <= 0 || numeroParcelas <= 0) return [];

    const valorParcela = valorTotal / numeroParcelas;
    const parcelas: SeguroVeiculo['parcelas'] = [];
    const inicio = parseISO(vigenciaInicio);

    for (let i = 0; i < numeroParcelas; i++) {
      const vencimento = addMonths(inicio, i);
      parcelas.push({
        numero: i + 1,
        vencimento: format(vencimento, 'yyyy-MM-dd'),
        valor: Math.round(valorParcela * 100) / 100,
        paga: false,
      });
    }
    return parcelas;
  };
  
  const handleSubmit = () => {
    if (!formData.veiculoId || !formData.numeroApolice || !formData.seguradora || formData.valorTotal! <= 0 || formData.numeroParcelas! <= 0) {
      toast.error("Preencha todos os campos obrigatórios (Veículo, Apólice, Seguradora, Valor Total e Parcelas).");
      return;
    }
    
    const parcelas = calculateParcelas(formData);
    
    const finalData: Omit<SeguroVeiculo, 'id'> = {
        veiculoId: formData.veiculoId!,
        numeroApolice: formData.numeroApolice!,
        seguradora: formData.seguradora!,
        vigenciaInicio: formData.vigenciaInicio!,
        vigenciaFim: formData.vigenciaFim!,
        valorTotal: formData.valorTotal!,
        numeroParcelas: formData.numeroParcelas!,
        meiaParcela: formData.meiaParcela!,
        parcelas: isEditing ? seguro!.parcelas.map(p => {
            // Mantém o status de pago e transactionId se a parcela existir
            const newParcela = parcelas.find(np => np.numero === p.numero);
            return newParcela ? { ...newParcela, paga: p.paga, transactionId: p.transactionId } : p;
        }).filter(p => p.numero <= formData.numeroParcelas!) : parcelas,
    };

    if (isEditing) {
      updateSeguroVeiculo(seguro!.id, finalData);
      toast.success("Seguro atualizado com sucesso!");
    } else {
      addSeguroVeiculo(finalData);
      toast.success("Seguro adicionado com sucesso!");
    }
    onOpenChange(false);
  };
  
  const handleDelete = () => {
    if (seguro && window.confirm("Tem certeza que deseja excluir este seguro? Todas as parcelas serão removidas.")) {
      deleteSeguroVeiculo(seguro.id);
      toast.success("Seguro excluído.");
      onOpenChange(false);
    }
  };
  
  const currentParcelas = useMemo(() => calculateParcelas(formData), [formData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Seguro de Veículo" : "Novo Seguro de Veículo"}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="veiculoId" className="text-right">Veículo</Label>
            <Select 
                value={String(formData.veiculoId || '')} 
                onValueChange={(v) => handleSelectChange('veiculoId', v)}
            >
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                    {veiculos.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>
                            {v.modelo} ({v.marca})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="numeroApolice" className="text-right">Apólice</Label>
            <Input
              id="numeroApolice"
              value={formData.numeroApolice}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="seguradora" className="text-right">Seguradora</Label>
            <Input
              id="seguradora"
              value={formData.seguradora}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="valorTotal" className="text-right">Valor Total</Label>
            <Input
              id="valorTotal"
              type="number"
              inputMode="decimal"
              value={formData.valorTotal}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="numeroParcelas" className="text-right">Parcelas</Label>
            <Input
              id="numeroParcelas"
              type="number"
              inputMode="numeric"
              value={formData.numeroParcelas}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vigenciaInicio" className="text-right">Início Vigência</Label>
            <Input
              id="vigenciaInicio"
              type="date"
              value={formData.vigenciaInicio}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vigenciaFim" className="text-right">Fim Vigência</Label>
            <Input
              id="vigenciaFim"
              type="date"
              value={formData.vigenciaFim}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="col-span-4 border-t pt-2">
            <Label className="text-sm font-medium">Previsão de Parcelas:</Label>
            <div className="mt-1 text-xs text-muted-foreground">
                {formData.numeroParcelas! > 0 && formData.valorTotal! > 0 ? (
                    <p>{formData.numeroParcelas} parcelas de {formatCurrency(currentParcelas[0]?.valor || 0)}</p>
                ) : (
                    <p>Preencha Valor Total e Parcelas.</p>
                )}
            </div>
          </div>
          
        </div>
        
        <DialogFooter className="flex justify-between">
          {isEditing && (
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!formData.veiculoId || !formData.numeroApolice || formData.valorTotal! <= 0}>
            {isEditing ? "Salvar Alterações" : "Adicionar Seguro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}