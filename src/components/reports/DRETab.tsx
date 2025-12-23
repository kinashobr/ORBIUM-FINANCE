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
  ChevronRight,
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

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface DREItemProps {
  label: string;
  value1: number;
  value2?: number;
  type: 'receita' | 'despesa' | 'subtotal' | 'resultado';
  icon?: React.ReactNode;
  level?: number;
  isHeader?: boolean;
}

function DREItem({ label, value1, value2, type, icon, level = 0, isHeader = false }: DREItemProps) {
  const diff = value2 !== undefined ? value1 - value2 : 0;
  const percent = value2 && value2 !== 0 ? (diff / Math.abs(value2)) * 100 : 0;
  
  const typeClasses = {
    receita: "text-success",
    despesa: "text-destructive",
    subtotal: "font-semibold bg-muted/30 border-t border-b border-border/80",
    resultado: "font-bold text-lg bg-primary/10 border-t-2 border-b-2 border-primary/50",
  };
  
  return (
    <div className={cn(
      "flex items-center justify-between py-2 px-4 border-b border-border/50 transition-colors hover:bg-muted/10", 
      typeClasses[type], 
      level > 0 && "pl-8",
      isHeader && "bg-muted/20 font-bold uppercase text-[10px] tracking-wider text-muted-foreground"
    )}>
      <div className="flex items-center gap-2">
        {icon}
        <span className={cn("text-sm", isHeader && "text-muted-foreground")}>{label}</span>
      </div>
      <div className="flex items-center gap-6">
        {value2 !== undefined && (
          <div className="text-right w-24 opacity-40">
            <span className="text-xs block">{formatCurrency(value2)}</span>
          </div>
        )}
        <div className="text-right w-32">
          <span className="font-medium block">{formatCurrency(value1)}</span>
          {value2 !== undefined && value2 !== 0 && (
            <span className={cn(
              "text-[10px] font-bold", 
              percent > 0 
                ? (type === 'receita' ? "text-success" : "text-destructive") 
                : (type === 'receita' ? "text-destructive" : "text-success")
            )}>
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

    // Apropriação de Seguros
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
    const norm = (val: number) => val * factor;
    
    return {
      receita: norm(dre2.totalReceitas),
      fixas: norm(dre2.totalFixas),
      variaveis: norm(dre2.totalVariaveis),
      juros: norm(dre2.jurosEmprestimos),
      resultado: norm(dre2.resultadoLiquido),
      receitasMap: new Map(Array.from(dre2.receitasMap.entries()).map(([k, v]) => [k, norm(v)])),
      fixasMap: new Map(Array.from(dre2.fixasMap.entries()).map(([k, v]) => [k, norm(v)])),
      variaveisMap: new Map(Array.from(dre2.variaveisMap.entries()).map(([k, v]) => [k, norm(v)]))
    };
  }, [dre1, dre2]);

  if (!dre1) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportCard title="Receita Bruta" value={formatCurrency(dre1.totalReceitas)} trend={comparison ? ((dre1.totalReceitas - comparison.receita) / Math.abs(comparison.receita)) * 100 : undefined} trendLabel="vs P2" status="success" icon={<TrendingUp className="w-5 h-5" />} />
        <ReportCard title="Despesa Total" value={formatCurrency(dre1.totalFixas + dre1.totalVariaveis + dre1.jurosEmprestimos)} trend={comparison ? (((dre1.totalFixas + dre1.totalVariaveis + dre1.jurosEmprestimos) - (comparison.fixas + comparison.variaveis + comparison.juros)) / Math.abs(comparison.fixas + comparison.variaveis + comparison.juros)) * 100 : undefined} trendLabel="vs P2" status="danger" icon={<TrendingDown className="w-5 h-5" />} />
        <ReportCard title="Resultado Líquido" value={formatCurrency(dre1.resultadoLiquido)} trend={comparison ? ((dre1.resultadoLiquido - comparison.resultado) / Math.abs(comparison.resultado)) * 100 : undefined} trendLabel="vs P2" status={dre1.resultadoLiquido >= 0 ? "success" : "danger"} icon={<DollarSign className="w-5 h-5" />} />
      </div>

      <ExpandablePanel title="Demonstrativo de Resultado Detalhado" subtitle="Comparação de categorias (P2 normalizado)" icon={<Receipt className="w-4 h-4" />}>
        <div className="glass-card p-0 overflow-hidden">
          {/* Cabeçalho da Tabela */}
          <div className="flex items-center justify-between py-2 px-4 bg-muted/50 border-b border-border font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Descrição da Conta</span>
            <div className="flex gap-6">
              <span className="w-24 text-right">P2 (Norm.)</span>
              <span className="w-32 text-right">Período 1</span>
            </div>
          </div>

          {/* RECEITAS */}
          <DREItem label="RECEITAS OPERACIONAIS" value1={dre1.totalReceitas} value2={comparison?.receita} type="subtotal" icon={<Plus className="w-4 h-4 text-success" />} />
          {Array.from(dre1.receitasMap.entries()).map(([label, val]) => (
            <DREItem key={label} label={label} value1={val} value2={comparison?.receitasMap.get(label)} type="receita" level={1} />
          ))}

          {/* DESPESAS FIXAS */}
          <DREItem label="DESPESAS FIXAS (ESTRUTURA)" value1={dre1.totalFixas} value2={comparison?.fixas} type="subtotal" icon={<Minus className="w-4 h-4 text-destructive" />} />
          {Array.from(dre1.fixasMap.entries()).map(([label, val]) => (
            <DREItem key={label} label={label} value1={val} value2={comparison?.fixasMap.get(label)} type="despesa" level={1} />
          ))}

          {/* DESPESAS VARIÁVEIS */}
          <DREItem label="DESPESAS VARIÁVEIS (CONSUMO)" value1={dre1.totalVariaveis} value2={comparison?.variaveis} type="subtotal" icon={<Minus className="w-4 h-4 text-destructive" />} />
          {Array.from(dre1.variaveisMap.entries()).map(([label, val]) => (
            <DREItem key={label} label={label} value1={val} value2={comparison?.variaveisMap.get(label)} type="despesa" level={1} />
          ))}

          {/* FINANCEIRO */}
          <DREItem label="RESULTADO FINANCEIRO (JUROS)" value1={dre1.jurosEmprestimos} value2={comparison?.juros} type="subtotal" icon={<CreditCard className="w-4 h-4 text-orange-500" />} />
          <DREItem label="Juros de Empréstimos/Financ." value1={dre1.jurosEmprestimos} value2={comparison?.juros} type="despesa" level={1} />

          {/* RESULTADO FINAL */}
          <DREItem label="LUCRO / PREJUÍZO LÍQUIDO" value1={dre1.resultadoLiquido} value2={comparison?.resultado} type="resultado" icon={<ArrowRight className="w-5 h-5" />} />
        </div>
      </ExpandablePanel>
    </div>
  );
}