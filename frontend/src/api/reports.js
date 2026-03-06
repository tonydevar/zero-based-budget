import { api } from './client.js';

export const reportsApi = {
  getSpendingByCategory: (start, end) =>
    api.get(`/reports/spending-by-category?start=${start}&end=${end}`),
  getIncomeVsExpense: (months = 12) =>
    api.get(`/reports/income-vs-expense?months=${months}`),
  getNetWorth: (months = 12) =>
    api.get(`/reports/net-worth?months=${months}`),
  getAgeOfMoney: () => api.get('/reports/age-of-money'),
};
