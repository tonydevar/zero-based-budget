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
    set({ loading: true, error: null, selectedAccountId: accountId });
    try {
      const data = await accountsApi.getTransactions(accountId, page);
      set({
        transactions: data.transactions,
        transactionsPage: data.page,
        transactionsTotal: data.total,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createTransaction: async (data) => {
    const result = await accountsApi.createTransaction(data);
    // Refresh transactions for the current account
    const { selectedAccountId } = get();
    if (selectedAccountId) {
      await get().fetchTransactions(selectedAccountId);
    }
    await get().fetchAccounts();
    return result;
  },

  updateTransaction: async (id, data) => {
    const updated = await accountsApi.updateTransaction(id, data);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    }));
    await get().fetchAccounts();
    return updated;
  },

  deleteTransaction: async (id) => {
    await accountsApi.deleteTransaction(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
    await get().fetchAccounts();
  },

  clearTransaction: async (id) => {
    const updated = await accountsApi.clearTransaction(id);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  },
}));
