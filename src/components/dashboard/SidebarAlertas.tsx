import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  Bell, 
  TrendingDown, 
  CreditCard, 
  Target,
  Settings2,
  ChevronRight,
  X,
  Repeat,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn, parseDateLocal } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { AlertasConfigDialog } from "./AlertasConfigDialog";
import { isAfter, isSameDay, startOfDay } from "date-fns";
import { Categoria } from "@/types/finance"; // Import Categoria type

// ... (omitted ALERTA_INFO and DEFAULT_CONFIG)

interface SidebarAlertasProps {
  collapsed?: boolean;
}

export function SidebarAlertas({ collapsed = false }: SidebarAlertasProps) {
// ... (omitted state and handlers)

  // Calcular métricas
  const metricas = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();

    // 1. Saldo de Liquidez Imediata (Contas Correntes, Poupança, Reserva, Renda Fixa)
// ... (omitted logic)
    
    // 5. Despesas Fixas do Mês (Filtradas pela data de corte)
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    const despesasFixasMes = transacoesFluxo
        .filter(t => {
            const cat = categoriasMap.get(t.categoryId || '') as Categoria | undefined;
            return cat?.nature === 'despesa_fixa';
        })
        .reduce((acc, t) => acc + t.amount, 0);

    // 6. Margem de Poupança (Savings Rate)
// ... (omitted logic)