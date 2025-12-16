import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Check, X, Loader2, AlertCircle } from "lucide-react";
import { 
  ContaCorrente, ImportedTransaction, StandardizationRule, OperationType, 
  generateTransactionId, generateTransferGroupId, getDomainFromOperation, 
  ImportedStatement, generateStatementId
} from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { parseDateLocal, cn } from "@/lib/utils";
import { min, max, format } from "date-fns";

// Interface simplificada para Empréstimo
interface LoanInfo {
// ... (rest of the file remains the same)