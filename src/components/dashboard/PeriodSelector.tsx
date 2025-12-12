import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Calendar as CalendarIcon, X, Equal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Interface padronizada para range de data (usando Date)
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Nova interface para o estado de comparação
export interface ComparisonDateRanges {
  range1: DateRange;
  range2: DateRange;
}

interface PeriodSelectorProps {
  onDateRangeChange: (ranges: ComparisonDateRanges) => void;
  initialRanges: ComparisonDateRanges;
  className?: string;
}

// Presets para o Período Principal
const presets = [
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "last3Months", label: "Últimos 3 meses" },
  { id: "thisYear", label: "Este ano" },
  { id: "all", label: "Todo o período" },
  { id: "custom", label: "Personalizado" },
];

// Presets para o Período de Comparação
const comparisonPresets = [
  { id: "previousPeriod", label: "Período Anterior" },
  { id: "previousYear", label: "Ano Anterior" },
  { id: "custom", label: "Personalizado" },
];

export function PeriodSelector({
  onDateRangeChange,
  initialRanges,
  className,
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ranges, setRanges] = useState<ComparisonDateRanges>(initialRanges);
  
  // Estado de edição: qual range está sendo configurado no calendário
  const [editingRange, setEditingRange] = useState<'range1' | 'range2'>('range1');
  
  // Estado temporário para o calendário
  const [tempRange, setTempRange] = useState<DateRange>(initialRanges.range1);
  
  // Estado de presets
  const [selectedPreset1, setSelectedPreset1] = useState<string>('custom');
  const [selectedPreset2, setSelectedPreset2] = useState<string>('none');
  
  // Estado do toggle de comparação
  const [isComparisonEnabled, setIsComparisonEnabled] = useState(!!initialRanges.range2.from);

  // Sincroniza o estado interno com o prop initialRanges
  useEffect(() => {
    setRanges(initialRanges);
    setIsComparisonEnabled(!!initialRanges.range2.from);
    
    // Determinar presets iniciais (simplificado)
    const isRange1Custom = initialRanges.range1.from && initialRanges.range1.to;
    setSelectedPreset1(isRange1Custom ? 'custom' : 'all');
    
    if (initialRanges.range2.from) {
      const prevPeriod = calculatePreviousPeriod(initialRanges.range1);
      const prevYear = calculatePreviousYear(initialRanges.range1);
      
      if (isSameDay(initialRanges.range2.from, prevPeriod.from!) && isSameDay(initialRanges.range2.to!, prevPeriod.to!)) {
        setSelectedPreset2('previousPeriod');
      } else if (isSameDay(initialRanges.range2.from, prevYear.from!) && isSameDay(initialRanges.range2.to!, prevYear.to!)) {
        setSelectedPreset2('previousYear');
      } else {
        setSelectedPreset2('custom');
      }
    } else {
      setSelectedPreset2('none');
    }
  }, [initialRanges]);

  // Sincroniza o range temporário ao abrir ou mudar o range de edição
  useEffect(() => {
    if (isOpen) {
      const rangeToEdit = editingRange === 'range1' ? ranges.range1 : ranges.range2;
      setTempRange(rangeToEdit);
    }
  }, [isOpen, editingRange, ranges]);

  // Função auxiliar para garantir que 'to' seja o final do dia
  const normalizeRange = (range: DateRange): DateRange => ({
    from: range.from ? startOfDay(range.from) : undefined,
    to: range.to ? endOfDay(range.to) : undefined,
  });

  // Calcula o Período 2 automaticamente com base no Período 1
  const calculatePreviousPeriod = useCallback((range: DateRange): DateRange => {
    if (!range.from || !range.to) return { from: undefined, to: undefined };
    
    const diffInDays = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
    
    const prevTo = subDays(range.from, 1);
    const prevFrom = subDays(prevTo, diffInDays);
    
    return normalizeRange({ from: prevFrom, to: prevTo });
  }, []);

  const calculatePreviousYear = useCallback((range: DateRange): DateRange => {
    if (!range.from || !range.to) return { from: undefined, to: undefined };
    
    const prevFrom = subMonths(range.from, 12);
    const prevTo = subMonths(range.to, 12);
    
    return normalizeRange({ from: prevFrom, to: prevTo });
  }, []);

  // Aplica as mudanças e emite o evento
  const handleApply = useCallback((newRanges: ComparisonDateRanges) => {
    const finalRanges: ComparisonDateRanges = {
      range1: normalizeRange(newRanges.range1),
      range2: normalizeRange(newRanges.range2),
    };
    
    setRanges(finalRanges);
    onDateRangeChange(finalRanges);
  }, [onDateRangeChange]);
  
  // Lógica de presets para o Período Principal (Range 1)
  const handlePreset1Click = (presetId: string) => {
    const today = new Date();
    let newRange: DateRange;

    switch (presetId) {
      case "thisMonth":
        newRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        newRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        break;
      case "last3Months":
        const last3Months = subMonths(today, 2);
        newRange = { from: startOfMonth(last3Months), to: endOfMonth(today) };
        break;
      case "thisYear":
        newRange = { from: startOfYear(today), to: endOfYear(today) };
        break;
      case "all":
        newRange = { from: undefined, to: undefined };
        break;
      case "custom":
        setSelectedPreset1(presetId);
        setEditingRange('range1');
        setTempRange(ranges.range1);
        return;
      default:
        return;
    }
    
    setSelectedPreset1(presetId);
    
    // Atualiza o Período 2 automaticamente se estiver em modo automático
    let newRange2 = ranges.range2;
    if (selectedPreset2 === 'previousPeriod') {
      newRange2 = calculatePreviousPeriod(newRange);
    } else if (selectedPreset2 === 'previousYear') {
      newRange2 = calculatePreviousYear(newRange);
    } else if (selectedPreset2 === 'none' || !isComparisonEnabled) {
      newRange2 = { from: undefined, to: undefined };
    }

    handleApply({ range1: newRange, range2: newRange2 });
  };

  // Lógica de presets para o Período de Comparação (Range 2)
  const handlePreset2Click = (presetId: string) => {
    setSelectedPreset2(presetId);
    let newRange2: DateRange = { from: undefined, to: undefined };
    
    if (presetId === 'previousPeriod') {
      newRange2 = calculatePreviousPeriod(ranges.range1);
    } else if (presetId === 'previousYear') {
      newRange2 = calculatePreviousYear(ranges.range1);
    } else if (presetId === 'custom') {
      setEditingRange('range2');
      setTempRange(ranges.range2);
      return;
    } else if (presetId === 'none') {
      newRange2 = { from: undefined, to: undefined };
    }

    handleApply({ range1: ranges.range1, range2: newRange2 });
  };
  
  // Aplica o intervalo temporário (do calendário) ao range de edição
  const handleCalendarApply = () => {
    if (!tempRange.from && !tempRange.to) return;
    
    const newRange: DateRange = (tempRange.from && tempRange.to && tempRange.from > tempRange.to)
      ? { from: tempRange.to, to: tempRange.from }
      : { from: tempRange.from, to: tempRange.to };

    let newRanges = { ...ranges };
    
    if (editingRange === 'range1') {
      newRanges.range1 = newRange;
      setSelectedPreset1('custom');
      
      // Recalcula o Período 2 se estiver em modo automático
      if (selectedPreset2 === 'previousPeriod') {
        newRanges.range2 = calculatePreviousPeriod(newRange);
      } else if (selectedPreset2 === 'previousYear') {
        newRanges.range2 = calculatePreviousYear(newRange);
      } else if (selectedPreset2 === 'none' || !isComparisonEnabled) {
        newRanges.range2 = { from: undefined, to: undefined };
      }
    } else {
      newRanges.range2 = newRange;
      setSelectedPreset2('custom');
    }
    
    handleApply(newRanges);
    setEditingRange('range1'); // Volta para o P1 após aplicar
  };

  const handleClearAll = () => {
    handleApply({ range1: { from: undefined, to: undefined }, range2: { from: undefined, to: undefined } });
    setSelectedPreset1('all');
    setSelectedPreset2('none');
    setIsComparisonEnabled(false);
    setEditingRange('range1');
  };

  const formatDateRange = (range: DateRange) => {
    if (!range.from && !range.to) return "Todo o período";
    if (!range.from || !range.to) return "Selecione um período";
    
    const fromStr = format(range.from, "dd/MM/yyyy", { locale: ptBR });
    const toStr = format(range.to, "dd/MM/yyyy", { locale: ptBR });

    if (isSameDay(range.from, range.to)) {
      return fromStr;
    }
    if (isSameMonth(range.from, range.to) && isSameYear(range.from, range.to)) {
      return `${format(range.from, "dd", { locale: ptBR })} - ${toStr}`;
    }
    
    return `${fromStr} - ${toStr}`;
  };

  const displayRange1 = useMemo(() => formatDateRange(ranges.range1), [ranges.range1]);
  const displayRange2 = useMemo(() => ranges.range2.from ? formatDateRange(ranges.range2) : "Nenhuma Comparação", [ranges.range2]);
  
  const isRange1Custom = selectedPreset1 === 'custom';
  const isRange2Custom = selectedPreset2 === 'custom';
  
  const isPresetActive = (presetId: string, currentRange: DateRange, isRange1: boolean) => {
    const selectedPreset = isRange1 ? selectedPreset1 : selectedPreset2;
    if (selectedPreset === presetId) return true;
    
    // Lógica de verificação de igualdade de range para presets automáticos
    if (presetId === 'custom' || presetId === 'none') return false;
    
    const today = new Date();
    let targetRange: DateRange | null = null;

    if (isRange1) {
      switch (presetId) {
        case "thisMonth":
          targetRange = { from: startOfMonth(today), to: endOfMonth(today) };
          break;
        case "lastMonth":
          const lastMonth = subMonths(today, 1);
          targetRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
          break;
        case "last3Months":
          const last3Months = subMonths(today, 2);
          targetRange = { from: startOfMonth(last3Months), to: endOfMonth(today) };
          break;
        case "thisYear":
          targetRange = { from: startOfYear(today), to: endOfYear(today) };
          break;
        case "all":
          targetRange = { from: undefined, to: undefined };
          break;
      }
    } else { // Range 2 comparison presets
      if (!ranges.range1.from) return false; // Cannot calculate comparison without range 1
      switch (presetId) {
        case "previousPeriod":
          targetRange = calculatePreviousPeriod(ranges.range1);
          break;
        case "previousYear":
          targetRange = calculatePreviousYear(ranges.range1);
          break;
      }
    }
    
    if (!targetRange) return false;
    
    const normalizedTarget = normalizeRange(targetRange);
    const normalizedCurrent = normalizeRange(currentRange);

    if (!normalizedTarget.from && !normalizedCurrent.from) return true;
    if (!normalizedTarget.from || !normalizedCurrent.from) return false;
    
    return isSameDay(normalizedTarget.from, normalizedCurrent.from) && isSameDay(normalizedTarget.to!, normalizedCurrent.to!);
  };

  const handleComparisonToggle = (checked: boolean) => {
    setIsComparisonEnabled(checked);
    if (!checked) {
      // Limpa o range 2 se desativado
      handleApply({ range1: ranges.range1, range2: { from: undefined, to: undefined } });
      setSelectedPreset2('none');
    } else {
      // Ativa com o preset padrão (Período Anterior)
      handlePreset2Click('previousPeriod');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[320px] justify-start text-left font-normal bg-muted border-border h-12",
            (!ranges.range1.from && !ranges.range1.to) && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <div className="flex flex-col items-start text-xs flex-1 min-w-0">
            <span className="font-medium text-foreground truncate w-full">
              {displayRange1}
            </span>
            {isComparisonEnabled && (
              <span className="text-muted-foreground truncate w-full">
                vs {displayRange2}
              </span>
            )}
          </div>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      {/* Popover Content - Layout de coluna única e compacto */}
      <PopoverContent className="w-full max-w-[650px] p-0 bg-card border-border" align="end">
        <div className="p-4 space-y-6">
          
          {/* 1) Período Principal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Período Principal
            </h3>
            
            {/* Presets e Customização */}
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={isPresetActive(preset.id, ranges.range1, true) ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-full justify-center text-sm h-9",
                    isPresetActive(preset.id, ranges.range1, true) && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={() => handlePreset1Click(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            
            {/* Calendário para Personalizado (Range 1) */}
            {isRange1Custom && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground">
                  Selecione o intervalo para o Período Principal
                </p>
                <div className="flex justify-center overflow-x-auto">
                  <Calendar
                    mode="range"
                    selected={{ from: tempRange.from, to: tempRange.to }}
                    onSelect={(range) => setTempRange(range as DateRange)}
                    numberOfMonths={2}
                    locale={ptBR}
                    initialFocus
                    className="max-w-full" 
                  />
                </div>
                <Button 
                  onClick={handleCalendarApply} 
                  className="w-full h-9 gap-2"
                  disabled={!tempRange.from || !tempRange.to}
                >
                  <Check className="w-4 h-4" />
                  Aplicar Período Principal
                </Button>
              </div>
            )}
          </div>
          
          {/* 2) Período de Comparação (Opcional) */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Equal className="w-4 h-4 text-accent" />
                Comparar com outro período
              </h3>
              <Switch
                checked={isComparisonEnabled}
                onCheckedChange={handleComparisonToggle}
              />
            </div>
            
            {isComparisonEnabled && (
              <div className="space-y-4">
                {/* Presets e Customização */}
                <div className="grid grid-cols-3 gap-2">
                  {comparisonPresets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={isPresetActive(preset.id, ranges.range2, false) ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-full justify-center text-sm h-9",
                        isPresetActive(preset.id, ranges.range2, false) && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      onClick={() => handlePreset2Click(preset.id)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                
                {/* Calendário para Personalizado (Range 2) */}
                {isRange2Custom && (
                  <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground">
                      Selecione o intervalo para o Período de Comparação
                    </p>
                    <div className="flex justify-center overflow-x-auto">
                      <Calendar
                        mode="range"
                        selected={{ from: tempRange.from, to: tempRange.to }}
                        onSelect={(range) => setTempRange(range as DateRange)}
                        numberOfMonths={2}
                        locale={ptBR}
                        initialFocus
                        className="max-w-full" 
                      />
                    </div>
                    <Button 
                      onClick={handleCalendarApply} 
                      className="w-full h-9 gap-2"
                      disabled={!tempRange.from || !tempRange.to}
                    >
                      <Check className="w-4 h-4" />
                      Aplicar Comparação
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Ações Finais */}
          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-destructive hover:text-destructive gap-1"
            >
              <X className="w-4 h-4" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}