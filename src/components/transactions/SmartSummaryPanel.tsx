import { 
// ... (omitted imports)
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TransacaoCompleta, Categoria } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { useMemo } from "react";

interface SmartSummaryPanelProps {
  transacoes: TransacaoCompleta[];
}

export const SmartSummaryPanel = ({ transacoes }: SmartSummaryPanelProps) => {
  const { categoriasV2 } = useFinance();
  const categoriesMap = useMemo(() => new Map(categoriasV2.map(c => [c.id, c])), [categoriasV2]);
  
// ... (omitted logic)

  // Categoria que mais cresceu
  const gastosPorCategoriaMes = transacoesMes
    .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
    .reduce((acc, t) => {
      if (t.categoryId) {
        const label = (categoriesMap.get(t.categoryId) as Categoria | undefined)?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);

  const gastosPorCategoriaMesAnterior = transacoesMesAnterior
    .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
    .reduce((acc, t) => {
      if (t.categoryId) {
        const label = (categoriesMap.get(t.categoryId) as Categoria | undefined)?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);

// ... (omitted logic)

  // Principal origem de receita
  const receitasPorCategoria = transacoesMes
    .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
    .reduce((acc, t) => {
      if (t.categoryId) {
        const label = (categoriesMap.get(t.categoryId) as Categoria | undefined)?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);
  
// ... (omitted logic)

  // Despesas fixas vs variáveis (usando nature da categoria)
  const despesasFixas = transacoesMes
    .filter(t => {
      const cat = t.categoryId ? (categoriesMap.get(t.categoryId) as Categoria | undefined) : null;
      return cat?.nature === 'despesa_fixa';
    })
    .reduce((acc, t) => acc + t.amount, 0);
  const despesasVariaveis = despesasMes - despesasFixas;

// ... (rest of the file remains the same)