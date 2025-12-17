import { createContext, useContext, useState, useEffect, useCallback, Dispatch, SetStateAction, ReactNode } from "react";
import {
  Categoria, TransacaoCompleta,
  DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES,
  ContaCorrente,
  FinanceExportV2,
  Emprestimo, // V2 Entity
  Veiculo, // V2 Entity
  SeguroVeiculo, // V2 Entity
  ObjetivoFinanceiro, // V2 Entity
  AccountType,
  DateRange, // Import new types
  ComparisonDateRanges, // Import new types
  generateAccountId,
  generateTransactionId,
  BillTracker, // NEW
  generateBillId, // NEW
  StandardizationRule, // <-- NEW IMPORT
  generateRuleId, // <-- NEW IMPORT
  ImportedStatement, // <-- NEW IMPORT
  ImportedTransaction, // <-- NEW IMPORT
  generateStatementId, // <-- NEW IMPORT
  OperationType, // <-- NEW IMPORT
  getFlowTypeFromOperation, // <-- NEW IMPORT
  BillSourceType,
  TransactionLinks,
} from "@/types/finance";
import { parseISO, startOfMonth, endOfMonth, subDays, differenceInDays, differenceInMonths, addMonths, isBefore, isAfter, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay, subMonths, format, isWithinInterval } from "date-fns"; // Import date-fns helpers
import { parseDateLocal } from "@/lib/utils"; // Importando a nova função

// ============================================
// FUNÇÕES AUXILIARES PARA DATAS
// ============================================

const calculateDefaultRange = (): DateRange => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
};

const calculateComparisonRange = (range1: DateRange): DateRange => {
    if (!range1.from || !range1.to) {
        return { from: undefined, to: undefined };
    }
    const diffInDays = differenceInDays(range1.to, range1.from) + 1;
    const prevTo = subDays(range1.from, 1);
    const prevFrom = subDays(prevTo, diffInDays - 1);
    return { from: prevFrom, to: prevTo };
};

const DEFAULT_RANGES: ComparisonDateRanges = {
    range1: calculateDefaultRange(),
    range2: calculateComparisonRange(calculateDefaultRange()),
};

function parseDateRanges(storedRanges: any): ComparisonDateRanges {
    const parseDate = (dateStr: string | undefined): Date | undefined => {
        if (!dateStr) return undefined;
        try {
            // Usamos parseDateLocal para garantir que as datas salvas sejam lidas corretamente
            const date = parseDateLocal(dateStr.split('T')[0]); 
            return isNaN(date.getTime()) ? undefined : date;
        } catch {
            return undefined;
        }
    };

    return {
        range1: {
            from: parseDate(storedRanges.range1?.from),
            to: parseDate(storedRanges.range1?.to),
        },
        range2: {
            from: parseDate(storedRanges.range2?.from),
            to: parseDate(storedRanges.range2?.to),
        },
    };
}

// Helper function to calculate the due date of an installment
export const getDueDate = (startDateStr: string, installmentNumber: number): Date => {
  // Uses parseDateLocal to ensure the start date is interpreted locally
  const startDate = parseDateLocal(startDateStr);
  const dueDate = new Date(startDate);
  
  // Adjustment: If installmentNumber = 1, add 0 months.
  dueDate.setMonth(dueDate.getMonth() + installmentNumber - 1);
  
  return dueDate;
};

// ============================================
// FUNÇÕES DE PARSING (MOVIDAS DO DIALOG)
// ============================================

// Helper para normalizar valor (R$ 1.234,56 -> 1234.56)
const normalizeAmount = (amountStr: string): number => {
    let cleaned = amountStr.trim();
    const isNegative = cleaned.startsWith('-');
    
    if (isNegative) {
        cleaned = cleaned.substring(1);
    }
    
    cleaned = cleaned.replace(/[^\d.,]/g, '');

    if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            const lastPart = parts.pop();
            cleaned = parts.join('') + '.' + lastPart;
        }
    }
    
    const parsed = parseFloat(cleaned);
    
    return isNegative ? -parsed : parsed;
};

// Helper para normalizar data OFX (YYYYMMDD -> YYYY-MM-DD)
const normalizeOfxDate = (dateStr: string): string => {
    if (dateStr.length >= 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
};

// Parsing CSV
const parseCSV = (content: string, accountId: string): ImportedTransaction[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const separator = lines[0].includes('\t') ? '\t' : ',';
    
    const header = lines[0].toLowerCase();
    const cols = header.split(separator);
    
    const normalizeHeader = (h: string) => h.normalize("NFD").replace(/[\u0300-\u036f]/g, '').trim();
    
    const dataIndex = cols.findIndex(h => normalizeHeader(h).includes('data'));
    const valorIndex = cols.findIndex(h => normalizeHeader(h).includes('valor'));
    const descIndex = cols.findIndex(h => normalizeHeader(h).includes('descri'));

    if (dataIndex === -1 || valorIndex === -1 || descIndex === -1) {
        throw new Error(`CSV inválido. Colunas 'Data', 'Valor' e 'Descrição' são obrigatógrias. Separador detectado: '${separator}'`);
    }

    const transactions: ImportedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
        const lineCols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (lineCols.length > Math.max(dataIndex, valorIndex, descIndex)) {
            const dateStr = lineCols[dataIndex];
            const amountStr = lineCols[valorIndex];
            const originalDescription = lineCols[descIndex];
            
            if (!dateStr || !amountStr || !originalDescription) continue;

            const amount = normalizeAmount(amountStr);
            
            let normalizedDate = dateStr;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            } else if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
            } else {
                normalizedDate = normalizeOfxDate(dateStr);
            }
            
            if (normalizedDate.length < 10 || isNaN(parseDateLocal(normalizedDate).getTime())) {
                continue;
            }

            transactions.push({
                id: generateTransactionId(),
                date: normalizedDate,
                amount: Math.abs(amount),
                originalDescription,
                accountId,
                categoryId: null,
                operationType: amount < 0 ? 'despesa' : 'receita',
                description: originalDescription,
                isTransfer: false,
                destinationAccountId: null,
                tempInvestmentId: null,
                tempLoanId: null,
                tempVehicleOperation: null,
                sourceType: 'csv',
                isContabilized: false,
                contabilizedTransactionId: undefined,
                isPotentialDuplicate: false,
                duplicateOfTxId: undefined,
            });
        }
    }
    return transactions;
};

// Parsing OFX
const parseOFX = (content: string, accountId: string): ImportedTransaction[] => {
    const transactions: ImportedTransaction[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
        const stmtTrnBlock = match[1];
        
        const dtPostedMatch = stmtTrnBlock.match(/<DTPOSTED>(\d+)/);
        const trnAmtMatch = stmtTrnBlock.match(/<TRNAMT>([\d.-]+)/);
        const memoMatch = stmtTrnBlock.match(/<MEMO>([\s\S]*?)</);

        if (dtPostedMatch && trnAmtMatch && memoMatch) {
            const dateStr = dtPostedMatch[1];
            const amount = parseFloat(trnAmtMatch[1]);
            const originalDescription = memoMatch[1].trim();
            
            if (isNaN(amount)) continue;

            const normalizedDate = normalizeOfxDate(dateStr);
            
            const operationType: OperationType = amount < 0 ? 'despesa' : 'receita';

            transactions.push({
                id: generateTransactionId(),
                date: normalizedDate,
                amount: Math.abs(amount),
                originalDescription,
                accountId,
                categoryId: null,
                operationType,
                description: originalDescription,
                isTransfer: false,
                destinationAccountId: null,
                tempInvestmentId: null,
                tempLoanId: null,
                tempVehicleOperation: null,
                sourceType: 'ofx',
                isContabilized: false,
                contabilizedTransactionId: undefined,
                isPotentialDuplicate: false,
                duplicateOfTxId: undefined,
            });
        }
    }
    return transactions;
};

// ============================================
// INTERFACE DO CONTEXTO (Atualizada)
// ============================================

export interface AmortizationItem {
    parcela: number;
    juros: number;
    amortizacao: number;
    saldoDevedor: number;
}

interface FinanceContextType {
  // Empréstimos
  emprestimos: Emprestimo[];
  addEmprestimo: (emprestimo: Omit<Emprestimo, "id">) => void;
  updateEmprestimo: (id: number, emprestimo: Partial<Emprestimo>) => void;
  deleteEmprestimo: (id: number) => void;
  getPendingLoans: () => Emprestimo[];
  markLoanParcelPaid: (loanId: number, valorPago: number, dataPagamento: string, parcelaNumero?: number) => void;
  unmarkLoanParcelPaid: (loanId: number) => void;
  calculateLoanSchedule: (loanId: number) => AmortizationItem[];
  calculateLoanAmortizationAndInterest: (loanId: number, parcelaNumber: number) => AmortizationItem | null;
  calculateLoanPrincipalDueInNextMonths: (targetDate: Date, months: number) => number; 
  
  // Veículos
  veiculos: Veiculo[];
  addVeiculo: (veiculo: Omit<Veiculo, "id">) => void;
  updateVeiculo: (id: number, veiculo: Partial<Veiculo>) => void;
  deleteVeiculo: (id: number) => void;
  getPendingVehicles: () => Veiculo[];
  
  // Seguros de Veículo
  segurosVeiculo: SeguroVeiculo[];
  addSeguroVeiculo: (seguro: Omit<SeguroVeiculo, "id">) => void;
  updateSeguroVeiculo: (id: number, seguro: Partial<SeguroVeiculo>) => void;
  deleteSeguroVeiculo: (id: number) => void;
  markSeguroParcelPaid: (seguroId: number, parcelaNumero: number, transactionId: string) => void;
  unmarkSeguroParcelPaid: (seguroId: number, parcelaNumero: number) => void;
  
  // Objetivos Financeiros
  objetivos: ObjetivoFinanceiro[];
  addObjetivo: (obj: Omit<ObjetivoFinanceiro, "id">) => void;
  updateObjetivo: (id: number, obj: Partial<ObjetivoFinanceiro>) => void;
  deleteObjetivo: (id: number) => void;

  // NEW: Bill Tracker
  billsTracker: BillTracker[];
  setBillsTracker: Dispatch<SetStateAction<BillTracker[]>>;
  addBill: (bill: Omit<BillTracker, "id" | "isPaid">) => void;
  updateBill: (id: string, updates: Partial<BillTracker>) => void;
  deleteBill: (id: string) => void;
  getBillsForMonth: (date: Date, includeTemplates: boolean) => BillTracker[]; // RENOMEADO E MODIFICADO
  
  // Contas Movimento (new integrated system)
  contasMovimento: ContaCorrente[];
  setContasMovimento: Dispatch<SetStateAction<ContaCorrente[]>>;
  getContasCorrentesTipo: () => ContaCorrente[];
  
  // Categorias V2 (with nature)
  categoriasV2: Categoria[];
  setCategoriasV2: Dispatch<SetStateAction<Categoria[]>>;
  
  // Transações V2 (integrated)
  transacoesV2: TransacaoCompleta[];
  setTransacoesV2: Dispatch<SetStateAction<TransacaoCompleta[]>>;
  addTransacaoV2: (transaction: TransacaoCompleta) => void;
  
  // Standardization Rules
  standardizationRules: StandardizationRule[];
  addStandardizationRule: (rule: Omit<StandardizationRule, "id">) => void;
  deleteStandardizationRule: (id: string) => void;
  
  // NEW: Imported Statements Management (Fase 1)
  importedStatements: ImportedStatement[];
  processStatementFile: (file: File, accountId: string) => Promise<{ success: boolean; message: string }>;
  deleteImportedStatement: (statementId: string) => void;
  getTransactionsForReview: (accountId: string, range: DateRange) => ImportedTransaction[];
  updateImportedStatement: (statementId: string, updates: Partial<ImportedStatement>) => void;
  
  // Data Filtering (NEW)
  dateRanges: ComparisonDateRanges;
  setDateRanges: Dispatch<SetStateAction<ComparisonDateRanges>>;
  
  // Alert Filtering (NEW)
  alertStartDate: string; // YYYY-MM-DD string
  setAlertStartDate: Dispatch<SetStateAction<string>>;
  
  // NEW: Revenue Forecast
  monthlyRevenueForecast: number | null;
  setMonthlyRevenueForecast: Dispatch<SetStateAction<number | null>>;
  getRevenueForPreviousMonth: (date: Date) => number;
  
  // Cálculos principais
  getTotalReceitas: (mes?: string) => number;
  getTotalDespesas: (mes?: string) => number;
  getTotalDividas: () => number;
  getCustoVeiculos: () => number;
  getSaldoAtual: () => number;
  
  // Cálculos avançados para relatórios (AGORA PERIOD-AWARE)
  getValorFipeTotal: (targetDate?: Date) => number;
  getSaldoDevedor: (targetDate?: Date) => number;
  getLoanPrincipalRemaining: (targetDate?: Date) => number; // NEW
  getCreditCardDebt: (targetDate?: Date) => number; // NEW
  getJurosTotais: () => number;
  getDespesasFixas: () => number;
  getPatrimonioLiquido: (targetDate?: Date) => number;
  getAtivosTotal: (targetDate?: Date) => number;
  getPassivosTotal: (targetDate?: Date) => number;
  
  // Seguros Accrual (NEW)
  getSegurosAApropriar: (targetDate?: Date) => number;
  getSegurosAPagar: (targetDate?: Date) => number;
  
  // Nova função de cálculo de saldo por data
  calculateBalanceUpToDate: (accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]) => number;
  calculateTotalInvestmentBalanceAtDate: (date: Date | undefined) => number;
  calculatePaidInstallmentsUpToDate: (loanId: number, targetDate: Date) => number; 

  // Exportação e Importação
  exportData: () => void;
  importData: (file: File) => Promise<{ success: boolean; message: string }>;
  
  // Removidos: Investimentos RF, Criptomoedas, Stablecoins, Movimentações de Investimento
  investimentosRF: any[];
  criptomoedas: any[];
  stablecoins: any[];
  movimentacoesInvestimento: any[];
  addInvestimentoRF: () => void;
  updateInvestimentoRF: () => void;
  deleteInvestimentoRF: () => void;
  addCriptomoeda: () => void;
  updateCriptomoeda: () => void;
  deleteCriptomoeda: () => void;
  addStablecoin: () => void;
  updateStablecoin: () => void;
  deleteStablecoin: () => void;
  addMovimentacaoInvestimento: () => void;
  updateMovimentacaoInvestimento: () => void;
  deleteMovimentacaoInvestimento: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// ============================================
// CHAVES DO LOCALSTORAGE
// ============================================

const STORAGE_KEYS = {
  // Entidades V2
  EMPRESTIMOS: "neon_finance_emprestimos",
  VEICULOS: "neon_finance_veiculos",
  SEGUROS_VEICULO: "neon_finance_seguros_veiculo",
  OBJETIVOS: "neon_finance_objetivos",
  BILLS_TRACKER: "neon_finance_bills_tracker",
  
  // Core V2
  CONTAS_MOVIMENTO: "fin_accounts_v1",
  CATEGORIAS_V2: "fin_categories_v1",
  TRANSACOES_V2: "fin_transactions_v1",
  
  // Standardization Rules
  STANDARDIZATION_RULES: "fin_standardization_rules_v1",
  
  // NEW: Imported Statements
  IMPORTED_STATEMENTS: "fin_imported_statements_v1",
  
  // Data Filtering
  DATE_RANGES: "fin_date_ranges_v1",
  
  // Alert Filtering
  ALERT_START_DATE: "fin_alert_start_date_v1",
  
  // Revenue Forecast
  MONTHLY_REVENUE_FORECAST: "fin_monthly_revenue_forecast_v1",
};

// ============================================
// DADOS INICIAIS (Vazios)
// ============================================

const initialEmprestimos: Emprestimo[] = [];
const initialVeiculos: Veiculo[] = [];
const initialSegurosVeiculo: SeguroVeiculo[] = [];
const initialObjetivos: ObjetivoFinanceiro[] = [];
const initialBillsTracker: BillTracker[] = [];
const initialStandardizationRules: StandardizationRule[] = [];
const initialImportedStatements: ImportedStatement[] = []; // NEW INITIAL STATE

// Default alert start date is 6 months ago
const defaultAlertStartDate = subMonths(new Date(), 6).toISOString().split('T')[0];

// ============================================
// FUNÇÕES AUXILIARES DE LOCALSTORAGE
// ============================================

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Special handling for date ranges
      if (key === STORAGE_KEYS.DATE_RANGES) {
          return parseDateRanges(parsed) as unknown as T;
      }
      
      return parsed;
    }
  } catch (error) {
    console.error(`Erro ao carregar ${key} do localStorage:`, error);
  }
  
  return defaultValue;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    let dataToStore = data;
    if (key === STORAGE_KEYS.DATE_RANGES) {
        const ranges = data as unknown as ComparisonDateRanges;
        dataToStore = {
            range1: {
                from: ranges.range1.from?.toISOString().split('T')[0],
                to: ranges.range1.to?.toISOString().split('T')[0],
            },
            range2: {
                from: ranges.range2.from?.toISOString().split('T')[0],
                to: ranges.range2.to?.toISOString().split('T')[0],
            },
        } as unknown as T;
    }
    
    localStorage.setItem(key, JSON.stringify(dataToStore));
  } catch (error) {
    console.error(`Erro ao salvar ${key} no localStorage:`, error);
  }
}

// ============================================
// PROVIDER PRINCIPAL
// ============================================

export function FinanceProvider({ children }: { children: ReactNode }) {
  // Estados de Entidade V2 (Mantidos)
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>(() => 
    loadFromStorage(STORAGE_KEYS.EMPRESTIMOS, initialEmprestimos)
  );
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => 
    loadFromStorage(STORAGE_KEYS.VEICULOS, initialVeiculos)
  );
  const [segurosVeiculo, setSegurosVeiculo] = useState<SeguroVeiculo[]>(() => 
    loadFromStorage(STORAGE_KEYS.SEGUROS_VEICULO, initialSegurosVeiculo)
  );
  const [objetivos, setObjetivos] = useState<ObjetivoFinanceiro[]>(() => 
    loadFromStorage(STORAGE_KEYS.OBJETIVOS, initialObjetivos)
  );
  
  // Bill Tracker State
  const [billsTracker, setBillsTracker] = useState<BillTracker[]>(() => 
    loadFromStorage(STORAGE_KEYS.BILLS_TRACKER, initialBillsTracker)
  );
  
  // Estados V2 Core
  const [contasMovimento, setContasMovimento] = useState<ContaCorrente[]>(() => 
    loadFromStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, DEFAULT_ACCOUNTS)
  );
  const [categoriasV2, setCategoriasV2] = useState<Categoria[]>(() => 
    loadFromStorage(STORAGE_KEYS.CATEGORIAS_V2, DEFAULT_CATEGORIES)
  );
  const [transacoesV2, setTransacoesV2] = useState<TransacaoCompleta[]>(() => 
    loadFromStorage(STORAGE_KEYS.TRANSACOES_V2, [])
  );
  
  // Standardization Rules State
  const [standardizationRules, setStandardizationRules] = useState<StandardizationRule[]>(() => 
    loadFromStorage(STORAGE_KEYS.STANDARDIZATION_RULES, initialStandardizationRules)
  );
  
  // NEW: Imported Statements State
  const [importedStatements, setImportedStatements] = useState<ImportedStatement[]>(() => 
    loadFromStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, initialImportedStatements)
  );
  
  // Data Filtering State
  const [dateRanges, setDateRanges] = useState<ComparisonDateRanges>(() => 
    loadFromStorage(STORAGE_KEYS.DATE_RANGES, DEFAULT_RANGES)
  );
  
  // Alert Filtering State
  const [alertStartDate, setAlertStartDate] = useState<string>(() => 
    loadFromStorage(STORAGE_KEYS.ALERT_START_DATE, defaultAlertStartDate)
  );
  
  // Revenue Forecast State
  const [monthlyRevenueForecast, setMonthlyRevenueForecast] = useState<number | null>(() => 
    loadFromStorage(STORAGE_KEYS.MONTHLY_REVENUE_FORECAST, null)
  );

  // ============================================
  // EFEITOS PARA PERSISTÊNCIA AUTOMÁTICA
  // ============================================

  useEffect(() => { saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos); }, [emprestimos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VEICULOS, veiculos); }, [veiculos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SEGUROS_VEICULO, segurosVeiculo); }, [segurosVeiculo]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos); }, [objetivos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.BILLS_TRACKER, billsTracker); }, [billsTracker]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.STANDARDIZATION_RULES, standardizationRules); }, [standardizationRules]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, importedStatements); }, [importedStatements]); // NEW EFFECT
  useEffect(() => { saveToStorage(STORAGE_KEYS.DATE_RANGES, dateRanges); }, [dateRanges]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ALERT_START_DATE, alertStartDate); }, [alertStartDate]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.MONTHLY_REVENUE_FORECAST, monthlyRevenueForecast); }, [monthlyRevenueForecast]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, contasMovimento); }, [contasMovimento]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS_V2, categoriasV2); }, [categoriasV2]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES_V2, transacoesV2); }, [transacoesV2]);


  // ============================================
  // FUNÇÃO CENTRAL DE CÁLCULO DE SALDO POR DATA
  // ============================================

  const calculateBalanceUpToDate = useCallback((accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = 0; 
    
    const targetDate = date || new Date(9999, 11, 31);

    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && parseDateLocal(t.date) <= targetDate)
        .sort((a, b) => parseDateLocal(a.date).getTime() - parseDateLocal(b.date).getTime());

    transactionsBeforeDate.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        if (isCreditCard) {
          if (t.flow === 'out') {
            balance -= t.amount;
          } else if (t.flow === 'in') {
            balance += t.amount;
          }
        } else {
          if (t.flow === 'in' || t.flow === 'transfer_in') {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        }
    });

    return balance;
  }, [contasMovimento, transacoesV2]); // <-- FIX: Removed self-reference (Error 1)

  const calculateTotalInvestmentBalanceAtDate = useCallback((date: Date | undefined): number => {
    const targetDate = date || new Date(9999, 11, 31);
    
    const investmentAccountIds = contasMovimento
      .filter(c => 
        c.accountType === 'aplicacao_renda_fixa' || 
        c.accountType === 'poupanca' ||
        c.accountType === 'criptoativos' ||
        c.accountType === 'reserva_emergencia' ||
        c.accountType === 'objetivos_financeiros'
      )
      .map(c => c.id);

    return investmentAccountIds.reduce((acc, accountId) => {
        const balance = calculateBalanceUpToDate(accountId, targetDate, transacoesV2, contasMovimento);
        return acc + Math.max(0, balance);
    }, 0);
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);
  
  const calculatePaidInstallmentsUpToDate = useCallback((loanId: number, targetDate: Date): number => {
    const loan = emprestimos.find(e => e.id === loanId);
    if (!loan || !loan.dataInicio) return 0;

    const loanPayments = transacoesV2.filter(t => 
      t.operationType === 'pagamento_emprestimo' && 
      t.links?.loanId === `loan_${loanId}`
    );

    const paymentsUpToDate = loanPayments.filter(t => 
      parseDateLocal(t.date) <= targetDate
    );
    
    const paidParcelas = new Set<string>();
    paymentsUpToDate.forEach(p => {
        if (p.links?.parcelaId) {
            paidParcelas.add(p.links.parcelaId);
        }
    });
    
    if (paidParcelas.size > 0) {
        return paidParcelas.size;
    }

    return paymentsUpToDate.length;

  }, [emprestimos, transacoesV2]);
  
  // ============================================
  // CÁLCULO DE CRONOGRAMA DE AMORTIZAÇÃO (MÉTODO PRICE)
  // ============================================
  
  const calculateLoanSchedule = useCallback((loanId: number): AmortizationItem[] => {
    const loan = emprestimos.find(e => e.id === loanId);
    if (!loan || loan.meses === 0 || loan.taxaMensal === 0) return [];

    const taxa = loan.taxaMensal / 100;
    const parcelaFixa = loan.parcela;
    
    const round = (num: number) => Math.round(num * 100) / 100;
    
    let saldoDevedor = loan.valorTotal;
    const schedule: AmortizationItem[] = [];

    for (let i = 1; i <= loan.meses; i++) {
      if (saldoDevedor <= 0) {
        schedule.push({
          parcela: i,
          juros: 0,
          amortizacao: 0,
          saldoDevedor: 0,
        });
        continue;
      }
      
      const juros = saldoDevedor * taxa;
      let amortizacao = parcelaFixa - juros;
      
      if (i === loan.meses) {
          amortizacao = saldoDevedor;
      }
      
      const novoSaldoDevedor = round(Math.max(0, saldoDevedor - amortizacao));
      
      schedule.push({
        parcela: i,
        juros: round(Math.max(0, juros)),
        amortizacao: round(Math.max(0, amortizacao)),
        saldoDevedor: novoSaldoDevedor,
      });
      
      saldoDevedor = novoSaldoDevedor;
    }
    
    return schedule;
  }, [emprestimos]);
  
  const calculateLoanAmortizationAndInterest = useCallback((loanId: number, parcelaNumber: number): AmortizationItem | null => {
      const schedule = calculateLoanSchedule(loanId);
      return schedule.find(item => item.parcela === parcelaNumber) || null;
  }, [calculateLoanSchedule]);
  
  const calculateLoanPrincipalDueInNextMonths = useCallback((targetDate: Date, months: number): number => {
    const lookaheadDate = addMonths(targetDate, months);
    
    return emprestimos.reduce((acc, e) => {
        if (e.status === 'quitado' || e.status === 'pendente_config') return acc;

        let principalDue = 0;
        
        const paidUpToDate = calculatePaidInstallmentsUpToDate(e.id, targetDate);
        const schedule = calculateLoanSchedule(e.id);
        
        schedule.forEach(item => {
            const dueDate = getDueDate(e.dataInicio!, item.parcela);
            
            if (item.parcela <= paidUpToDate) {
                return;
            }
            
            if (isBefore(dueDate, lookaheadDate) || isSameDay(dueDate, lookaheadDate)) {
                principalDue += item.amortizacao;
            }
        });
        
        return acc + principalDue;
    }, 0);
  }, [emprestimos, calculatePaidInstallmentsUpToDate, calculateLoanSchedule]);

  // ============================================
  // FUNÇÕES DE CÁLCULO DE SEGUROS (ACCRUAL)
  // ============================================

  const getSegurosAApropriar = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date();
    
    return segurosVeiculo.reduce((acc, seguro) => {
        try {
            const vigenciaInicio = parseDateLocal(seguro.vigenciaInicio);
            const vigenciaFim = parseDateLocal(seguro.vigenciaFim);
            
            if (isAfter(vigenciaInicio, date) || isBefore(vigenciaFim, date)) return acc;
            
            const totalDays = differenceInDays(vigenciaFim, vigenciaInicio) + 1;
            if (totalDays <= 0) return acc;
            
            const dailyAccrual = seguro.valorTotal / totalDays;
            
            const daysConsumed = differenceInDays(date, vigenciaInicio) + 1;
            
            const accruedExpense = Math.min(seguro.valorTotal, dailyAccrual * daysConsumed);
            
            const segurosAApropriar = Math.max(0, seguro.valorTotal - accruedExpense);
            
            return acc + Math.round(segurosAApropriar * 100) / 100;
        } catch (e) {
            return acc;
        }
    }, 0);
  }, [segurosVeiculo]);

  const getSegurosAPagar = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date();
    
    return segurosVeiculo.reduce((acc, seguro) => {
        let totalPaid = 0;
        
        seguro.parcelas.forEach(parcela => {
            if (parcela.paga && parcela.transactionId) {
                const paymentTx = transacoesV2.find(t => t.id === parcela.transactionId);
                
                if (paymentTx && parseDateLocal(paymentTx.date) <= date) {
                    totalPaid += paymentTx.amount; 
                }
            }
        });
        
        const segurosAPagar = Math.max(0, seguro.valorTotal - totalPaid);
        
        return acc + Math.round(segurosAPagar * 100) / 100;
    }, 0);
  }, [segurosVeiculo, transacoesV2]);

  // ============================================
  // OPERAÇÕES DE IMPORTED STATEMENTS (FASE 1)
  // ============================================
  
  const applyRules = useCallback((transactions: ImportedTransaction[], rules: StandardizationRule[]): ImportedTransaction[] => {
    return transactions.map(tx => {
      let updatedTx = { ...tx };
      const originalDesc = tx.originalDescription.toLowerCase();
      
      for (const rule of rules) {
        if (originalDesc.includes(rule.pattern.toLowerCase())) {
          updatedTx.categoryId = rule.categoryId;
          updatedTx.operationType = rule.operationType;
          updatedTx.description = rule.descriptionTemplate;
          
          if (rule.operationType === 'transferencia') {
              updatedTx.isTransfer = true;
              updatedTx.destinationAccountId = null;
              updatedTx.tempInvestmentId = null;
              updatedTx.tempLoanId = null;
              updatedTx.tempVehicleOperation = null;
          } else {
              updatedTx.isTransfer = false;
              updatedTx.destinationAccountId = null;
          }
          
          break;
        }
      }
      return updatedTx;
    });
  }, []);

  const processStatementFile = useCallback(async (file: File, accountId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const content = await file.text();
      let rawTransactions: ImportedTransaction[] = [];
      
      if (content.toLowerCase().includes('<ofx>')) {
        rawTransactions = parseOFX(content, accountId);
      } else if (file.name.toLowerCase().endsWith('.csv') || content.includes('\t') || content.includes(',')) {
        rawTransactions = parseCSV(content, accountId);
      } else {
        return { success: false, message: "Formato de arquivo não reconhecido. Use .csv ou .ofx." };
      }
      
      if (rawTransactions.length === 0) {
        return { success: false, message: "Nenhuma transação válida encontrada no arquivo." };
      }
      
      // Aplica as regras de padronização
      const processedTransactions = applyRules(rawTransactions, standardizationRules);
      
      // Determina o período
      const dates = processedTransactions.map(t => parseDateLocal(t.date)).sort((a, b) => a.getTime() - b.getTime());
      const startDate = dates[0] ? format(dates[0], 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];
      const endDate = dates[dates.length - 1] ? format(dates[dates.length - 1], 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];
      
      // Cria o novo extrato
      const newStatement: ImportedStatement = {
          id: generateStatementId(),
          accountId,
          fileName: file.name,
          importDate: new Date().toISOString(),
          startDate,
          endDate,
          status: 'pending',
          rawTransactions: processedTransactions,
      };
      
      setImportedStatements(prev => [...prev, newStatement]);
      
      return { success: true, message: `${processedTransactions.length} transações carregadas do extrato ${file.name}.` };
      
    } catch (e: any) {
      console.error("Parsing Error:", e);
      return { success: false, message: e.message || "Erro ao processar o arquivo. Verifique o formato." };
    }
  }, [standardizationRules, applyRules]);

  const deleteImportedStatement = useCallback((statementId: string) => {
    setImportedStatements(prev => prev.filter(s => s.id !== statementId));
  }, []);
  
  const updateImportedStatement = useCallback((statementId: string, updates: Partial<ImportedStatement>) => {
    setImportedStatements(prev => prev.map(s => s.id === statementId ? { ...s, ...updates } : s));
  }, []);
  
  const getTransactionsForReview = useCallback((accountId: string, range: DateRange): ImportedTransaction[] => {
    const allRawTransactions: ImportedTransaction[] = [];
    
    // 1. Consolidar todas as transações brutas pendentes para a conta
    importedStatements
        .filter(s => s.accountId === accountId)
        .forEach(s => {
            s.rawTransactions
                .filter(t => !t.isContabilized) // Apenas transações não contabilizadas
                .forEach(t => allRawTransactions.push(t));
        });
        
    // 2. Filtrar pelo range de datas
    if (!range.from || !range.to) return allRawTransactions;
    
    const rangeFrom = startOfDay(range.from);
    const rangeTo = endOfDay(range.to);
    
    let filteredTxs = allRawTransactions.filter(t => {
        const transactionDate = parseDateLocal(t.date);
        return isWithinInterval(transactionDate, { start: rangeFrom, end: rangeTo });
    });
    
    // 3. Aplicar regras de padronização (necessário caso novas regras tenham sido criadas)
    filteredTxs = applyRules(filteredTxs, standardizationRules);
    
    // 4. Verificar duplicidade com transações já contabilizadas (transacoesV2)
    const deduplicatedTxs = filteredTxs.map(importedTx => {
        const isDuplicate = transacoesV2.find(manualTx => {
            // Chave de correspondência: Conta, Valor, Fluxo, Data (tolerância de 1 dia)
            const isSameAccount = manualTx.accountId === importedTx.accountId;
            const isSameAmount = Math.abs(manualTx.amount - importedTx.amount) < 0.01; // Tolerância de 1 centavo
            
            // Determinar o fluxo da transação importada (baseado no operationType)
            const importedFlow = getFlowTypeFromOperation(importedTx.operationType || 'despesa');
            
            // Comparar fluxos (simplificado: in/out)
            const isSameFlow = (manualTx.flow === 'in' || manualTx.flow === 'transfer_in') === (importedFlow === 'in' || importedFlow === 'transfer_in');
            
            // Comparar datas (tolerância de 1 dia)
            const importedDate = parseDateLocal(importedTx.date);
            const manualDate = parseDateLocal(manualTx.date);
            const isSameDayOrAdjacent = Math.abs(differenceInDays(importedDate, manualDate)) <= 1;
            
            // Excluir transações de Saldo Inicial da comparação
            const isInitialBalance = manualTx.operationType === 'initial_balance';
            
            return isSameAccount && isSameAmount && isSameFlow && isSameDayOrAdjacent && !isInitialBalance;
        });
        
        if (isDuplicate) {
            return {
                ...importedTx,
                isPotentialDuplicate: true,
                duplicateOfTxId: isDuplicate.id,
                // Se for duplicata, forçamos a categorização para que o usuário possa ignorar facilmente
                operationType: isDuplicate.operationType,
                categoryId: isDuplicate.categoryId,
                description: isDuplicate.description,
            };
        }
        
        return importedTx;
    });
    
    return deduplicatedTxs;
  }, [importedStatements, transacoesV2, standardizationRules, applyRules]);

  // ============================================
  // OPERAÇÕES DE BILL TRACKER (REESCRITAS)
  // ============================================
  
  const addBill = useCallback((bill: Omit<BillTracker, "id" | "isPaid">) => {
    const newBill: BillTracker = {
        ...bill,
        id: generateBillId(),
        isPaid: false,
    };
    // Adiciona apenas contas ad-hoc ao billsTracker global
    setBillsTracker(prev => [...prev, newBill]);
  }, []);

  const updateBill = useCallback((id: string, updates: Partial<BillTracker>) => {
    setBillsTracker(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBillsTracker(prev => prev.filter(b => b.id !== id));
  }, []);
  
  const getRevenueForPreviousMonth = useCallback((date: Date): number => {
    const prevMonth = subMonths(date, 1);
    const prevMonthYear = format(prevMonth, 'yyyy-MM');
    
    return transacoesV2.filter(t => 
        (t.operationType === 'receita' || t.operationType === 'rendimento') && 
        t.date.startsWith(prevMonthYear)
    ).reduce((acc, t) => acc + t.amount, 0);
}, [transacoesV2]);

  const getBillsForMonth = useCallback((date: Date, includeTemplates: boolean): BillTracker[] => {
    const monthYear = format(date, 'yyyy-MM');
    const prevMonth = subMonths(date, 1);
    const prevMonthYear = format(prevMonth, 'yyyy-MM');
    
    // 1. Carregar todas as MODIFICAÇÕES/AD-HOC persistidas para o mês atual
    const persistedModificationsMap = new Map<string, BillTracker>();
    
    billsTracker.forEach(bill => {
        const billDate = parseDateLocal(bill.dueDate);
        
        // Inclui contas ad-hoc (de qualquer mês) E templates modificados/excluídos/pagos do mês atual
        if (bill.sourceType === 'ad_hoc' || isSameMonth(billDate, date)) {
            persistedModificationsMap.set(bill.id, bill);
        }
    });
    
    // Lista de todas as contas (templates + ad-hoc)
    let allBills: BillTracker[] = [];
    
    // 2. Adicionar Contas Ad-Hoc (sempre incluídas)
    Array.from(persistedModificationsMap.values())
        .filter(b => b.sourceType === 'ad_hoc')
        .forEach(b => allBills.push(b));
        
    if (!includeTemplates) {
        // Se não for para incluir templates, retorna apenas as contas ad-hoc e as pagas
        return allBills
            .filter(b => b.isPaid || b.sourceType === 'ad_hoc')
            .sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
    }
    
    // 3. Gerar Templates (Empréstimos, Seguros, Despesas Fixas/Variáveis)
    
    const checkTransactionPayment = (billId: string): TransacaoCompleta | undefined => {
        return transacoesV2.find(t => t.meta?.source === 'bill_tracker' && t.id === billId);
    };
    
    const getPreviousMonthExpense = (categoryId: string): number => {
        const tx = transacoesV2.filter(t => 
            (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo') && 
            t.categoryId === categoryId && 
            t.date.startsWith(prevMonthYear)
        );
        return tx.reduce((acc, t) => acc + t.amount, 0);
    };
    
    // --- 3a. Parcelas de Empréstimo ---
    emprestimos.forEach(loan => {
        if (loan.status !== 'ativo' || !loan.dataInicio || loan.meses === 0) return;
        
        for (let i = 1; i <= loan.meses; i++) {
            const dueDate = getDueDate(loan.dataInicio, i);
            
            if (isSameMonth(dueDate, date)) {
                const billId = `loan_${loan.id}_${i}_${monthYear}`; // ID ÚNICO POR MÊS
                const dueDateStr = format(dueDate, 'yyyy-MM-dd');
                
                const paidTx = transacoesV2.find(t => 
                    t.operationType === 'pagamento_emprestimo' && 
                    t.links?.loanId === `loan_${loan.id}` && 
                    t.links?.parcelaId === i.toString()
                );
                
                const isPaidByTx = !!paidTx;
                const existingModification = persistedModificationsMap.get(billId);
                
                // Se já foi pago, o status é 'pago' e o transactionId é o da transação
                // Se não foi pago, o status é 'pendente'
                
                const baseBill: BillTracker = {
                    id: billId,
                    description: `Parcela ${i}/${loan.meses} - ${loan.contrato}`,
                    dueDate: dueDateStr,
                    expectedAmount: loan.parcela,
                    isPaid: isPaidByTx,
                    paymentDate: paidTx?.date,
                    transactionId: paidTx?.id,
                    sourceType: 'loan_installment',
                    sourceRef: loan.id.toString(),
                    parcelaNumber: i,
                    suggestedAccountId: loan.contaCorrenteId,
                    suggestedCategoryId: categoriasV2.find(c => c.label === 'Pag. Empréstimo')?.id,
                    isExcluded: existingModification?.isExcluded,
                };
                
                // Aplica modificações persistidas (se houver)
                const finalBill = existingModification ? { ...baseBill, ...existingModification } : baseBill;
                
                // Adiciona apenas se NÃO estiver excluído OU se for pago (para mostrar histórico)
                if (!finalBill.isExcluded || finalBill.isPaid) {
                    allBills.push(finalBill);
                }
            }
        }
    });
    
    // --- 3b. Parcelas de Seguro ---
    segurosVeiculo.forEach(seguro => {
        seguro.parcelas.forEach(parcela => {
            const dueDate = parseDateLocal(parcela.vencimento);
            
            if (isSameMonth(dueDate, date)) {
                const billId = `seguro_${seguro.id}_${parcela.numero}_${monthYear}`; // ID ÚNICO POR MÊS
                const dueDateStr = format(dueDate, 'yyyy-MM-dd');
                
                const paidTx = transacoesV2.find(t => 
                    t.links?.vehicleTransactionId === `${seguro.id}_${parcela.numero}`
                );
                
                const isPaidByTx = !!paidTx;
                const existingModification = persistedModificationsMap.get(billId);
                
                const baseBill: BillTracker = {
                    id: billId,
                    description: `Seguro ${seguro.numeroApolice} - Parcela ${parcela.numero}/${seguro.numeroParcelas}`,
                    dueDate: dueDateStr,
                    expectedAmount: parcela.valor,
                    isPaid: isPaidByTx,
                    paymentDate: paidTx?.date,
                    transactionId: paidTx?.id,
                    sourceType: 'insurance_installment',
                    sourceRef: seguro.id.toString(),
                    parcelaNumber: parcela.numero,
                    suggestedAccountId: contasMovimento.find(c => c.accountType === 'conta_corrente')?.id,
                    suggestedCategoryId: categoriasV2.find(c => c.label.toLowerCase() === 'seguro')?.id,
                    isExcluded: existingModification?.isExcluded,
                };
                
                const finalBill = existingModification ? { ...baseBill, ...existingModification } : baseBill;
                
                if (!finalBill.isExcluded || finalBill.isPaid) {
                    allBills.push(finalBill);
                }
            }
        });
    });
    
    // --- 3c. Despesas Fixas e Variáveis (Estimativas) ---
    const expenseCategories = categoriasV2.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel');
    
    expenseCategories.forEach(cat => {
        const isFixed = cat.nature === 'despesa_fixa';
        const dueDate = new Date(date.getFullYear(), date.getMonth(), isFixed ? 10 : 25);
        const dueDateStr = format(dueDate, 'yyyy-MM-dd');
        const billId = `${isFixed ? 'fixed' : 'variable'}_${cat.id}_${monthYear}`; // ID ÚNICO POR MÊS
        
        const existingModification = persistedModificationsMap.get(billId);
        const paidTx = checkTransactionPayment(billId); // Check if paid via bill tracker
        
        const isPaidByTx = !!paidTx;
        
        const baseBill: BillTracker = {
            id: billId,
            description: cat.label,
            dueDate: dueDateStr,
            expectedAmount: existingModification?.expectedAmount || getPreviousMonthExpense(cat.id) || 0,
            isPaid: isPaidByTx,
            paymentDate: paidTx?.date,
            transactionId: paidTx?.id,
            sourceType: isFixed ? 'fixed_expense' : 'variable_expense',
            sourceRef: cat.id,
            suggestedAccountId: existingModification?.suggestedAccountId || contasMovimento.find(c => c.accountType === 'conta_corrente')?.id,
            suggestedCategoryId: cat.id,
            isExcluded: existingModification?.isExcluded,
        };
        
        const finalBill = existingModification ? { ...baseBill, ...existingModification } : baseBill;
        
        if (!finalBill.isExcluded || finalBill.isPaid) {
            allBills.push(finalBill);
        }
    });
    
    // 4. Retorna a lista consolidada e filtrada
    return allBills.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [billsTracker, emprestimos, segurosVeiculo, categoriasV2, transacoesV2, contasMovimento, calculateLoanSchedule]);


  // ============================================
  // OPERAÇÕES DE ENTIDADES V2
// ... (rest of the file)
```

### 2. Atualizando `src/components/bills/BillsTrackerModal.tsx`

Vou ajustar a inicialização do estado local para `localRevenueForecast` para usar a lógica de `null` e garantir que o valor salvo (mesmo que zero) seja respeitado.

<dyad-write path="src/components/bills/BillsTrackerModal.tsx" description="Ajustando a inicialização do localRevenueForecast para respeitar o valor salvo (incluindo zero) e evitar resets indesejados.">
import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Calculator, Menu, LogOut, X, Save, RefreshCw } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsContextSidebar } from "./BillsContextSidebar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker, formatCurrency, TransacaoCompleta, getDomainFromOperation, generateTransactionId, generateBillId } from "@/types/finance";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "sonner";
import { ResizableSidebar } from "../transactions/ResizableSidebar";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";
import { parseDateLocal } from "@/lib/utils";
import { isSameMonth } from "date-fns";

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper para verificar se é um template gerado automaticamente
const isGeneratedTemplate = (bill: BillTracker) => 
    bill.sourceType !== 'ad_hoc' && bill.sourceRef;

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    setBillsTracker, 
    addBill, // <-- USADO DIRETAMENTE
    updateBill, 
    deleteBill, 
    getBillsForMonth, 
    dateRanges,
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
    addTransacaoV2,
    markLoanParcelPaid,
    unmarkLoanParcelPaid,
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid, // <-- FIX: Corrected spelling
    setTransacoesV2,
    contasMovimento, 
    categoriasV2, 
    transacoesV2, // <-- ADDED: Need access to global transactions for deletion
  } = useFinance();
  
  const referenceDate = dateRanges.range1.to || new Date();
  
  // Estado local para manipulação (começa vazio)
  const [localBills, setLocalBills] = useState<BillTracker[]>([]);
  
  // Receita do mês anterior (para sugestão)
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  // Estado local para a previsão de receita
  const [localRevenueForecast, setLocalRevenueForecast] = useState<number>(() => 
    monthlyRevenueForecast !== null ? monthlyRevenueForecast : previousMonthRevenue
  );
  
  // --- Refresh Logic (Always generates the full list) ---
  const handleRefreshList = useCallback(() => {
    // Generate the full list including templates
    const generatedBills = getBillsForMonth(referenceDate, true);
    setLocalBills(generatedBills);
    // Ensure forecast is also refreshed, respecting explicit 0
    setLocalRevenueForecast(monthlyRevenueForecast !== null ? monthlyRevenueForecast : previousMonthRevenue); 
    toast.info("Lista de contas atualizada manualmente.");
  }, [getBillsForMonth, referenceDate, monthlyRevenueForecast, previousMonthRevenue]);

  // Initial load when modal opens
  useEffect(() => {
    if (open) {
      // Inicializa o estado local com a lista gerada automaticamente
      const generatedBills = getBillsForMonth(referenceDate, true);
      setLocalBills(generatedBills);
      // Use global forecast if set, otherwise use previous month's revenue as suggestion
      setLocalRevenueForecast(monthlyRevenueForecast !== null ? monthlyRevenueForecast : previousMonthRevenue);
    }
  }, [open, monthlyRevenueForecast, previousMonthRevenue, getBillsForMonth, referenceDate]);

  // Totais baseados no estado local
  const totalExpectedExpense = useMemo(() => 
    localBills.filter(b => !b.isExcluded).reduce((acc, b) => acc + b.expectedAmount, 0),
    [localBills]
  );
  
  const totalPaid = useMemo(() => 
    localBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0),
    [localBills]
  );
  
  const totalBills = localBills.length;
  const paidCount = localBills.filter(b => b.isPaid).length;
  const pendingCount = totalBills - paidCount;
  
  const netForecast = localRevenueForecast - totalExpectedExpense;

  // Handlers para BillsTrackerList (operam no estado local)
  const handleUpdateBillLocal = useCallback((id: string, updates: Partial<BillTracker>) => {
    setLocalBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const handleDeleteBillLocal = useCallback((id: string) => {
    // Note: This handler is currently not used by BillsTrackerList, which uses handleExcludeBill
    setLocalBills(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleTogglePaidLocal = useCallback((bill: BillTracker, isChecked: boolean) => {
    // Uses the current system date for payment
    const today = new Date();
    
    setLocalBills(prev => prev.map(b => {
        if (b.id === bill.id) {
            return { 
                ...b, 
                isPaid: isChecked,
                // Uses the current system date for payment
                paymentDate: isChecked ? format(today, 'yyyy-MM-dd') : undefined,
                // Preserve existing transactionId if available, otherwise generate a new one if paying
                transactionId: isChecked ? b.transactionId || generateTransactionId() : undefined,
            };
        }
        return b;
    }));
  }, []);

  // Lógica de Persistência (Salvar e Sair)
  const handleSaveAndClose = () => {
    // 1. Persiste a previsão de receita
    setMonthlyRevenueForecast(localRevenueForecast);
    
    // 2. Sincroniza o estado local com o estado global (BillsTracker)
    
    // Mapeia o estado global atual do billsTracker
    const originalBillsMap = new Map(billsTracker.map(b => [b.id, b]));
    
    const newTransactions: TransacaoCompleta[] = [];
    const transactionsToRemove: string[] = [];
    
    // Filtra o billsTracker global para manter apenas contas de outros meses
    // e contas ad-hoc (que são sempre persistidas)
    let finalBillsTracker: BillTracker[] = billsTracker.filter(b => {
        const isCurrentMonth = isSameMonth(parseDateLocal(b.dueDate), referenceDate);
        return !isCurrentMonth || b.sourceType === 'ad_hoc';
    });
    
    // Itera sobre as contas LOCAIS (localBills) para ver o que mudou
    localBills.forEach(localVersion => {
        const originalBill = originalBillsMap.get(localVersion.id);
        
        const wasPaid = originalBill?.isPaid || false;
        const isNowPaid = localVersion.isPaid;
        const isTemplate = isGeneratedTemplate(localVersion);
        
        // Verifica se houve qualquer alteração que precise ser persistida
        const hasNonPaymentChanges = 
            localVersion.isExcluded !== originalBill?.isExcluded || 
            localVersion.expectedAmount !== originalBill?.expectedAmount || 
            localVersion.suggestedAccountId !== originalBill?.suggestedAccountId;
            
        // --- A. Handle Payment (isNowPaid && !wasPaid) ---
        if (isNowPaid && !wasPaid) {
            const bill = localVersion;
            const paymentDate = bill.paymentDate || format(new Date(), 'yyyy-MM-dd'); 
            const transactionId = bill.transactionId || generateTransactionId(); 
            
            const suggestedAccount = contasMovimento.find(c => c.id === bill.suggestedAccountId);
            if (!suggestedAccount) {
                toast.error(`Erro: Conta de débito para ${bill.description} não encontrada.`);
                return;
            }
            
            let operationType: TransacaoCompleta['operationType'] = 'despesa';
            let loanIdLink: string | null = null;
            let parcelaIdLink: string | null = null;
            let vehicleTransactionIdLink: string | null = null;
            
            if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
              operationType = 'pagamento_emprestimo';
              loanIdLink = `loan_${bill.sourceRef}`;
              parcelaIdLink = bill.parcelaNumber.toString();
            } else if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
              operationType = 'despesa';
              vehicleTransactionIdLink = `${bill.sourceRef}_${bill.parcelaNumber}`;
            }

            const newTransaction: TransacaoCompleta = {
              id: transactionId,
              date: paymentDate,
              accountId: suggestedAccount.id,
              flow: 'out',
              operationType,
              domain: getDomainFromOperation(operationType),
              amount: bill.expectedAmount,
              categoryId: bill.suggestedCategoryId || null,
              description: bill.description,
              links: {
                investmentId: null,
                loanId: loanIdLink,
                transferGroupId: null,
                parcelaId: parcelaIdLink,
                vehicleTransactionId: vehicleTransactionIdLink,
              },
              conciliated: false,
              attachments: [],
              meta: {
                createdBy: 'system',
                source: 'bill_tracker',
                createdAt: format(new Date(), 'yyyy-MM-dd'),
              }
            };
            
            newTransactions.push(newTransaction);
            
            // Marca no contexto (Empréstimo/Seguro)
            if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
                const loanId = parseInt(bill.sourceRef);
                if (!isNaN(loanId)) {
                    markLoanParcelPaid(loanId, bill.expectedAmount, paymentDate, bill.parcelaNumber);
                }
            } else if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
                const seguroId = parseInt(bill.sourceRef);
                if (!isNaN(seguroId)) {
                    markSeguroParcelPaid(seguroId, bill.parcelaNumber, transactionId);
                }
            }
            
            // Se for template ou ad-hoc, salva a versão paga no billsTracker global
            // (Templates pagos são salvos para rastreamento de histórico)
            if (isTemplate || localVersion.sourceType === 'ad_hoc') {
                finalBillsTracker = finalBillsTracker.filter(b => b.id !== localVersion.id);
                finalBillsTracker.push({ ...localVersion, transactionId });
            }
            
        } 
        // --- B. Handle Unpayment (wasPaid && !isNowPaid) ---
        else if (wasPaid && !isNowPaid) {
            const bill = originalBill!; 
            
            if (bill.transactionId) {
                transactionsToRemove.push(bill.transactionId);
                
                // Remove do contexto (Empréstimo/Seguro)
                if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
                    const loanId = parseInt(bill.sourceRef);
                    if (!isNaN(loanId)) {
                        unmarkLoanParcelPaid(loanId);
                    }
                } else if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
                    const seguroId = parseInt(bill.sourceRef);
                    if (!isNaN(seguroId)) {
                        unmarkSeguroParcelPaid(seguroId, bill.parcelaNumber); 
                    }
                }
            }
            
            // Se for template ou ad-hoc, salva a versão pendente no billsTracker global
            if (isTemplate || localVersion.sourceType === 'ad_hoc') {
                const updatedBill = { ...localVersion, isPaid: false, paymentDate: undefined, transactionId: undefined };
                finalBillsTracker = finalBillsTracker.filter(b => b.id !== localVersion.id);
                finalBillsTracker.push(updatedBill);
            }
        } 
        // --- C. Handle Non-Payment Changes (Exclusion/Value/Account) ---
        else if (hasNonPaymentChanges) {
            
            // Se for um template, salva a modificação no billsTracker global
            if (isTemplate) {
                // Apenas salva a modificação se for do mês atual (para que getBillsForMonth a encontre)
                if (isSameMonth(parseDateLocal(localVersion.dueDate), referenceDate)) {
                    finalBillsTracker = finalBillsTracker.filter(b => b.id !== localVersion.id);
                    finalBillsTracker.push(localVersion);
                }
            }
            
            // Se for ad-hoc, salva a versão mais recente
            if (localVersion.sourceType === 'ad_hoc') {
                finalBillsTracker = finalBillsTracker.filter(b => b.id !== localVersion.id);
                finalBillsTracker.push(localVersion);
            }
        }
        // --- D. Handle Paid but Unchanged (wasPaid && isNowPaid) ---
        else if (wasPaid && isNowPaid) {
            // Se for um template pago, garantimos que ele seja re-adicionado ao billsTracker
            // para preservar o registro de pagamento/modificação para o mês atual.
            if (isTemplate) {
                finalBillsTracker = finalBillsTracker.filter(b => b.id !== localVersion.id);
                finalBillsTracker.push(localVersion);
            }
            // Se for ad-hoc, já foi incluído no filtro inicial ou será re-adicionado em C.
            // Se for ad-hoc e não tiver alterações, ele já está em finalBillsTracker (do filtro inicial).
        }
    });
    
    // 3. Filtra bills excluídas permanentemente (apenas ad-hoc)
    finalBillsTracker = finalBillsTracker.filter(b => 
        !(b.sourceType === 'ad_hoc' && b.isExcluded)
    );
    
    // 4. Persiste o billsTracker atualizado
    setBillsTracker(finalBillsTracker);
    
    // 5. Remove transações estornadas do contexto global
    setTransacoesV2(prev => prev.filter(t => !transactionsToRemove.includes(t.id)));
    
    // 6. Adiciona novas transações ao contexto
    newTransactions.forEach(t => addTransacaoV2(t));
    
    onOpenChange(false);
    toast.success("Contas pagas e alterações salvas!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent 
        storageKey="bills_tracker_modal"
        initialWidth={1000}
        initialHeight={700}
        minWidth={700}
        minHeight={500}
        hideCloseButton={true} 
      >
        
        {/* Header Principal - Ultra Compacto */}
        <DialogHeader className="border-b pb-2 pt-3 px-4 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              Contas a Pagar - {format(referenceDate, 'MMMM/yyyy')}
            </DialogTitle>
            
            <div className="flex items-center gap-3 text-sm">
              {/* Botão de Menu (Apenas em telas pequenas) */}
              <Drawer>
                <DrawerTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                    <Menu className="w-4 h-4" />
                    Contexto
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <div className="mx-auto w-full max-w-md">
                    <BillsContextSidebar
                      localRevenueForecast={localRevenueForecast}
                      setLocalRevenueForecast={setLocalRevenueForecast}
                      previousMonthRevenue={previousMonthRevenue}
                      totalExpectedExpense={totalExpectedExpense}
                      totalPaid={totalPaid}
                      pendingCount={pendingCount}
                      netForecast={netForecast}
                      isMobile={true}
                      onSaveAndClose={handleSaveAndClose}
                      onRefreshList={handleRefreshList} 
                    />
                  </div>
                </DrawerContent>
              </Drawer>
              
              {/* Contagem de Status (Visível em todas as telas) */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1 text-destructive">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{pendingCount} Pendentes</span>
                </div>
                <div className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-xs">{paidCount} Pagas</span>
                </div>
              </div>
              
              {/* Botão de fechar (Visível em todas as telas) */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleSaveAndClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        {/* Conteúdo Principal (2 Colunas) */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Coluna 1: Sidebar de Contexto (Fixo em telas grandes) */}
          <ResizableSidebar
            initialWidth={240}
            minWidth={200}
            maxWidth={350}
            storageKey="bills_sidebar_width"
          >
            <BillsContextSidebar
              localRevenueForecast={localRevenueForecast}
              setLocalRevenueForecast={setLocalRevenueForecast}
              previousMonthRevenue={previousMonthRevenue}
              totalExpectedExpense={totalExpectedExpense}
              totalPaid={totalPaid}
              pendingCount={pendingCount}
              netForecast={netForecast}
              onSaveAndClose={handleSaveAndClose}
              onRefreshList={handleRefreshList} 
            />
          </ResizableSidebar>

          {/* Coluna 2: Lista de Transações (Ocupa o espaço restante) */}
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2">
            <BillsTrackerList
              bills={localBills} // Usa o estado local
              onUpdateBill={handleUpdateBillLocal}
              onDeleteBill={handleDeleteBillLocal}
              onAddBill={handleAddBillAndRefresh} // Passa o novo handler
              onTogglePaid={handleTogglePaidLocal} // Novo handler
              currentDate={referenceDate}
            />
          </div>
        </div>
      </ResizableDialogContent>
    </Dialog>
  );
}