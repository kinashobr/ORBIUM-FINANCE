import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useState } from "react";
import { VeiculoFormModal } from "@/components/vehicles/VeiculoFormModal"; // Assuming this exists or will be created
import { SeguroVeiculoManager } from "@/components/vehicles/SeguroVeiculoManager"; // New component

const VeiculosSeguros = () => {
  const { veiculos, segurosVeiculo } = useFinance();
  const [showVeiculoModal, setShowVeiculoModal] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<any>(null);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Veículos e Seguros</h1>
            <p className="text-muted-foreground mt-1">Gestão de ativos e passivos relacionados a veículos.</p>
          </div>
          <Button onClick={() => { setEditingVeiculo(null); setShowVeiculoModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Veículo
          </Button>
        </div>

        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Seguros de Veículo</h2>
          <SeguroVeiculoManager />
        </Card>
        
        {/* Placeholder for VeiculoFormModal - assuming it exists */}
        {/* <VeiculoFormModal 
          open={showVeiculoModal}
          onOpenChange={setShowVeiculoModal}
          veiculo={editingVeiculo}
          // ... props
        /> */}
      </div>
    </MainLayout>
  );
};

export default VeiculosSeguros;