import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAccountStore } from '../store/accountStore.js';
import { useBudgetStore } from '../store/budgetStore.js';
import { categoriesApi } from '../api/categories.js';
import AccountHeader from '../components/accounts/AccountHeader.jsx';
import TransactionRegister from '../components/accounts/TransactionRegister.jsx';
import ReconciliationModal from '../components/accounts/ReconciliationModal.jsx';
import Spinner from '../components/shared/Spinner.jsx';
import EmptyState from '../components/shared/EmptyState.jsx';

export default function AccountPage() {
  const { id } = useParams();
  const accountId = Number(id);

  const accounts = useAccountStore((s) => s.accounts);
  const transactions = useAccountStore((s) => s.transactions);
  const loading = useAccountStore((s) => s.loading);
  const error = useAccountStore((s) => s.error);
  const fetchTransactions = useAccountStore((s) => s.fetchTransactions);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);

  const fetchBudget = useBudgetStore((s) => s.fetchBudget);
  const budgetMonth = useBudgetStore((s) => s.month);

  const [categoryGroups, setCategoryGroups] = useState([]);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileChecked, setReconcileChecked] = useState(new Set());
  const [reconcileMode, setReconcileMode] = useState(false);

  const account = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  );

  // Load transactions when account changes
  useEffect(() => {
    if (accountId) {
      fetchTransactions(accountId, 1);
    }
  }, [accountId, fetchTransactions]);

  // Load category groups for the transaction form
  useEffect(() => {
    categoriesApi.getGroups().then(setCategoryGroups).catch(() => {});
  }, []);

  const handleReconcileToggle = (txId) => {
    setReconcileChecked((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const handleReconciled = async () => {
    setReconcileOpen(false);
    setReconcileMode(false);
    setReconcileChecked(new Set());
    await fetchTransactions(accountId, 1);
    await fetchAccounts();
    await fetchBudget(budgetMonth);
  };

  if (!account && !loading) {
    return (
      <EmptyState
        icon="🏦"
        title="Account not found"
        description="This account doesn't exist or has been removed."
      />
    );
  }

  if (!account && loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AccountHeader
        account={account}
        onReconcile={() => setReconcileOpen(true)}
      />

      {error ? (
        <EmptyState
          icon="⚠️"
          title="Failed to load transactions"
          description={error}
          action={
            <button
              onClick={() => fetchTransactions(accountId, 1)}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          }
        />
      ) : (
        <TransactionRegister
          accountId={accountId}
          accounts={accounts}
          categoryGroups={categoryGroups}
          reconcileMode={reconcileMode}
          reconcileChecked={reconcileChecked}
          onReconcileToggle={handleReconcileToggle}
        />
      )}

      <ReconciliationModal
        open={reconcileOpen}
        onClose={() => { setReconcileOpen(false); setReconcileMode(false); setReconcileChecked(new Set()); }}
        account={account}
        transactions={transactions}
        onReconciled={handleReconciled}
      />
    </div>
  );
}
