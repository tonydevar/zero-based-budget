import { api } from './client.js';

export const categoriesApi = {
  getGroups: () => api.get('/category-groups'),
  createGroup: (name) => api.post('/category-groups', { name }),
  updateGroup: (id, data) => api.put(`/category-groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/category-groups/${id}`),

  createCategory: (groupId, name) =>
    api.post('/categories', { category_group_id: groupId, name }),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  reorder: (items) => api.put('/categories/reorder', { items }),
};
