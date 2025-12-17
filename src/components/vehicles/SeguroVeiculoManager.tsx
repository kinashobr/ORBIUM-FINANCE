import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Calendar, DollarSign, Repeat, CheckCircle2, Clock } from "lucide-react";
import { SeguroVeiculoFormModal } from "./SeguroVeiculoFormModal";
import { formatCurrency } from "@/types/finance";
import { format, differenceInMonths } from "date-fns";
import { parseDateLocal } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function SeguroVeiculoManager() {
  const { segurosVeiculo, veiculos } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeguro, setEditingSeguro] = useState<any>(null);

  const handleEdit = (seguro: any) => {
    setEditingSeguro(seguro);
    setIsModalOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEditingSeguro(null);
    }
    setIsModalOpen(open);
  };
  
  const getVehicleName = (veiculoId: number) => {
    return veiculos.find(v => v.id === veiculoId)?.modelo || `Veículo ID ${veiculoId}`;
  };
  
  const getStatusBadge = (seguro: SeguroVeiculo) => {
    const totalPaid = seguro.parcelas.filter(p => p.paga).length;
    const totalParcelas = seguro.numeroParcelas;
    
    if (totalPaid === totalParcelas) {
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Quitado</Badge>;
    }
    
    const today = new Date();
    const lastDueDate = parseDateLocal(seguro.parcelas[totalPaid]?.vencimento || seguro.vigenciaFim);
    
    if (lastDueDate < today && totalPaid < totalParcelas) {
        return <Badge variant="destructive" className="gap-1"><Clock className="w-3 h-3" /> Atrasado</Badge>;
    }
    
    return <Badge variant="secondary" className="gap-1">{totalPaid}/{totalParcelas} Pagas</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleEdit(null)} disabled={veiculos.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Seguro
        </Button>
      </div>

      {veiculos.length === 0 && (
        <Card className="p-4 text-center text-sm text-muted-foreground">
            Você precisa adicionar um veículo antes de cadastrar um seguro.
        </Card>
      )}

      {segurosVeiculo.length === 0 && veiculos.length > 0 && (
        <Card className="p-4 text-center text-sm text-muted-foreground">
            Nenhum seguro cadastrado.
        </Card>
      )}

      {segurosVeiculo.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo</TableHead>
                <TableHead>Apólice / Seguradora</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Parcelamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segurosVeiculo.map((seguro) => (
                <TableRow key={seguro.id}>
                  <TableCell className="font-medium">{getVehicleName(seguro.veiculoId)}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{seguro.numeroApolice}</div>
                    <div className="text-xs text-muted-foreground">{seguro.seguradora}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {formatCurrency(seguro.valorTotal)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(parseDateLocal(seguro.vigenciaInicio), 'dd/MM/yyyy')} - {format(parseDateLocal(seguro.vigenciaFim), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {seguro.numeroParcelas}x de {formatCurrency(seguro.parcelas[0]?.valor || 0)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(seguro)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(seguro)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SeguroVeiculoFormModal
        open={isModalOpen}
        onOpenChange={handleOpenChange}
        seguro={editingSeguro}
        veiculos={veiculos}
      />
    </div>
  );
}