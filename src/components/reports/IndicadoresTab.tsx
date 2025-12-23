import { useMemo } from "react";
import { Gauge, HeartPulse, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { ExpandablePanel } from "./ExpandablePanel";
import { DetailedIndicatorBadge } from "./DetailedIndicatorBadge";
import { parseDateLocal } from "@/lib/utils";
import { differenceInDays, isWithinInterval, subMonths } from "date-fns";
import { ComparisonDateRanges, DateRange } from "@/types/finance";

export function IndicadoresTab({ dateRanges }: { dateRanges: ComparisonDateRanges }) {
  const { transacoesV2, contasMovimento, getAtivosTotal, getPassivosTotal, calculateBalanceUpToDate } = useFinance();
  const { range1, range2 } = dateRanges;

  const calculateStats = (range: DateRange) => {
    if (!range.from || !range.to) return null;
    const end = range.to;
    const start = range.from;
    const days = Math.max(1, differenceInDays(end, start) + 1);

    const totalAtivos = getAtivosTotal(end);
    const totalPassivos = getPassivosTotal(end);
    const pl = totalAtivos - totalPassivos;

    const liquidAccounts = contasMovimento.filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType));
    const totalCash = liquidAccounts.reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, end, transacoesV2, contasMovimento)), 0);

    const periodRevenue = transacoesV2.filter(t => isWithinInterval(parseDateLocal(t.date), { start, end }) && (t.operationType === 'receita' || t.operationType === 'rendimento')).reduce((acc, t) => acc + t.amount, 0);
    const periodExpense = transacoesV2.filter(t => isWithinInterval(parseDateLocal(t.date), { start, end }) && (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')).reduce((acc, t) => acc + t.amount, 0);

    const savingsRate = periodRevenue > 0 ? ((periodRevenue - periodExpense) / periodRevenue) * 100 : 0;
    const dailyResult = (periodRevenue - periodExpense) / days;

    return { liquidez: totalPassivos > 0 ? totalAtivos / totalPassivos : 99, savingsRate, dailyResult, totalCash, pl, days };
  };

  const s1 = useMemo(() => calculateStats(range1), [range1, transacoesV2, contasMovimento, getAtivosTotal, getPassivosTotal]);
  const s2 = useMemo(() => calculateStats(range2), [range2, transacoesV2, contasMovimento, getAtivosTotal, getPassivosTotal]);

  if (!s1) return null;

  const getTrend = (v1: number, v2: number | undefined) => {
    if (v2 === undefined || v2 === 0) return undefined;
    const p = ((v1 - v2) / Math.abs(v2)) * 100;
    return { percent: p, type: p >= 0 ? "up" as const : "down" as const };
  };

  return (
    <div className="space-y-6">
      <ExpandablePanel title="Performance e Tendência" icon={<TrendingUp className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DetailedIndicatorBadge 
            title="Taxa de Poupança" 
            value={s1.savingsRate.toFixed(1) + '%'} 
            status={s1.savingsRate > 20 ? "success" : "warning"} 
            trend={s2 ? (s1.savingsRate >= s2.savingsRate ? "up" : "down") : undefined}
            trendLabel={s2 ? `${(s1.savingsRate - s2.savingsRate).toFixed(1)}% vs P2` : undefined}
            descricao="Eficiência em reter capital." 
            formula="(Receita - Despesa) / Receita" 
          />
          <DetailedIndicatorBadge 
            title="Resultado Diário" 
            value={'R$ ' + s1.dailyResult.toFixed(0)} 
            status={s1.dailyResult > 0 ? "success" : "danger"} 
            trend={s2 ? (s1.dailyResult >= s2.dailyResult ? "up" : "down") : undefined}
            trendLabel={s2 ? `${getTrend(s1.dailyResult, s2.dailyResult)?.percent.toFixed(1)}% vs P2` : undefined}
            descricao="Geração de caixa média por dia." 
            formula="Resultado Líquido / Dias Período" 
          />
          <DetailedIndicatorBadge 
            title="Solvência Geral" 
            value={s1.liquidez.toFixed(2) + 'x'} 
            status={s1.liquidez > 2 ? "success" : "danger"} 
            trend={s2 ? (s1.liquidez >= s2.liquidez ? "up" : "down") : undefined}
            trendLabel={s2 ? `${getTrend(s1.liquidez, s2.liquidez)?.percent.toFixed(1)}% vs P2` : undefined}
            descricao="Cobertura total de dívidas." 
            formula="Ativos / Passivos" 
          />
        </div>
      </ExpandablePanel>

      <ExpandablePanel title="Análise de Capital Próprio" icon={<Percent className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailedIndicatorBadge 
            title="Variação Patrimonial" 
            value={'R$ ' + (s1.pl - (s2?.pl || s1.pl)).toLocaleString()} 
            status={(s1.pl - (s2?.pl || s1.pl)) >= 0 ? "success" : "danger"} 
            descricao="Crescimento nominal do patrimônio líquido entre os períodos." 
            formula="PL P1 - PL P2" 
          />
          <DetailedIndicatorBadge 
            title="Margem de Segurança" 
            value={((s1.totalCash / s1.pl) * 100).toFixed(1) + '%'} 
            status="neutral" 
            descricao="Percentual do patrimônio mantido em alta liquidez." 
            formula="Caixa / Patrimônio Líquido" 
          />
        </div>
      </ExpandablePanel>
    </div>
  );
}