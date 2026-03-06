import { create } from 'zustand';
import { budgetApi } from '../api/budget.js';
import { categoriesApi } from '../api/categories.js';
import { reportsApi } from '../api/reports.js';
import { getCurrentMonth } from '../utils/dates.js';

export const useBudgetStore = create((set, get) => ({
  month: getCurrentMonth(),
  readyToAssign: 0,
  ageOfMoney: 0,
  ageTrend: [],
  groups: [],
  loading: false,
  error: null,

  setMonth: (month) => {
    set({ month });
    get().fetchBudget(month);
  },

  fetchBudget: async (month) => {
    const m = month || get().month;
    set({ loading: true, error: null });
    try {
      // Fetch budget data and AoM trend in parallel
      const [data, aomData] = await Promise.all([
        budgetApi.getBudget(m),
        reportsApi.getAgeOfMoney().catch(() => null),
      ]);
      set({
        month: m,
        readyToAssign: data.readyToAssign,
        ageOfMoney: data.ageOfMoney,
        ageTrend: aomData?.trend ?? [],
        groups: data.groups,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  setAssigned: async (categoryId, cents) => {
    const { month } = get();

    // Optimistic update
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        categories: g.categories.map((c) =>
          c.id === categoryId ? { ...c, assigned: cents } : c
        ),
      })),
    }));

    try {
      const result = await budgetApi.setAssigned(month, categoryId, cents);
      // Update with server response
      set((state) => ({
        readyToAssign: result.readyToAssign,
        groups: state.groups.map((g) => ({
          ...g,
          categories: g.categories.map((c) =>
            c.id === categoryId
              ? { ...c, assigned: result.assigned, activity: result.activity, available: result.available }
              : c
          ),
        })),
      }));
    } catch (err) {
      // Revert optimistic update on error
      get().fetchBudget(month);
      throw err;
    }
  },

  createGroup: async (name) => {
    const group = await categoriesApi.createGroup(name);
    set((state) => ({
      groups: [...state.groups, { ...group, categories: [] }],
    }));
    return group;
  },

  updateGroup: async (id, patch) => {
    const updated = await categoriesApi.updateGroup(id, patch);
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? { ...g, ...updated } : g)),
    }));
    return updated;
  },

  deleteGroup: async (id) => {
    await categoriesApi.deleteGroup(id);
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
    }));
  },

  createCategory: async (groupId, name) => {
    const cat = await categoriesApi.createCategory(groupId, name);
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, categories: [...g.categories, { ...cat, assigned: 0, activity: 0, available: 0 }] }
          : g
      ),
    }));
    return cat;
  },

  updateCategory: async (id, patch) => {
    const updated = await categoriesApi.updateCategory(id, patch);
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        categories: g.categories.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      })),
    }));
    return updated;
  },

  deleteCategory: async (id) => {
    await categoriesApi.deleteCategory(id);
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        categories: g.categories.filter((c) => c.id !== id),
      })),
    }));
  },

  reorderCategories: async (groupId, items) => {
    // Optimistic update
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId) return g;
        const catMap = {};
        for (const c of g.categories) catMap[c.id] = c;
        const reordered = items.map((item) => ({ ...catMap[item.id], sort_order: item.sort_order }));
        return { ...g, categories: reordered };
      }),
    }));
    await categoriesApi.reorder(items);
  },
}));
