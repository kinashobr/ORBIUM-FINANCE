import { useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Plus,
  Minus,
  Percent,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { ReportCard } from "./ReportCard";
import { ExpandablePanel } from "./ExpandablePanel";
import { cn, parseDateLocal } from "@/lib/utils";
import { startOfDay, endOfDay, isWithinInterval, differenceInDays } from "date-fns";
import { ComparisonDateRanges, DateRange } from "@/types/finance";

const COLORS = {
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 72%, 51%)",
  primary: "hsl(199, 89%, 48%)",
  accent: "hsl(270, 80% 60%)",
};

const PIE_COLORS = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.warning, "hsl(45, 93%, 47%)", "hsl(180, 70%, 50%)", COLORS.danger];

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface DREItemProps {
  label: string;
  value1: number;
  value2?: number;
  type: 'receita' | 'despesa' | 'subtotal' | 'resultado';
  icon?: React.ReactNode;
  level?: number;
}

function DREItem({ label, value1, value2, type, icon, level = 0 }: DREItemProps) {
  const diff = value2 !== undefined ? value1 - value2 : 0;
  const percent = value2 ? (diff / Math.abs(value2)) * 100 : 0;
  
  const typeClasses = {
    receita: "text-success",
    despesa: "text-destructive",
    subtotal: "font-semibold bg-muted/30 border-t border-b border-border/80",
    resultado: "font-bold text-lg bg-primary/10 border-t-2 border-b-2 border-primary/50",
  };
  
  return (
    <div className={cn("flex items-center justify-between py-2 px-4 border-b border-border/50", typeClasses[type], level > 0 && `pl-${4 + level * 4}`)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        {value2 !== undefined && (
          <span className="text-xs text-muted-foreground line-through opacity-50">
            {formatCurrency(value2)}
          </span>
        )}
        <div className="text-right">
          <span className="font-medium block">{formatCurrency(value1)}</span>
          {value2 !== undefined && (
            <span className={cn("text-[10px] font-bold", percent > 0 ? (type === 'receita' ? "text-success" : "text-destructive") : (type === 'receita' ? "text-destructive" : "text-success"))}>
              {percent > 0 ? '▲' : '▼'} {Math.abs(percent).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DRETab({ dateRanges }: { dateRanges: ComparisonDateRanges }) {
  const { transacoesV2, categoriasV2, segurosVeiculo, calculateLoanSchedule } = useFinance();
  const { range1, range2 } = dateRanges;

  const calculateDRE = useCallback((range: DateRange) => {
    if (!range.from || !range.to) return null;
    const start = startOfDay(range.from);
    const end = endOfDay(range.to);
    const days = Math.max(1, differenceInDays(end, start) + 1);

    const transactions = transacoesV2.filter(t => isWithinInterval(parseDateLocal(t.date), { start, end }));
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    const seguroCategory = categoriasV2.find(c => c.label.toLowerCase() === 'seguro');

    let accruedInsurance = 0;
    segurosVeiculo.forEach(s => {
      const vStart = parseDateLocal(s.vigenciaInicio);
      const vEnd = parseDateLocal(s.vigenciaFim);
      const totalDays = differenceInDays(vEnd, vStart) + 1;
      if (totalDays <= 0) return;
      const dailyRate = s.valorTotal / totalDays;
      const overlapStart = vStart > start ? vStart : start;
      const overlapEnd = vEnd < end ? vEnd : end;
      if (overlapStart <= overlapEnd) accruedInsurance += dailyRate * (differenceInDays(overlapEnd, overlapStart) + 1);
    });

    const receitas = transactions.filter(t => t.operationType === 'receita' || t.operationType === 'rendimento');
    const totalReceitas = receitas.reduce((acc, t) => acc + t.amount, 0);

    const despesasFixasMap = new Map<string, number>();
    const despesasVariaveisMap = new Map<string, number>();

    transactions.filter(t => t.operationType === 'despesa' && t.categoryId !== seguroCategory?.id).forEach(t => {
      const cat = categoriasMap.get(t.categoryId || '');
      const label = cat?.label || 'Outros';
      const targetMap = cat?.nature === 'despesa_fixa' ? despesasFixasMap : despesasVariaveisMap;
      targetMap.set(label, (targetMap.get(label) || 0) + t.amount);
    });

    if (accruedInsurance > 0) despesasFixasMap.set('Seguros (Apropriação)', (despesasFixasMap.get('Seguros (Apropriação)') || 0) + accruedInsurance);

    let jurosEmprestimos = 0;
    transactions.filter(t => t.operationType === 'pagamento_emprestimo').forEach(t => {
      const loanId = parseInt(t.links?.loanId?.replace('loan_', '') || '');
      const parcela = parseInt(t.links?.parcelaId || '');
      if (!isNaN(loanId) && !isNaN(parcela)) {
        const item = calculateLoanSchedule(loanId).find(i => i.parcela === parcela);
        if (item) jurosEmprestimos += item.juros;
      }
    });

    const totalFixas = Array.from(despesasFixasMap.values()).reduce((a, b) => a + b, 0);
    const totalVariaveis = Array.from(despesasVariaveisMap.values()).reduce((a, b) => a + b, 0);
    const resultadoLiquido = totalReceitas - totalFixas - totalVariaveis - jurosEmprestimos;

    return {
      totalReceitas, totalFixas, totalVariaveis, jurosEmprestimos, resultadoLiquido, days,
      receitasMap: receitas.reduce((acc, t) => {
        const label = categoriasMap.get(t.categoryId || '')?.label || 'Outros';
        acc.set(label, (acc.get(label) || 0) + t.amount);
        return acc;
      }, new Map<string, number>()),
      fixasMap: despesasFixasMap,
      variaveisMap: despesasVariaveisMap
    };
  }, [transacoesV2, categoriasV2, segurosVeiculo, calculateLoanSchedule]);

  const dre1 = useMemo(() => calculateDRE(range1), [calculateDRE, range1]);
  const dre2 = useMemo(() => calculateDRE(range2), [calculateDRE, range2]);

  const comparison = useMemo(() => {
    if (!dre1 || !dre2) return null;
    const factor = dre1.days / dre2.days;
    const normValue = (val: number) => val * factor;
    return {
      receita: { v1: dre1.totalReceitas, v2: normValue(dre2.totalReceitas) },
      despesa: { v1: dre1.totalFixas + dre1.totalVariaveis, v2: normValue(dre2.totalFixas + dre2.totalVariaveis) },
      resultado: { v1: dre1.resultadoLiquido, v2: normValue(dre2.resultadoLiquido) }
    };
  }, [dre1, dre2]);

  if (!dre1) return null;

  const mixData = [
    { name: 'Fixas', p1: dre1.totalFixas, p2: comparison?.despesa.v2 ? (dre2?.totalFixas || 0) * (dre1.days / (dre2?.days || 1)) : 0 },
    { name: 'Variáveis', p1: dre1.totalVariaveis, p2: comparison?.despesa.v2 ? (dre2?.totalVariaveis || 0) * (dre1.days / (dre2?.days || 1)) : 0 },
    { name: 'Juros', p1: dre1.jurosEmprestimos, p2: comparison?.despesa.v2 ? (dre2?.jurosEmprestimos || 0) * (dre1.days / (dre2?.days || 1)) : 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportCard title="Receita (Normalizada)" value={formatCurrency(dre1.totalReceitas)} trend={comparison ? ((dre1.totalReceitas - comparison.receita.v2) / Math.abs(comparison.receita.v2)) * 100 : undefined} trendLabel="vs P2" status="success" icon={<TrendingUp className="w-5 h-5" />} />
        <ReportCard title="Despesa (Normalizada)" value={formatCurrency(dre1.totalFixas + dre1.totalVariaveis)} trend={comparison ? (( (dre1.totalFixas + dre1.totalVariaveis) - comparison.despesa.v2) / Math.abs(comparison.despesa.v2)) * 100 : undefined} trendLabel="vs P2" status="danger" icon={<TrendingDown className="w-5 h-5" />} />
        <ReportCard title="Resultado Líquido" value={formatCurrency(dre1.resultadoLiquido)} trend={comparison ? ((dre1.resultadoLiquido - comparison.resultado.v2) / Math.abs(comparison.resultado.v2)) * 100 : undefined} trendLabel="vs P2" status={dre1.resultadoLiquido >= 0 ? "success" : "danger"} icon={<DollarSign className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpandablePanel title="DRE Comparativa" subtitle="Valores de P2 normalizados pela duração de P1" icon={<Receipt className="w-4 h-4" />}>
          <div className="glass-card p-0">
            <DREItem label="RECEITA BRUTA" value1={dre1.totalReceitas} value2={comparison?.receita.v2} type="receita" icon={<Plus className="w-4 h-4" />} />
            <DREItem label="(-) DESPESAS FIXAS" value1={dre1.totalFixas} value2={dre2 ? dre2.totalFixas * (dre1.days / dre2.days) : undefined} type="despesa" icon={<Minus className="w-4 h-4" />} />
            <DREItem label="(-) DESPESAS VARIÁVEIS" value1={dre1.totalVariaveis} value2={dre2 ? dre2.totalVariaveis * (dre1.days / dre2.days) : undefined} type="despesa" icon={<Minus className="w-4 h-4" />} />
            <DREItem label="(-) JUROS" value1={dre1.jurosEmprestimos} value2={dre2 ? dre2.jurosEmprestimos * (dre1.days / dre2.days) : undefined} type="despesa" icon={<CreditCard className="w-4 h-4" />} />
            <DREItem label="RESULTADO LÍQUIDO" value1={dre1.resultadoLiquido} value2={comparison?.resultado.v2} type="resultado" icon={<DollarSign className="w-4 h-4" />} />
          </div>
        </ExpandablePanel>

        <ExpandablePanel title="Mix de Gastos (P1 vs P2)" icon={<Percent className="w-4 h-4" />}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="p1" name="Período 1" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="p2" name="Período 2 (Norm.)" fill={COLORS.accent} radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ExpandablePanel>
      </div>
    </div>
  );
}