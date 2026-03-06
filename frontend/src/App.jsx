import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import BudgetPage from './pages/BudgetPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import { useUiStore } from './store/uiStore.js';
import { useAccountStore } from './store/accountStore.js';
import { getCurrentMonth } from './utils/dates.js';

export default function App() {
  const initDarkMode = useUiStore((s) => s.initDarkMode);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);

  useEffect(() => {
    initDarkMode();
    fetchAccounts();
  }, [initDarkMode, fetchAccounts]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/budget/${getCurrentMonth()}`} replace />} />
        <Route element={<Layout />}>
          <Route path="/budget" element={<Navigate to={`/budget/${getCurrentMonth()}`} replace />} />
          <Route path="/budget/:month" element={<BudgetPage />} />
          <Route path="/accounts/:id" element={<AccountPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
