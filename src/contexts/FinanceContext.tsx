// ... (código existente)

// NEW: Função para obter despesas pagas que não estão no Bills Tracker
const getOtherPaidExpensesForMonth = useCallback((date: Date): ExternalPaidBill[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  
  console.log('DEBUG - getOtherPaidExpensesForMonth - parameters:', {
    date: format(date, 'yyyy-MM-dd'),
    monthStart: format(monthStart, 'yyyy-MM-dd'),
    monthEnd: format(monthEnd, 'yyyy-MM-dd')
  });
  
  // IDs das transações que foram criadas pelo Bills Tracker
  const trackerTxIds = new Set(billsTracker
      .filter(b => b.isPaid && b.transactionId)
      .map(b => b.transactionId!)
  );
  
  console.log('DEBUG - getOtherPaidExpensesForMonth - trackerTxIds:', Array.from(trackerTxIds));
  
  // 1. Filtrar transações de despesa no mês
  const externalExpenses = transacoesV2.filter(t => {
      const transactionDate = parseDateLocal(t.date);
      
      // Deve estar no mês de referência
      const isWithinRefMonth = isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
      if (!isWithinRefMonth) return false;
      
      // Deve ser uma despesa (outflow)
      const isOutflow = t.flow === 'out' || t.flow === 'transfer_out';
      if (!isOutflow) return false;
      
      // Deve ser uma despesa real (não aplicação, resgate, liberação, saldo inicial)
      const isExpenseType = t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo' || t.operationType === 'veiculo';
      if (!isExpenseType) return false;
      
      // Deve ter sido contabilizada (não é uma transação pendente de importação)
      const isContabilized = t.meta.source !== 'import' || t.conciliated;
      if (!isContabilized) return false;
      
      // Deve ser uma transação externa (não gerenciada pelo Bills Tracker)
      const isTrackerManaged = t.meta.source === 'bill_tracker' || trackerTxIds.has(t.id);
      
      const isExternal = !isTrackerManaged;
      
      console.log('DEBUG - getOtherPaidExpensesForMonth - transaction filter:', {
        id: t.id,
        date: t.date,
        accountId: t.accountId,
        flow: t.flow,
        operationType: t.operationType,
        metaSource: t.meta.source,
        conciliated: t.conciliated,
        isWithinRefMonth,
        isOutflow,
        isExpenseType,
        isContabilized,
        isTrackerManaged,
        isExternal
      });
      
      return isExternal;
  });
  
  console.log('DEBUG - getOtherPaidExpensesForMonth - externalExpenses found:', externalExpenses.length);
  
  // 2. Mapear para ExternalPaidBill
  const result = externalExpenses.map(t => ({
      id: t.id,
      type: 'external_paid',
      dueDate: t.date, // Usamos a data da transação como data de vencimento/pagamento
      paymentDate: t.date,
      expectedAmount: t.amount,
      description: t.description,
      suggestedAccountId: t.accountId,
      suggestedCategoryId: t.categoryId,
      sourceType: 'external_expense',
      isPaid: true,
      isExcluded: false,
  }));
  
  console.log('DEBUG - getOtherPaidExpensesForMonth - result:', result.map(r => ({
    description: r.description,
    amount: r.expectedAmount,
    accountId: r.suggestedAccountId
  })));
  
  return result;
}, [billsTracker, transacoesV2]);

// ... (restante do código existente)