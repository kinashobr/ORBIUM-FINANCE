import { useMemo, useState, useCallback } from "react";
import {
// ... (omitted imports)
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { ReportCard } from "./ReportCard";
import { ExpandablePanel } from "./ExpandablePanel";
import { IndicatorBadge } from "./IndicatorBadge";
import { DetailedIndicatorBadge } from "./DetailedIndicatorBadge";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ComparisonDateRanges, DateRange } from "@/types/finance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransacaoCompleta, Categoria } from "@/types/finance";

const COLORS = {
// ... (omitted COLORS)
};

const PIE_COLORS = [
// ... (omitted PIE_COLORS)
];

// Define o tipo de status esperado pelos componentes ReportCard e IndicatorBadge
type KPIStatus = "success" | "warning" | "danger" | "neutral";

interface DRETabProps {
  dateRanges: ComparisonDateRanges;
}

// Define formatCurrency outside DRETab so DREItem can use it
const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface DREItemProps {
// ... (omitted DREItemProps)
}

function DREItem({ label, value, type, icon, level = 0 }: DREItemProps) {
// ... (omitted DREItem function)
}

// Custom label component for PieChart to prevent truncation
const CustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
// ... (omitted CustomPieLabel function)
};


export function DRETab({ dateRanges }: DRETabProps) {
  const {
// ... (omitted context destructuring)
  } = useFinance();

  const { range1, range2 } = dateRanges;
  
// ... (omitted formatPercent and now)

  // Helper para filtrar transações por um range específico
  const filterTransactionsByRange = useCallback((range: DateRange) => {
// ... (omitted filterTransactionsByRange function)
  }, [transacoesV2]);

  const transacoesPeriodo1 = useMemo(() => filterTransactionsByRange(range1), [filterTransactionsByRange, range1]);
  const transacoesPeriodo2 = useMemo(() => filterTransactionsByRange(range2), [filterTransactionsByRange, range2]);

  // Função para calcular a DRE de um conjunto de transações
  const calculateDRE = useCallback((transactions: TransacaoCompleta[], range: DateRange) => {
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    const seguroCategory = categoriasV2.find(c => c.label.toLowerCase() === 'seguro');

    // 1. RECEITAS: Apenas operações de 'receita' e 'rendimento'
    const transacoesReceita = transactions.filter(t => 
      t.operationType === 'receita' || t.operationType === 'rendimento'
    );

    const receitasAgrupadas = new Map<string, number>();
    transacoesReceita.forEach(t => {
      const cat = categoriasMap.get(t.categoryId || '') as Categoria | undefined || { label: 'Outras Receitas', nature: 'receita' };
      const key = cat.label;
      receitasAgrupadas.set(key, (receitasAgrupadas.get(key) || 0) + t.amount);
    });

    const receitasPorCategoria: { categoria: string; valor: number; natureza: string }[] = [];
// ... (omitted logic)

    // --- 2b. Filter transactions (Exclude cash insurance payments and asset purchases) ---
    const transacoesDespesaOperacional = transactions.filter(t => 
      (t.operationType === 'despesa') && // FIXED: Exclude 'veiculo' operation type
      t.flow === 'out' &&
      // EXCLUDE cash payments for insurance if they are linked to the 'Seguro' category
      (t.categoryId !== seguroCategory?.id)
    );

    const despesasFixasMap = new Map<string, number>();
    const despesasVariaveisMap = new Map<string, number>();

    transacoesDespesaOperacional.forEach(t => {
      const cat = categoriasMap.get(t.categoryId || '') as Categoria | undefined;
      const catLabel = cat?.label || 'Outras Despesas';
      const nature = cat?.nature || 'despesa_variavel';

      if (nature === 'despesa_fixa') {
        despesasFixasMap.set(catLabel, (despesasFixasMap.get(catLabel) || 0) + t.amount);
      } else {
        despesasVariaveisMap.set(catLabel, (despesasVariaveisMap.get(catLabel) || 0) + t.amount);
      }
    });
// ... (rest of the file remains the same)