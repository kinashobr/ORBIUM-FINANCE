import { createContext, useContext, useState, useEffect, ReactNode, useCallback, Dispatch, SetStateAction } from "react";
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
  BillTracker, // NEW
  generateBillId, // NEW
  BillSourceType, // NEW
  StandardizationRule, // <-- NEW IMPORT
  generateRuleId, // <-- NEW IMPORT
  ImportedStatement, // <-- NEW IMPORT
  ImportedTransaction, // <-- NEW IMPORT
  generateStatementId, // <-- NEW IMPORT
} from "@/types/finance";
import { parseISO, startOfMonth, endOfMonth, subDays, differenceInDays, differenceInMonths, addMonths, isBefore, isAfter, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay, subMonths, format, isWithinInterval } from "date-fns"; // Import date-fns helpers
import { parseDateLocal } from "@/lib/utils"; // Importando a nova função

// ============================================
// FUNÇÕES AUXILIARES PARA DATAS
// ============================================

// ... (omitted helper functions for brevity)

// ============================================
// TIPOS DE AMORTIZAÇÃO (PRICE)
// ============================================

export interface AmortizationItem {
  parcela: number;
  juros: number;
  amortizacao: number;
  saldoDevedor: number;
}

// ============================================
// CONTEXTO E HOOK
// ============================================

interface FinanceContextType {
  // ... (omitted context type definitions for brevity)
  contasMovimento: ContaCorrente[];
  setContasMovimento: Dispatch<SetStateAction<ContaCorrente[]>>;
  categoriasV2: Categoria[];
  setCategoriasV2: Dispatch<SetStateAction<Categoria[]>>;
  transacoesV2: TransacaoCompleta[];
  setTransacoesV2: Dispatch<SetStateAction<TransacaoCompleta[]>>;
  addTransacaoV2: (transaction: TransacaoCompleta) => void;
  // ... (omitted other context type definitions for brevity)
  calculateBalanceUpToDate: (accountId: string, targetDate: Date | undefined, transactions: TransacaoCompleta[], accounts: ContaCorrente[]) => number;
  calculateLoanSchedule: (loanId: number) => AmortizationItem[];
  calculatePaidInstallmentsUpToDate: (loanId: number, targetDate: Date) => number;
  getLoanPrincipalRemaining: (targetDate: Date | undefined) => number;
  getCreditCardDebt: (targetDate: Date | undefined) => number;
  getContasCorrentesTipo: () => ContaCorrente[];
  getPendingLoans: () => Emprestimo[];
  getSaldoDevedor: (targetDate?: Date) => number;
  getAtivosTotal: (targetDate?: Date) => number;
  getPassivosTotal: (targetDate?: Date) => number;
  getPatrimonioLiquido: (targetDate?: Date) => number;
  getValorFipeTotal: (targetDate?: Date) => number;
  getSegurosAApropriar: (targetDate: Date | undefined) => number;
  getSegurosAPagar: (targetDate: Date | undefined) => number;
  calculateLoanPrincipalDueInNextMonths: (targetDate: Date, months: number) => number;
  calculateTotalInvestmentBalanceAtDate: (targetDate: Date) => number;
  getTotalReceitas: (range?: DateRange) => number;
  getTotalDespesas: (range?: DateRange) => number;
  getRevenueForPreviousMonth: (currentDate: Date) => number;
  getBillsForPeriod: (targetDate: Date) => BillTracker[];
  monthlyRevenueForecast: number;
  setMonthlyRevenueForecast: (value: number) => void;
  addBill: (bill: Omit<BillTracker, "id" | "isPaid">) => void;
  updateBill: (id: string, updates: Partial<BillTracker>) => void;
  deleteBill: (id: string) => void;
  markLoanParcelPaid: (loanId: number, amount: number, date: string, parcelaNumber?: number) => void;
  unmarkLoanParcelPaid: (loanId: number) => void;
  markSeguroParcelPaid: (seguroId: number, parcelaNumero: number, transactionId: string) => void;
  unmarkSeguroParcelPaid: (seguroId: number, parcelaNumero: number) => void;
  dateRanges: ComparisonDateRanges;
  setDateRanges: Dispatch<SetStateAction<ComparisonDateRanges>>;
  alertStartDate: string;
  setAlertStartDate: (date: string) => void;
  
  // Import/Standardization
  standardizationRules: StandardizationRule[];
  addStandardizationRule: (rule: Omit<StandardizationRule, "id">) => void;
  importedStatements: ImportedStatement[];
  addStatement: (statement: Omit<ImportedStatement, "id" | "status">) => void;
  deleteStatement: (statementId: string) => void;
  markStatementContabilized: (statementIds: string[]) => void;
  getTransactionsForReview: (accountId: string, range: DateRange) => ImportedTransaction[];
  
  // Data Management
  exportData: () => void;
  importData: (file: File) => Promise<{ success: boolean; message: string }>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  // ... (omitted state initialization for brevity)
  const [contasMovimento, setContasMovimento] = useState<ContaCorrente[]>(() => {
    // ... (omitted logic)
  });
  // ... (omitted other state initializations for brevity)
  const [importedStatements, setImportedStatements] = useState<ImportedStatement[]>(() => {
    // ... (omitted logic)
  });
  
  // ... (omitted useEffects and helper functions for brevity)

  // ============================================
  // CORE LOGIC (omitted for brevity)
  // ============================================
  
  // ... (omitted core logic functions for brevity)

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const contextValue = {
    // ... (omitted context value properties for brevity)
    contasMovimento,
    setContasMovimento,
    categoriasV2,
    setCategoriasV2,
    transacoesV2,
    setTransacoesV2,
    addTransacaoV2,
    // ... (omitted other context value properties for brevity)
    calculateBalanceUpToDate,
    calculateLoanSchedule,
    calculatePaidInstallmentsUpToDate,
    getLoanPrincipalRemaining,
    getCreditCardDebt,
    getContasCorrentesTipo,
    getPendingLoans,
    getSaldoDevedor,
    getAtivosTotal,
    getPassivosTotal,
    getPatrimonioLiquido,
    getValorFipeTotal,
    getSegurosAApropriar,
    getSegurosAPagar,
    calculateLoanPrincipalDueInNextMonths,
    calculateTotalInvestmentBalanceAtDate,
    getTotalReceitas,
    getTotalDespesas,
    getRevenueForPreviousMonth,
    getBillsForPeriod,
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    addBill,
    updateBill,
    deleteBill,
    markLoanParcelPaid,
    unmarkLoanParcelPaid,
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid,
    dateRanges,
    setDateRanges,
    alertStartDate,
    setAlertStartDate,
    
    // Import/Standardization
    standardizationRules,
    addStandardizationRule,
    importedStatements,
    addStatement,
    deleteStatement,
    markStatementContabilized,
    getTransactionsForReview,
    
    // Data Management
    exportData,
    importData,
  };

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}