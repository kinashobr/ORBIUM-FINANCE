import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
import { PatrimonioCards } from "@/components/dashboard/PatrimonioCards";
import { EvolucaoPatrimonialChart } from "@/components/dashboard/EvolucaoPatrimonialChart";
import { FluxoCaixaHeatmap } from "@/components/dashboard/FluxoCaixaHeatmap";
import { IndicadoresFinanceiros } from "@/components/dashboard/IndicadoresFinanceiros";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AlertasFinanceiros } from "@/components/dashboard/AlertasFinanceiros";
import { TabelaConsolidada } from "@/components/dashboard/TabelaConsolidada";
import { ObjetivosCards } from "@/components/dashboard/ObjetivosCards";
import { DistribuicaoCharts } from "@/components/dashboard/DistribuicaoCharts";
import { TransacoesRecentes } from "@/components/dashboard/TransacoesRecentes";
import { DashboardCustomizer, DashboardSection } from "@/components/dashboard/DashboardCustomizer";
import { PeriodSelector, DateRange } from "@/components/dashboard/PeriodSelector";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { Transacao } from "@/types/finance"; // Importando Transacao do types/finance

const defaultSections: DashboardSection[] = [
  { id: "patrimonio-cards", nome: "Cards de Patrimônio", visivel: true, ordem: 0 },
  { id: "quick-actions", nome: "Ações Rápidas", visivel: true, ordem: 1 },
  { id: "heatmap", nome: "Fluxo de Caixa Mensal", visivel: true, ordem: 2 },
  { id: "evolucao-chart", nome: "Evolução Patrimonial", visivel: true, ordem: 3 },
  { id: "transacoes-recentes", nome: "Transações Recentes", visivel: true, ordem: 4 },
  { id: "indicadores", nome: "Indicadores Financeiros", visivel: false, ordem: 5 },
  { id: "tabela-consolidada", nome: "Tabela Consolidada", visivel: false, ordem: 6 },
  { id: "objetivos", nome: "Objetivos Financeiros", visivel: false, ordem: 7 },
  { id: "distribuicao-charts", nome: "Gráficos de Distribuição", visivel: false, ordem: 8 },
];

const Index = () => {
  const { transacoesV2, emprestimos, veiculos, investimentosRF, criptomoedas, stablecoins, objetivos, getTotalReceitas, getTotalDespesas, getAtivosTotal, getPassivosTotal, getPatrimonioLiquido } = useFinance();
  const [sections, setSections] = useState<DashboardSection[]>(defaultSections);
  const [layout, setLayout] = useState<"2col" | "3col" | "fluid">("fluid");
  
  // Inicializa o range para o mês atual
  const now = new Date();
  const initialRange: DateRange = { from: startOfMonth(now), to: endOfMonth(now) };
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  const handlePeriodChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  // NOTE: Transacoes legadas (V1) não existem mais no contexto. 
  // Usamos transacoesV2 e mapeamos para o formato legado se necessário.
  // Para TransacoesRecentes, precisamos de um array de Transacao (V1).
  
  // Mapeamento simplificado de transacoesV2 para Transacao (V1) para compatibilidade
  const transacoesV1Simuladas: Transacao[] = useMemo(() => {
    return transacoesV2.map(t => ({
      id: parseInt(t.id.replace('tx_', '')) || 0,
      data: t.date,
      descricao: t.description,
      valor: t.amount,
      categoria: t.categoryId || 'Outros', // Usando ID da categoria V2
      tipo: (t.flow === 'in' || t.flow === 'transfer_in') ? 'receita' : 'despesa',
    }));
  }, [transacoesV2]);

  const filteredTransacoes = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return transacoesV1Simuladas;
    
    return transacoesV1Simuladas.filter(t => {
      const transactionDate = new Date(t.data);
      return isWithinInterval(transactionDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [transacoesV1Simuladas, dateRange]);

  // Filtra transacoesV2 para o heatmap (que precisa de transacoesV2)
  const filteredTransacoesV2 = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return transacoesV2;
    
    return transacoesV2.filter(t => {
      const transactionDate = new Date(t.date);
      return isWithinInterval(transactionDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [transacoesV2, dateRange]);

  const totalReceitas = useMemo(() => {
    return filteredTransacoes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const totalDespesas = useMemo(() => {
    return filteredTransacoes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const receitasMes = useMemo(() => {
    const now = new Date();
    return filteredTransacoes
      .filter(t => t.tipo === "receita" && new Date(t.data).getMonth() === now.getMonth() && new Date(t.data).getFullYear() === now.getFullYear())
      .reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const despesasMes = useMemo(() => {
    const now = new Date();
    return filteredTransacoes
      .filter(t => t.tipo === "despesa" && new Date(t.data).getMonth() === now.getMonth() && new Date(t.data).getFullYear() === now.getFullYear())
      .reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const totalInvestimentos = useMemo(() => {
    const rf = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0);
    const cripto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const stable = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objs = objetivos.reduce((acc, o) => acc + o.atual, 0);
    return rf + cripto + stable + objs;
  }, [investimentosRF, criptomoedas, stablecoins, objetivos]);

  const totalDividas = useMemo(() => {
    return emprestimos.reduce((acc, e) => acc + e.valorTotal * 0.7, 0);
  }, [emprestimos]);

  const patrimonioData = useMemo(() => ({
    patrimonioTotal: totalInvestimentos + veiculos.reduce((acc, v) => acc + v.valorFipe, 0),
    saldoCaixa: totalReceitas - totalDespesas,
    investimentosTotal: totalInvestimentos,
    dividasTotal: totalDividas,
    patrimonioLiquido: totalInvestimentos - totalDividas,
    variacaoMes: 5.2,
    fluxoCaixa: receitasMes - despesasMes,
    gastosMes: despesasMes,
    receitasMes: receitasMes,
  }), [totalInvestimentos, veiculos, totalReceitas, totalDespesas, totalDividas, receitasMes, despesasMes]);

  const evolucaoData = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return meses.slice(0, 12).map((mes, i) => {
      const mesNum = String(i + 1).padStart(2, "0");
      const receitas = filteredTransacoes
        .filter(t => t.tipo === "receita" && t.data.includes(`-${mesNum}-`))
        .reduce((acc, t) => acc + t.valor, 0);
      const despesas = filteredTransacoes
        .filter(t => t.tipo === "despesa" && t.data.includes(`-${mesNum}-`))
        .reduce((acc, t) => acc + t.valor, 0);
      
      const patrimonioTotal = totalInvestimentos + veiculos.reduce((acc, v) => acc + v.valorFipe, 0);
      
      return {
        mes,
        patrimonioTotal,
        receitas,
        despesas,
        investimentos: totalInvestimentos,
        dividas: Math.max(totalDividas, 0),
      };
    });
  }, [filteredTransacoes, totalInvestimentos, veiculos, totalDividas]);

  const indicadores = useMemo(() => [
    {
      id: "liquidez",
      nome: "Liquidez Imediata",
      valor: 1.8,
      formato: "decimal" as const,
      limites: { bom: 1.5, atencao: 1.0 },
      formula: "(Stables + RF D+0) / Passivo Circulante"
    },
    {
      id: "solvencia",
      nome: "Solvência",
      valor: 2.2,
      formato: "decimal" as const,
      limites: { bom: 2.0, atencao: 1.5 },
      formula: "Ativo Total / Passivo Total"
    },
    {
      id: "endividamento",
      nome: "Endividamento",
      valor: 28,
      formato: "percent" as const,
      limites: { bom: 30, atencao: 50 },
      inverso: true,
      formula: "Passivo Total / Ativo Total × 100"
    },
    {
      id: "rentabilidade",
      nome: "Rentab. Investimentos",
      valor: 12.5,
      formato: "percent" as const,
      limites: { bom: 10, atencao: 6 },
      formula: "Rendimentos / Capital Investido × 100"
    },
    {
      id: "cresc-receitas",
      nome: "Cresc. Receitas",
      valor: 8.2,
      formato: "percent" as const,
      limites: { bom: 5, atencao: 0 },
      formula: "(Receitas Atual - Anterior) / Anterior × 100"
    },
    {
      id: "cresc-despesas",
      nome: "Cresc. Despesas",
      valor: 3.5,
      formato: "percent" as const,
      limites: { bom: 5, atencao: 10 },
      inverso: true,
      formula: "(Despesas Atual - Anterior) / Anterior × 100"
    },
    {
      id: "margem-poupanca",
      nome: "Margem Poupança",
      valor: 22,
      formato: "percent" as const,
      limites: { bom: 20, atencao: 10 },
      formula: "(Receitas - Despesas) / Receitas × 100"
    },
    {
      id: "expo-cripto",
      nome: "Exposição Cripto",
      valor: 18,
      formato: "percent" as const,
      limites: { bom: 20, atencao: 30 },
      inverso: true,
      formula: "Cripto / Patrimônio Total × 100"
    },
    {
      id: "peso-rf",
      nome: "Peso Renda Fixa",
      valor: 45,
      formato: "percent" as const,
      limites: { bom: 40, atencao: 20 },
      formula: "RF / Patrimônio Total × 100"
    },
    {
      id: "peso-rv",
      nome: "Peso Renda Variável",
      valor: 12,
      formato: "percent" as const,
      limites: { bom: 15, atencao: 30 },
      inverso: true,
      formula: "(Cripto + Ações) / Patrimônio Total × 100"
    },
  ], []);

  const tabelaConsolidada = useMemo(() => {
    const rfTotal = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0);
    const criptoTotal = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const stablesTotal = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objetivosTotal = objetivos.reduce((acc, o) => acc + o.atual, 0);
    const caixa = totalReceitas - totalDespesas;
    const total = rfTotal + criptoTotal + stablesTotal + objetivosTotal + caixa;
    
    return [
      {
        id: "rf",
        categoria: "Renda Fixa",
        valor: rfTotal,
        percentual: (rfTotal / total) * 100,
        rentabilidade: 12.5,
        volatilidade: "Baixa",
        risco: "A"
      },
      {
        id: "cripto",
        categoria: "Criptomoedas",
        valor: criptoTotal,
        percentual: (criptoTotal / total) * 100,
        rentabilidade: 45.2,
        volatilidade: "Alta",
        risco: "C"
      },
      {
        id: "stables",
        categoria: "Stablecoins",
        valor: stablesTotal,
        percentual: (stablesTotal / total) * 100,
        rentabilidade: 0,
        volatilidade: "Baixa",
        risco: "A"
      },
      {
        id: "objetivos",
        categoria: "Objetivos",
        valor: objetivosTotal,
        percentual: (objetivosTotal / total) * 100,
        rentabilidade: 11.8,
        volatilidade: "Baixa",
        risco: "B"
      },
      {
        id: "caixa",
        categoria: "Caixa",
        valor: caixa,
        percentual: (caixa / total) * 100,
        rentabilidade: 0,
        volatilidade: "Baixa",
        risco: "A"
      },
    ];
  }, [investimentosRF, criptomoedas, stablecoins, objetivos, totalReceitas, totalDespesas]);

  const distribuicaoPorClasse = useMemo(() => [
    {
      nome: "Renda Fixa",
      valor: investimentosRF.reduce((acc, inv) => acc + inv.valor, 0),
      cor: "hsl(199, 89%, 48%)"
    },
    {
      nome: "Cripto",
      valor: criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0),
      cor: "hsl(270, 100%, 65%)"
    },
    {
      nome: "Stables",
      valor: stablecoins.reduce((acc, s) => acc + s.valorBRL, 0),
      cor: "hsl(142, 76%, 36%)"
    },
    {
      nome: "Objetivos",
      valor: objetivos.reduce((acc, o) => acc + o.atual, 0),
      cor: "hsl(38, 92%, 50%)"
    },
    {
      nome: "Caixa",
      valor: Math.max(totalReceitas - totalDespesas, 0),
      cor: "hsl(210, 100%, 60%)"
    },
  ], [investimentosRF, criptomoedas, stablecoins, objetivos, totalReceitas, totalDespesas]);

  const distribuicaoPorRisco = useMemo(() => {
    const baixo = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) + stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const medio = objetivos.reduce((acc, o) => acc + o.atual, 0);
    const alto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) * 0.5;
    const especulativo = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) * 0.5;
    
    return [
      {
        nome: "Baixo",
        valor: baixo,
        cor: "hsl(142, 76%, 36%)"
      },
      {
        nome: "Médio",
        valor: medio,
        cor: "hsl(199, 89%, 48%)"
      },
      {
        nome: "Alto",
        valor: alto,
        cor: "hsl(38, 92%, 50%)"
      },
      {
        nome: "Especulativo",
        valor: especulativo,
        cor: "hsl(0, 72%, 51%)"
      },
    ];
  }, [investimentosRF, stablecoins, objetivos, criptomoedas]);

  const handleResetCustomization = () => {
    setSections(defaultSections);
    setLayout("fluid");
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "patrimonio-cards":
        return <PatrimonioCards data={patrimonioData} />;
      case "quick-actions":
        return <QuickActions />;
      case "evolucao-chart":
        return <EvolucaoPatrimonialChart data={evolucaoData} />;
      case "heatmap":
        const now = new Date();
        const month = dateRange.from ? format(dateRange.from, 'MM') : format(now, 'MM');
        const year = dateRange.from ? dateRange.from.getFullYear() : now.getFullYear();
        return <FluxoCaixaHeatmap month={month} year={year} transacoes={filteredTransacoesV2} />;
      case "indicadores":
        return <IndicadoresFinanceiros indicadores={indicadores} />;
      case "tabela-consolidada":
        return <TabelaConsolidada data={tabelaConsolidada} />;
      case "objetivos":
        return <ObjetivosCards objetivos={objetivos} />;
      case "distribuicao-charts":
        return <DistribuicaoCharts porClasse={distribuicaoPorClasse} porRisco={distribuicaoPorRisco} />;
      case "transacoes-recentes":
        return <TransacoesRecentes transacoes={filteredTransacoes} limit={8} />;
      default:
        return null;
    }
  };

  const visibleSections = sections
    .filter(s => s.visivel)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-muted-foreground mt-1">
              Painel unificado das suas finanças pessoais
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector 
              initialRange={initialRange}
              onDateRangeChange={handlePeriodChange} 
            />
            <DashboardCustomizer
              sections={sections}
              layout={layout}
              onSectionsChange={setSections}
              onLayoutChange={setLayout}
              onReset={handleResetCustomization}
            />
          </div>
        </div>

        <div className={cn(
          "space-y-6",
          layout === "2col" && "grid grid-cols-1 lg:grid-cols-2 gap-6",
          layout === "3col" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        )}>
          {visibleSections.map((section) => (
            <div key={section.id} className="animate-fade-in-up">
              {renderSection(section.id)}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;