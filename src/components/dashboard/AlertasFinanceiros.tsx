"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Info, CheckCircle, X, ChevronRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";

interface Alerta {
  id: string;
  tipo: "warning" | "danger" | "info" | "success";
  mensagem: string;
  detalhe?: string;
  data?: string;
}

interface AlertasFinanceirosProps {
  alertas: Alerta[];
  onVerDetalhes?: (alertaId: string) => void;
  onIgnorar?: (alertaId: string) => void;
}

export function AlertasFinanceiros({ alertas: initialAlertas, onVerDetalhes, onIgnorar }: AlertasFinanceirosProps) {
  const { transacoes, emprestimos, categoriasFixas } = useFinance();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alertas = useMemo(() => {
    const hoje = new Date();
    const currentMonth = hoje.getMonth();
    const currentYear = hoje.getFullYear();

    const todasTransacoes = Array.isArray(transacoes) ? transacoes : [];

    const transacoesMes = todasTransacoes.filter(t => {
      if (!t || typeof t.data !== "string") return false;
      const d = new Date(t.data);
      return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const receitasMes = transacoesMes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
    const despesasMes = transacoesMes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

    const alertasDinamicos: Alerta[] = [];

    if (despesasMes > receitasMes) {
      alertasDinamicos.push({
        id: `saldo-negativo:${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`,
        tipo: "danger",
        mensagem: "Saldo negativo no mês",
        detalhe: `Despesas R$ ${despesasMes.toLocaleString("pt-BR")} > Receitas R$ ${receitasMes.toLocaleString("pt-BR")}`,
      });
    }

    const categoriasCand = Array.isArray(categoriasFixas) && categoriasFixas.length > 0
      ? categoriasFixas
      : (() => {
          const mesesParaAnalise = 6;
          const limiteRecorrencia = 2;
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth() - mesesParaAnalise + 1, 1).getTime();
          const freq: Record<string, number> = {};
          todasTransacoes.forEach(t => {
            if (!t || t.tipo !== "despesa" || typeof t.categoria !== "string") return;
            const d = new Date(t.data);
            if (isNaN(d.getTime()) || d.getTime() < start) return;
            freq[t.categoria] = (freq[t.categoria] || 0) + 1;
          });
          return Object.entries(freq).filter(([, c]) => c >= limiteRecorrencia).map(([cat]) => cat);
        })();

    const despesasFixas = transacoesMes
      .filter(t => categoriasCand.includes(t.categoria) && t.tipo === "despesa")
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

    const indiceEndividamento = receitasMes > 0 ? (despesasFixas / receitasMes) * 100 : 0;
    if (indiceEndividamento > 50) {
      alertasDinamicos.push({
        id: `endividamento-alto:${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`,
        tipo: "warning",
        mensagem: "Endividamento acima de 50%",
        detalhe: `Despesas fixas representam ${indiceEndividamento.toFixed(1)}% da renda`,
      });
    }

    const emprestimosArray = Array.isArray(emprestimos) ? emprestimos : [];
    const parseDateFromObj = (e: any): Date | null => {
      if (!e || typeof e !== "object") return null;
      const candidates = ["vencimento", "dueDate", "due_date", "dataVencimento", "vencimentoAt", "vencimento_date"];
      for (const k of candidates) {
        if (typeof e[k] === "string") {
          const d = new Date(e[k]);
          if (!isNaN(d.getTime())) return d;
        }
      }
      if (typeof e.vencimento === "number") {
        const d = new Date(e.vencimento);
        if (!isNaN(d.getTime())) return d;
      }
      return null;
    };

    const proximosVencimentos = emprestimosArray
      .map(e => ({ e, d: parseDateFromObj(e) }))
      .filter(x => x.d instanceof Date && !isNaN(x.d.getTime()) && x.d.getTime() >= Date.now())
      .sort((a, b) => a.d.getTime() - b.d.getTime());

    if (proximosVencimentos.length > 0) {
      const prox = proximosVencimentos[0];
      const id = typeof prox.e.id === "string" ? `emprestimo-vencimento:${prox.e.id}` : `emprestimo-vencimento:${prox.d.getFullYear()}-${String(prox.d.getMonth()+1).padStart(2,"0")}-${String(prox.d.getDate()).padStart(2,"0")}`;
      alertasDinamicos.push({
        id,
        tipo: "info",
        mensagem: "Próximo vencimento de empréstimo",
        detalhe: `Vence em ${prox.d.toLocaleDateString("pt-BR")}`,
        data: prox.d.toISOString(),
      });
    }

    const merged = new Map<string, Alerta>();
    (Array.isArray(initialAlertas) ? initialAlertas : []).forEach(a => merged.set(a.id, a));
    alertasDinamicos.forEach(a => { if (!merged.has(a.id)) merged.set(a.id, a); });

    return Array.from(merged.values());
  }, [transacoes, emprestimos, initialAlertas, categoriasFixas]);

  const visibleAlertas = alertas.filter(a => !dismissed.has(a.id));

  const handleDismiss = (alertaId: string) => {
    setDismissed(prev => new Set(Array.from(prev).concat(alertaId)));
    onIgnorar?.(alertaId);
  };

  const getIcon = (tipo: Alerta["tipo"]) => {
    switch (tipo) {
      case "danger": return AlertTriangle;
      case "warning": return AlertTriangle;
      case "success": return CheckCircle;
      default: return Info;
    }
  };

  const getStyles = (tipo: Alerta["tipo"]) => {
    switch (tipo) {
      case "danger": return "border-l-destructive bg-destructive/10 text-destructive";
      case "warning": return "border-l-warning bg-warning/10 text-warning";
      case "success": return "border-l-success bg-success/10 text-success";
      default: return "border-l-primary bg-primary/10 text-primary";
    }
  };

  if (visibleAlertas.length === 0) {
    return (
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Alertas Financeiros</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <CheckCircle className="h-5 w-5 mr-2 text-success" />
          Nenhum alerta no momento
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Alertas Financeiros</h3>
          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
            {visibleAlertas.length}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
        {visibleAlertas.map((alerta) => {
          const Icon = getIcon(alerta.tipo);
          return (
            <div
              key={alerta.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border-l-4 transition-all hover:scale-[1.01]",
                getStyles(alerta.tipo)
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{alerta.mensagem}</p>
                  {alerta.detalhe && (
                    <p className="text-xs text-muted-foreground mt-0.5">{alerta.detalhe}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onVerDetalhes?.(alerta.id)}
                >
                  Ver <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDismiss(alerta.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
