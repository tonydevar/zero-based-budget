import { useState } from 'react';
import { formatCents, parseCurrencyInput } from '../../utils/currency.js';

export default function TransactionRow({
  transaction,
  accounts,
  categoryGroups,
  onToggleClear,
  onUpdate,
  onDelete,
  reconcileMode,
  reconcileChecked,
  onReconcileToggle,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  const isTransfer = !!transaction.transfer_transaction_id;
  const isIncome = transaction.is_income;
  const amount = transaction.amount;
  const isOutflow = amount < 0;

  const getCategoryDisplay = () => {
    if (isTransfer) {
      return transaction.transfer_account_name
        ? `Transfer: ${transaction.transfer_account_name}`
        : 'Transfer';
    }
    if (isIncome) return '(Income)';
    return transaction.category_name || '—';
  };

  const startEdit = () => {
    if (transaction.reconciled) return;
    const outflow = amount < 0 ? (-amount / 100).toFixed(2) : '';
    const inflow = amount > 0 ? (amount / 100).toFixed(2) : '';
    let categoryKey = '';
    if (isTransfer) {
      const destId = accounts.find((a) => a.name === transaction.transfer_account_name)?.id;
      categoryKey = destId ? `transfer:${destId}` : '';
    } else if (isIncome) {
      categoryKey = 'income';
    } else if (transaction.category_id) {
      categoryKey = `cat:${transaction.category_id}`;
    }

    setForm({
      date: transaction.date,
      payee: transaction.payee || '',
      categoryKey,
      memo: transaction.memo || '',
      outflow,
      inflow,
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
  };

  const saveEdit = async () => {
    const outflowCents = parseCurrencyInput(form.outflow);
    const inflowCents = parseCurrencyInput(form.inflow);
    const amount = inflowCents > 0 ? inflowCents : -outflowCents;

    const patch = {
      date: form.date,
      payee: form.payee || null,
      memo: form.memo || null,
      amount,
    };

    if (!isTransfer) {
      if (form.categoryKey.startsWith('cat:')) {
        patch.category_id = Number(form.categoryKey.split(':')[1]);
        patch.is_income = false;
      } else if (form.categoryKey === 'income') {
        patch.category_id = null;
        patch.is_income = true;
      } else {
        patch.category_id = null;
        patch.is_income = false;
      }
    }

    await onUpdate(transaction.id, patch);
    setEditing(false);
    setForm(null);
  };

  const otherAccounts = accounts.filter(
    (a) => a.id !== transaction.account_id && !a.closed
  );

  const rowClass = `group flex items-center text-sm border-b border-slate-100 dark:border-slate-700/50 ${
    transaction.reconciled
      ? 'opacity-60'
      : reconcileMode && !reconcileChecked
      ? 'bg-amber-50/50 dark:bg-amber-900/10'
      : reconcileMode && reconcileChecked
      ? 'bg-green-50/50 dark:bg-green-900/10'
      : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/20'
  }`;

  if (editing && form) {
    return (
      <div className="border-b border-primary-200 dark:border-primary-800 bg-blue-50 dark:bg-blue-900/10">
        <div className="flex items-center gap-1 px-3 py-2">
          {/* Cleared placeholder */}
          <div className="w-8 flex-shrink-0" />

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className="w-32 flex-shrink-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
          />

          <input
            type="text"
            value={form.payee}
            onChange={(e) => setForm((p) => ({ ...p, payee: e.target.value }))}
            placeholder="Payee"
            className="flex-1 min-w-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
          />

          {isTransfer ? (
            <div className="w-44 flex-shrink-0 px-2 py-1 text-sm text-slate-500 dark:text-slate-400 italic">
              {getCategoryDisplay()}
            </div>
          ) : (
            <select
              value={form.categoryKey}
              onChange={(e) => setForm((p) => ({ ...p, categoryKey: e.target.value }))}
              className="w-44 flex-shrink-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
            >
              <option value="">— Category —</option>
              <option value="income">Income (no category)</option>
              {otherAccounts.length > 0 && (
                <optgroup label="Transfers">
                  {otherAccounts.map((a) => (
                    <option key={a.id} value={`transfer:${a.id}`}>
                      Transfer: {a.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {categoryGroups.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  {group.categories.map((cat) => (
                    <option key={cat.id} value={`cat:${cat.id}`}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          <input
            type="text"
            value={form.memo}
            onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
            placeholder="Memo"
            className="flex-1 min-w-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
          />

          <input
            type="number"
            value={form.outflow}
            onChange={(e) => { setForm((p) => ({ ...p, outflow: e.target.value })); if (e.target.value) setForm((p) => ({ ...p, inflow: '' })); }}
            placeholder="Outflow"
            step="0.01"
            min="0"
            className="w-24 flex-shrink-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm text-right bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
          />

          <input
            type="number"
            value={form.inflow}
            onChange={(e) => { setForm((p) => ({ ...p, inflow: e.target.value })); if (e.target.value) setForm((p) => ({ ...p, outflow: '' })); }}
            placeholder="Inflow"
            step="0.01"
            min="0"
            className="w-24 flex-shrink-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm text-right bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
          />

          <div className="w-28 flex-shrink-0" />

          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={saveEdit}
              className="px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs transition-colors"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={rowClass}>
      {/* Reconcile checkbox (reconcile mode) or cleared checkbox */}
      <div className="w-8 flex-shrink-0 flex justify-center py-2.5 pl-3">
        {reconcileMode ? (
          <input
            type="checkbox"
            checked={reconcileChecked}
            onChange={() => onReconcileToggle(transaction.id)}
            disabled={transaction.reconciled || transaction.cleared === false}
            className="w-4 h-4 rounded accent-green-600"
          />
        ) : (
          <button
            onClick={() => !transaction.reconciled && onToggleClear(transaction.id)}
            disabled={transaction.reconciled}
            title={transaction.reconciled ? 'Reconciled' : transaction.cleared ? 'Cleared (click to uncheck)' : 'Uncleared (click to clear)'}
            className={`w-5 h-5 rounded text-xs flex items-center justify-center transition-colors ${
              transaction.reconciled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-default'
                : transaction.cleared
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-pointer'
                : 'border border-slate-300 dark:border-slate-600 text-slate-300 hover:border-blue-400 hover:text-blue-400 cursor-pointer'
            }`}
          >
            {transaction.reconciled ? '✓' : transaction.cleared ? 'C' : ''}
          </button>
        )}
      </div>

      {/* Date */}
      <div
        className="w-32 flex-shrink-0 px-2 py-2.5 text-slate-600 dark:text-slate-300 cursor-pointer"
        onClick={startEdit}
      >
        {transaction.date}
      </div>

      {/* Payee */}
      <div
        className="flex-1 min-w-0 px-2 py-2.5 text-slate-800 dark:text-slate-100 truncate cursor-pointer"
        onClick={startEdit}
      >
        {transaction.payee || <span className="text-slate-400 dark:text-slate-500 italic">—</span>}
      </div>

      {/* Category */}
      <div
        className="w-44 flex-shrink-0 px-2 py-2.5 text-slate-600 dark:text-slate-300 truncate cursor-pointer"
        onClick={startEdit}
      >
        {getCategoryDisplay()}
      </div>

      {/* Memo */}
      <div
        className="flex-1 min-w-0 px-2 py-2.5 text-slate-400 dark:text-slate-500 truncate text-xs cursor-pointer"
        onClick={startEdit}
      >
        {transaction.memo || ''}
      </div>

      {/* Outflow */}
      <div className="w-24 flex-shrink-0 px-2 py-2.5 text-right tabular-nums">
        {amount < 0 ? (
          <span className="text-slate-800 dark:text-slate-100">{formatCents(-amount)}</span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </div>

      {/* Inflow */}
      <div className="w-24 flex-shrink-0 px-2 py-2.5 text-right tabular-nums">
        {amount > 0 ? (
          <span className="text-green-600 dark:text-green-400">{formatCents(amount)}</span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </div>

      {/* Running balance */}
      <div
        className={`w-28 flex-shrink-0 px-2 py-2.5 text-right tabular-nums font-medium ${
          (transaction.running_balance ?? 0) < 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {transaction.running_balance !== null && transaction.running_balance !== undefined
          ? formatCents(transaction.running_balance)
          : '—'}
      </div>

      {/* Delete */}
      <div className="w-8 flex-shrink-0 flex justify-center relative py-2.5 pr-2">
        {!transaction.reconciled && (
          <>
            <button
              onClick={() => setShowDelete((v) => !v)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-all text-xs"
              title="Delete transaction"
            >
              🗑
            </button>
            {showDelete && (
              <div className="absolute right-0 top-full z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-2 w-44">
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">Delete this transaction?</p>
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={() => setShowDelete(false)}
                    className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowDelete(false); onDelete(transaction.id); }}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
