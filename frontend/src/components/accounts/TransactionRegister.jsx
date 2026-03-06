import { useEffect, useRef, useCallback } from 'react';
import TransactionRow from './TransactionRow.jsx';
import AddTransactionRow from './AddTransactionRow.jsx';
import Spinner from '../shared/Spinner.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { useAccountStore } from '../../store/accountStore.js';

export default function TransactionRegister({
  accountId,
  accounts,
  categoryGroups,
  reconcileMode,
  reconcileChecked,
  onReconcileToggle,
}) {
  const transactions = useAccountStore((s) => s.transactions);
  const transactionsTotal = useAccountStore((s) => s.transactionsTotal);
  const transactionsPage = useAccountStore((s) => s.transactionsPage);
  const loading = useAccountStore((s) => s.loading);
  const fetchTransactions = useAccountStore((s) => s.fetchTransactions);
  const createTransaction = useAccountStore((s) => s.createTransaction);
  const updateTransaction = useAccountStore((s) => s.updateTransaction);
  const deleteTransaction = useAccountStore((s) => s.deleteTransaction);
  const clearTransaction = useAccountStore((s) => s.clearTransaction);

  const sentinelRef = useRef(null);
  const PAGE_SIZE = 50;
  const hasMore = transactions.length < transactionsTotal;

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchTransactions(accountId, transactionsPage + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, accountId, transactionsPage, fetchTransactions]);

  const handleAdd = useCallback(
    async (payload) => {
      await createTransaction(payload);
    },
    [createTransaction]
  );

  const handleUpdate = useCallback(
    async (id, patch) => {
      await updateTransaction(id, patch);
    },
    [updateTransaction]
  );

  const handleDelete = useCallback(
    async (id) => {
      await deleteTransaction(id);
    },
    [deleteTransaction]
  );

  const handleClear = useCallback(
    async (id) => {
      await clearTransaction(id);
    },
    [clearTransaction]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Column headers */}
      <div className="flex items-center bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 sticky top-0 z-10">
        <div className="w-8 flex-shrink-0 pl-3 py-2">✓</div>
        <div className="w-32 flex-shrink-0 px-2 py-2">Date</div>
        <div className="flex-1 min-w-0 px-2 py-2">Payee</div>
        <div className="w-44 flex-shrink-0 px-2 py-2">Category</div>
        <div className="flex-1 min-w-0 px-2 py-2">Memo</div>
        <div className="w-24 flex-shrink-0 px-2 py-2 text-right">Outflow</div>
        <div className="w-24 flex-shrink-0 px-2 py-2 text-right">Inflow</div>
        <div className="w-28 flex-shrink-0 px-2 py-2 text-right">Balance</div>
        <div className="w-8 flex-shrink-0" />
      </div>

      {/* Add transaction row */}
      {!reconcileMode && (
        <AddTransactionRow
          accountId={accountId}
          accounts={accounts}
          categoryGroups={categoryGroups}
          onAdd={handleAdd}
        />
      )}

      {/* Transactions */}
      <div className="flex-1 overflow-auto">
        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No transactions yet"
            description="Add your first transaction above to get started."
          />
        ) : (
          <>
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                accounts={accounts}
                categoryGroups={categoryGroups}
                onToggleClear={handleClear}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                reconcileMode={reconcileMode}
                reconcileChecked={reconcileChecked?.has(tx.id)}
                onReconcileToggle={onReconcileToggle}
              />
            ))}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loading && <Spinner />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
