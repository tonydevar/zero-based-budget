import { create } from 'zustand';
import { accountsApi } from '../api/accounts.js';

export const useAccountStore = create((set, get) => ({
  accounts: [],
  selectedAccountId: null,
  transactions: [],
  transactionsPage: 1,
  transactionsTotal: 0,
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await accountsApi.getAccounts();
      set({ accounts, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createAccount: async (data) => {
    const account = await accountsApi.createAccount(data);
    set((state) => ({ accounts: [...state.accounts, account] }));
    return account;
  },

  updateAccount: async (id, data) => {
    const updated = await accountsApi.updateAccount(id, data);
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? updated : a)),
    }));
    return updated;
  },

  closeAccount: async (id) => {
    await accountsApi.closeAccount(id);
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, closed: true } : a)),
    }));
  },

  fetchTransactions: async (accountId, page = 1) => {
    set((state) => ({
      loading: true,
      error: null,
      selectedAccountId: accountId,
      // Reset list when fetching page 1 or switching accounts
      transactions: page === 1 || state.selectedAccountId !== accountId ? [] : state.transactions,
    }));
    try {
      const data = await accountsApi.getTransactions(accountId, page);
      set((state) => ({
        transactions:
          page === 1
            ? data.transactions
            : [...state.transactions, ...data.transactions],
        transactionsPage: data.page,
        transactionsTotal: data.total,
        loading: false,
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createTransaction: async (data) => {
    const result = await accountsApi.createTransaction(data);
    const { selectedAccountId } = get();
    if (selectedAccountId) {
      await get().fetchTransactions(selectedAccountId, 1);
    }
    await get().fetchAccounts();
    return result;
  },

  updateTransaction: async (id, data) => {
    const updated = await accountsApi.updateTransaction(id, data);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    }));
    // Refresh to get correct running balances
    const { selectedAccountId } = get();
    if (selectedAccountId) {
      await get().fetchTransactions(selectedAccountId, 1);
    }
    await get().fetchAccounts();
    return updated;
  },

  deleteTransaction: async (id) => {
    await accountsApi.deleteTransaction(id);
    const { selectedAccountId } = get();
    if (selectedAccountId) {
      await get().fetchTransactions(selectedAccountId, 1);
    }
    await get().fetchAccounts();
  },

  clearTransaction: async (id) => {
    const updated = await accountsApi.clearTransaction(id);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    }));
    // Refresh accounts for updated cleared balance
    await get().fetchAccounts();
    return updated;
  },
}));
