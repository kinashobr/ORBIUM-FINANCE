import { useMemo, useCallback } from "react";
import { TrendingUp, TrendingDown, Scale, Wallet, CreditCard, Droplets, ShieldCheck, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { ReportCard } from "./ReportCard";
import { ExpandablePanel } from "./ExpandablePanel";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn, parseDateLocal } from "@/lib/utils";
import { addMonths } from "date-fns";
import { ComparisonDateRanges, DateRange } from "@/types/finance";

const COLORS = { success: "hsl(142, 76%, 36%)", danger: "hsl(0, 72%, 51%)", primary: "hsl(199, 89%, 48%)", accent: "hsl(270, 80% 60%)" };

const formatCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BalancoTab({ dateRanges }: { dateRanges: ComparisonDateRanges }) {
  const { transacoesV2, contasMovimento, getAtivosTotal, getPassivosTotal, calculateBalanceUpToDate, getValorFipeTotal, getSegurosAApropriar, getSegurosAPagar, calculateLoanPrincipalDueInNextMonths, getLoanPrincipalRemaining } = useFinance();
  const { range1, range2 } = dateRanges;

  const calculateBalanco = useCallback((range: DateRange) => {
    const date = range.to || new Date();
    const totalAtivos = getAtivosTotal(date);
    const totalPassivos = getPassivosTotal(date);
    const pl = totalAtivos - totalPassivos;

    const cash = contasMovimento.filter(c => ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType))
      .reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento)), 0);

    const loanShortTerm = calculateLoanPrincipalDueInNextMonths(date, 12);
    const cardDebt = transacoesV2.filter(t => {
      const acc = contasMovimento.find(a => a.id === t.accountId);
      return acc?.accountType === 'cartao_credito' && parseDateLocal(t.date) <= addMonths(date, 1);
    }).reduce((acc, t) => acc + (t.flow === 'out' ? t.amount : -t.amount), 0);

    return { totalAtivos, totalPassivos, pl, cash, curtoPrazo: loanShortTerm + Math.max(0, cardDebt) };
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate, getAtivosTotal, getPassivosTotal, calculateLoanPrincipalDueInNextMonths]);

  const b1 = useMemo(() => calculateBalanco(range1), [calculateBalanco, range1]);
  const b2 = useMemo(() => calculateBalanco(range2), [calculateBalanco, range2]);

  const varPL = b2.pl !== 0 ? ((b1.pl - b2.pl) / Math.abs(b2.pl)) * 100 : 0;
  const varAtivos = b2.totalAtivos !== 0 ? ((b1.totalAtivos - b2.totalAtivos) / Math.abs(b2.totalAtivos)) * 100 : 0;

  const chartData = [
    { name: 'Ativos', p1: b1.totalAtivos, p2: b2.totalAtivos },
    { name: 'Passivos', p1: b1.totalPassivos, p2: b2.totalPassivos },
    { name: 'Patrimônio', p1: b1.pl, p2: b2.pl }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard title="Ativo Total" value={formatCurrency(b1.totalAtivos)} trend={varAtivos} trendLabel="vs P2" status="success" icon={<TrendingUp className="w-5 h-5" />} />
        <ReportCard title="Passivo Total" value={formatCurrency(b1.totalPassivos)} trend={b2.totalPassivos ? ((b1.totalPassivos - b2.totalPassivos)/b2.totalPassivos)*100 : 0} trendLabel="vs P2" status="danger" icon={<TrendingDown className="w-5 h-5" />} />
        <ReportCard title="Patrimônio Líquido" value={formatCurrency(b1.pl)} trend={varPL} trendLabel="vs P2" status={b1.pl >= 0 ? "success" : "danger"} icon={<Scale className="w-5 h-5" />} />
        <ReportCard title="Liquidez Corrente" value={(b1.cash / (b1.curtoPrazo || 1)).toFixed(2) + 'x'} status={b1.cash / (b1.curtoPrazo || 1) > 1.2 ? "success" : "warning"} icon={<Droplets className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpandablePanel title="Estrutura Patrimonial" icon={<ShieldCheck className="w-4 h-4" />}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="p1" name="Período 1" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="p2" name="Período 2" fill={COLORS.accent} radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ExpandablePanel>

        <ExpandablePanel title="Variações de Saldo" icon={<Wallet className="w-4 h-4" />}>
          <Table>
            <TableBody>
              <TableRow className="font-bold bg-muted/20"><TableCell>Item</TableCell><TableCell className="text-right">P1</TableCell><TableCell className="text-right">P2</TableCell></TableRow>
              <TableRow><TableCell>Disponibilidades (Caixa)</TableCell><TableCell className="text-right text-success">{formatCurrency(b1.cash)}</TableCell><TableCell className="text-right opacity-50">{formatCurrency(b2.cash)}</TableCell></TableRow>
              <TableRow><TableCell>Obrigações Curto Prazo</TableCell><TableCell className="text-right text-destructive">{formatCurrency(b1.curtoPrazo)}</TableCell><TableCell className="text-right opacity-50">{formatCurrency(b2.curtoPrazo)}</TableCell></TableRow>
              <TableRow className="font-bold"><TableCell>Capital de Giro Líquido</TableCell><TableCell className="text-right">{formatCurrency(b1.cash - b1.curtoPrazo)}</TableCell><TableCell className="text-right opacity-50">{formatCurrency(b2.cash - b2.curtoPrazo)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </ExpandablePanel>
      </div>
    </div>
  );
}