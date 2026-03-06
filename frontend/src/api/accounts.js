import { api } from './client.js';

export const accountsApi = {
  getAccounts: () => api.get('/accounts'),
  createAccount: (data) => api.post('/accounts', data),
  updateAccount: (id, data) => api.put(`/accounts/${id}`, data),
  closeAccount: (id) => api.delete(`/accounts/${id}`),

  getTransactions: (accountId, page = 1, limit = 50) =>
    api.get(`/accounts/${accountId}/transactions?page=${page}&limit=${limit}`),
  createTransaction: (data) => api.post('/transactions', data),
  updateTransaction: (id, data) => api.put(`/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/transactions/${id}`),
  clearTransaction: (id) => api.put(`/transactions/${id}/clear`, {}),
};
