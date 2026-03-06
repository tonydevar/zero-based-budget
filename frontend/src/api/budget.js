import { api } from './client.js';

export const budgetApi = {
  getBudget: (month) => api.get(`/budget/${month}`),
  setAssigned: (month, categoryId, assigned) =>
    api.put(`/budget/${month}/${categoryId}`, { assigned }),
};
