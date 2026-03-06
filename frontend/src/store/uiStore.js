import { create } from 'zustand';

const DARK_MODE_KEY = 'zbb-dark-mode';
const SIDEBAR_KEY = 'zbb-sidebar-open';

function loadDarkMode() {
  try {
    return localStorage.getItem(DARK_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

function loadSidebar() {
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export const useUiStore = create((set, get) => ({
  darkMode: loadDarkMode(),
  sidebarOpen: loadSidebar(),

  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    try {
      localStorage.setItem(DARK_MODE_KEY, String(next));
    } catch {
      // ignore
    }
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  toggleSidebar: () => {
    const next = !get().sidebarOpen;
    set({ sidebarOpen: next });
    try {
      localStorage.setItem(SIDEBAR_KEY, String(next));
    } catch {
      // ignore
    }
  },

  initDarkMode: () => {
    const dark = get().darkMode;
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
}));
