import { useMemo, useCallback } from "react";
import {
// ... (omitted imports)
} from "lucide-react";
import {
// ... (omitted imports)
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { ReportCard } from "./ReportCard";
import { ExpandablePanel } from "./ExpandablePanel";
import { IndicatorBadge } from "./IndicatorBadge";
import { DetailedIndicatorBadge } from "./DetailedIndicatorBadge";
import {
  Table,
// ... (omitted imports)
} from "@/components/ui/table";
import { cn, parseDateLocal } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS } from "@/types/finance";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, subDays, startOfDay, endOfDay, addMonths, isBefore, isAfter, isSameDay, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ComparisonDateRanges, DateRange, Categoria } from "@/types/finance";
import { ContaCorrente, TransacaoCompleta } from "@/types/finance";
import { EvolucaoPatrimonialChart } from "@/components/dashboard/EvolucaoPatrimonialChart"; // ADDED IMPORT

const COLORS = {
// ... (omitted COLORS)
};

const PIE_COLORS = [
// ... (omitted PIE_COLORS)
];

// Define o tipo de status esperado pelo IndicatorBadge
type IndicatorStatus = "success" | "warning" | "danger" | "neutral";

interface BalancoTabProps {
  dateRanges: ComparisonDateRanges;
}

// Custom label component for PieChart to prevent truncation
const CustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
// ... (omitted CustomPieLabel function)
};

export function BalancoTab({ dateRanges }: BalancoTabProps) {
// ... (omitted context destructuring)
  } = useFinance();

  const { range1, range2 } = dateRanges;

// ... (omitted filterTransactionsByRange and calculatePercentChange)

  // Função para calcular a soma das parcelas de empréstimo que vencem DENTRO de um range
// ... (omitted calculateLoanInstallmentsInPeriod function)

  // NOVO: Função para calcular a soma das parcelas de seguro que vencem DENTRO de um range
// ... (omitted calculateSeguroInstallmentsInPeriod function)

  // Cálculos do Balanço Patrimonial para um período
  const calculateBalanco = useCallback((range: DateRange) => {
// ... (omitted logic)
    // Se não houver data final, usamos o saldo atual (fim do histórico)
    const finalDate = targetDate || new Date(9999, 11, 31);

    // 1. Calcular saldos das contas na data final do período
    const saldosPorConta = calculateFinalBalances(transacoesV2, periodStart, finalDate);

    // === ATIVOS ===
// ... (omitted logic)