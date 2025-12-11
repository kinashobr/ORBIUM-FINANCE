import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays, isSameDay, isSameMonth, isSameYear } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface padronizada para range de data (usando Date)
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface PeriodSelectorProps {
  onDateRangeChange: (range: DateRange) => void;
  initialRange: DateRange;
  className?: string;
}

const months = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

const presets = [
  { id: "today", label: "Hoje" },
  { id: "last7", label: "Últimos 7 dias" },
  { id: "last30", label: "Últimos 30 dias" },
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "last3Months", label: "Últimos 3 meses" },
  { id: "thisYear", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];

export function PeriodSelector({
  onDateRangeChange,
  initialRange,
  className,
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(initialRange);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(initialRange.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(initialRange.to);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Sincroniza o estado interno com o prop inicialRange
  useEffect(() => {
    setRange(initialRange);
    setCustomFrom(initialRange.from);
    setCustomTo(initialRange.to);
    // Determina o preset inicial se for um dos padrões
    const isInitialPreset = presets.find(p => {
      if (p.id === 'all' && !initialRange.from && !initialRange.to) return true;
      
      const today = new Date();
      let presetRange: DateRange = { from: undefined, to: undefined };
      
      switch (p.id) {
        case "today":
          presetRange = { from: today, to: today };
          break;
        case "last7":
          presetRange = { from: subDays(today, 6), to: today };
          break;
        case "last30":
          presetRange = { from: subDays(today, 29), to: today };
          break;
        case "thisMonth":
          presetRange = { from: startOfMonth(today), to: endOfMonth(today) };
          break;
        case "lastMonth":
          const lastMonth = subMonths(today, 1);
          presetRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
          break;
        case "last3Months":
          const last3Months = subMonths(today, 2);
          presetRange = { from: startOfMonth(last3Months), to: endOfMonth(today) };
          break;
        case "thisYear":
          presetRange = { from: startOfYear(today), to: endOfYear(today) };
          break;
      }

      if (presetRange.from && presetRange.to && initialRange.from && initialRange.to) {
        // Compara apenas a data, ignorando a hora
        return isSameDay(presetRange.from, initialRange.from) && isSameDay(presetRange.to, initialRange.to);
      }
      return false;
    });

    setSelectedPreset(isInitialPreset ? isInitialPreset.id : 'custom');
  }, [initialRange]);

  const handleApply = useCallback((newRange: DateRange) => {
    // Garante que o 'to' seja o final do dia, se definido
    const finalRange: DateRange = {
      from: newRange.from ? startOfDay(newRange.from) : undefined,
      to: newRange.to ? endOfDay(newRange.to) : undefined,
    };
    
    setRange(finalRange);
    onDateRangeChange(finalRange);
    setIsOpen(false);
  }, [onDateRangeChange]);
  
  const startOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const handlePresetClick = (presetId: string) => {
    const today = new Date();
    let newRange: DateRange;

    switch (presetId) {
      case "today":
        newRange = { from: today, to: today };
        break;
      case "last7":
        newRange = { from: subDays(today, 6), to: today };
        break;
      case "last30":
        newRange = { from: subDays(today, 29), to: today };
        break;
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
      default:
        return;
    }
    
    setSelectedPreset(presetId);
    handleApply(newRange);
  };

  const handleCustomApply = () => {
    if (customFrom && customTo && customFrom > customTo) {
      // Swap dates if necessary
      handleApply({ from: customTo, to: customFrom });
    } else {
      handleApply({ from: customFrom, to: customTo });
    }
    setSelectedPreset('custom');
  };

  const handleClear = () => {
    handleApply({ from: undefined, to: undefined });
    setSelectedPreset('all');
  };

  const formatDateRange = useMemo(() => {
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
  }, [range]);

  const renderDateSelect = (type: 'from' | 'to') => {
    const date = type === 'from' ? customFrom : customTo;
    const setDate = type === 'from' ? setCustomFrom : setCustomTo;
    const monthValue = date ? date.getMonth().toString() : "";
    const yearValue = date ? date.getFullYear().toString() : "";

    const handleMonthChange = (value: string) => {
      const month = parseInt(value);
      const newDate = date ? new Date(date.getFullYear(), month, date.getDate()) : new Date(new Date().getFullYear(), month, 1);
      setDate(newDate);
    };

    const handleYearChange = (value: string) => {
      const year = parseInt(value);
      const newDate = date ? new Date(year, date.getMonth(), date.getDate()) : new Date(year, new Date().getMonth(), 1);
      setDate(newDate);
    };

    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          {type === 'from' ? 'Período Inicial' : 'Período Final'}
        </label>
        <div className="flex gap-2">
          <Select value={monthValue} onValueChange={handleMonthChange}>
            <SelectTrigger className="flex-1 bg-muted border-border h-9 text-sm">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearValue} onValueChange={handleYearChange}>
            <SelectTrigger className="w-24 bg-muted border-border h-9 text-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal bg-muted border-border h-9",
            (!range.from && !range.to) && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{formatDateRange}</span>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0 bg-card border-border" align="end">
        <div className="grid grid-cols-3 gap-4 p-4">
          {/* Coluna 1: Presets */}
          <div className="col-span-1 space-y-2 border-r border-border pr-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Períodos Pré-definidos
            </p>
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant={selectedPreset === preset.id ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => handlePresetClick(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Coluna 2: Seleção Manual */}
          <div className="col-span-2 space-y-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Intervalo Personalizado
            </p>
            
            {/* Seletores de Mês/Ano */}
            <div className="grid grid-cols-2 gap-4">
              {renderDateSelect('from')}
              {renderDateSelect('to')}
            </div>

            {/* Calendário */}
            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={{ from: customFrom, to: customTo }}
                onSelect={(range) => {
                  setCustomFrom(range?.from);
                  setCustomTo(range?.to);
                }}
                numberOfMonths={1} // Reduzido para 1 para caber melhor
                locale={ptBR}
                initialFocus
              />
            </div>

            {/* Ações */}
            <div className="flex justify-between pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
              <Button
                onClick={handleCustomApply}
                className="bg-primary hover:bg-primary/90 gap-2"
                disabled={!customFrom && !customTo}
              >
                <CalendarIcon className="w-4 h-4" />
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}