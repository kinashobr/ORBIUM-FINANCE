"use client";

import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
import { CockpitCards } from "@/components/dashboard/CockpitCards";
import { MovimentacoesRelevantes } from "@/components/dashboard/MovimentacoesRelevantes";
import { AcompanhamentoAtivos } from "@/components/dashboard/AcompanhamentoAtivos";
import { SaudeFinanceira } from "@/components/dashboard/SaudeFinanceira";
import { FluxoCaixaHeatmap } from "@/components/dashboard/FluxoCaixaHeatmap";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges, Categoria } from "@/types/finance";
import { 
  Activity,
  LayoutDashboard
} from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, format, subMonths, subDays, startOfDay, endOfDay } from "date-fns";
import { parseDateLocal } from "@/lib/utils";

const Index = () => {
// ... (omitted logic)

  // 5. Dependência de renda (Comprometimento Fixo: Despesas Fixas / Receitas Totais * 100)
  const despesasFixasPeriodo = useMemo(() => {
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    return transacoesPeriodo1
        .filter(t => {
            const cat = categoriasMap.get(t.categoryId || '') as Categoria | undefined;
            return cat?.nature === 'despesa_fixa';
        })
        .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodo1, categoriasV2]);
  
  const dependenciaRenda = receitasPeriodo1 > 0 ? (despesasFixasPeriodo / receitasPeriodo1) * 100 : 0;

  return (
// ... (rest of the file remains the same)