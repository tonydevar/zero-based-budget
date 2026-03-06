import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAccountStore } from '../../store/accountStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { formatCents } from '../../utils/currency.js';
import AccountListItem from './AccountListItem.jsx';
import Modal from '../shared/Modal.jsx';

export default function Sidebar() {
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const createAccount = useAccountStore((s) => s.createAccount);
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const [accountsExpanded, setAccountsExpanded] = useState(true);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'checking', balance: '' });
  const navigate = useNavigate();

  const onBudgetAccounts = accounts.filter((a) => a.on_budget && !a.closed);
  const totalBalance = onBudgetAccounts.reduce((sum, a) => sum + a.balance, 0);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    const balance = Math.round(parseFloat(newAccount.balance || 0) * 100);
    const acct = await createAccount({ name: newAccount.name, type: newAccount.type, balance });
    setAddAccountOpen(false);
    setNewAccount({ name: '', type: 'checking', balance: '' });
    navigate(`/accounts/${acct.id}`);
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg mx-2 transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
    }`;

  if (!sidebarOpen) {
    return (
      <div className="flex flex-col bg-slate-800 w-12 flex-shrink-0 items-center py-3 gap-4">
        <button
          onClick={toggleSidebar}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700"
          title="Expand sidebar"
        >
          ☰
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col bg-slate-800 w-64 flex-shrink-0 h-full overflow-y-auto">
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              ZBB
            </div>
            <span className="text-white font-semibold text-sm">Zero Budget</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            title="Collapse sidebar"
          >
            ←
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-3 space-y-1">
          <NavLink to="/budget" className={navLinkClass} end={false}>
            <span>📊</span>
            <span>Budget</span>
          </NavLink>
          <NavLink to="/reports" className={navLinkClass}>
            <span>📈</span>
            <span>Reports</span>
          </NavLink>
        </nav>

        {/* Accounts section */}
        <div className="mt-4 flex-1">
          <button
            onClick={() => setAccountsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Accounts</span>
            <span>{accountsExpanded ? '▼' : '▶'}</span>
          </button>

          {accountsExpanded && (
            <div className="mt-1 space-y-0.5">
              {onBudgetAccounts.map((account) => (
                <AccountListItem key={account.id} account={account} />
              ))}

              {/* Total */}
              {onBudgetAccounts.length > 0 && (
                <div className="flex items-center justify-between px-4 py-1.5 text-xs text-slate-500 border-t border-slate-700 mt-1">
                  <span>Total</span>
                  <span className={totalBalance < 0 ? 'text-red-400' : 'text-slate-400'}>
                    {formatCents(totalBalance)}
                  </span>
                </div>
              )}

              <button
                onClick={() => setAddAccountOpen(true)}
                className="w-full text-left px-4 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700/30 transition-colors"
              >
                + Add Account
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span>{darkMode ? '☀️' : '🌙'}</span>
            <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </div>

      {/* Add Account Modal */}
      <Modal open={addAccountOpen} onClose={() => setAddAccountOpen(false)} title="Add Account">
        <form onSubmit={handleAddAccount} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={newAccount.name}
              onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="e.g. Checking Account"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Account Type
            </label>
            <select
              value={newAccount.type}
              onChange={(e) => setNewAccount((p) => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit_card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="investment">Investment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Starting Balance
            </label>
            <input
              type="number"
              value={newAccount.balance}
              onChange={(e) => setNewAccount((p) => ({ ...p, balance: e.target.value }))}
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setAddAccountOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Add Account
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
