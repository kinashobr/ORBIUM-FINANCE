import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Veiculo } from "@/types/finance";

interface VeiculoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo?: Veiculo;
}

export function VeiculoFormModal({ open, onOpenChange }: VeiculoFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciamento de Veículo (Em Construção)</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Este modal será implementado para gerenciar a compra, venda e dados cadastrais do veículo.
        </p>
      </DialogContent>
    </Dialog>
  );
}