import { useState } from 'react';
import { parseCurrencyInput } from '../../utils/currency.js';
import { getCurrentMonth } from '../../utils/dates.js';

export default function AddTransactionRow({ accountId, accounts, categoryGroups, onAdd }) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    payee: '',
    categoryKey: '', // "cat:ID" or "transfer:ID"
    memo: '',
    outflow: '',
    inflow: '',
    cleared: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const outflowCents = parseCurrencyInput(form.outflow);
      const inflowCents = parseCurrencyInput(form.inflow);

      const amount = inflowCents > 0 ? inflowCents : -outflowCents;

      let payload = {
        account_id: accountId,
        date: form.date,
        payee: form.payee || null,
        memo: form.memo || null,
        amount,
        cleared: form.cleared,
      };

      if (form.categoryKey.startsWith('transfer:')) {
        const transferAccountId = Number(form.categoryKey.split(':')[1]);
        payload.transfer_account_id = transferAccountId;
      } else if (form.categoryKey.startsWith('cat:')) {
        const catId = Number(form.categoryKey.split(':')[1]);
        if (catId) payload.category_id = catId;
      } else if (form.categoryKey === 'income') {
        payload.is_income = true;
      }

      await onAdd(payload);

      // Reset form
      setForm({
        date: today,
        payee: '',
        categoryKey: '',
        memo: '',
        outflow: '',
        inflow: '',
        cleared: false,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const otherAccounts = accounts.filter((a) => a.id !== accountId && !a.closed);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/10"
    >
      {error && (
        <div className="px-4 py-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}
      <div className="flex items-center gap-1 px-3 py-2 text-sm">
        {/* Cleared */}
        <div className="w-8 flex justify-center flex-shrink-0">
          <input
            type="checkbox"
            checked={form.cleared}
            onChange={(e) => set('cleared', e.target.checked)}
            className="w-4 h-4 rounded accent-primary-600"
          />
        </div>

        {/* Date */}
        <input
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          required
          className="w-32 flex-shrink-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
        />

        {/* Payee */}
        <input
          type="text"
          value={form.payee}
          onChange={(e) => set('payee', e.target.value)}
          placeholder="Payee"
          className="flex-1 min-w-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
        />

        {/* Category dropdown */}
        <select
          value={form.categoryKey}
          onChange={(e) => set('categoryKey', e.target.value)}
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

        {/* Memo */}
        <input
          type="text"
          value={form.memo}
          onChange={(e) => set('memo', e.target.value)}
          placeholder="Memo"
          className="flex-1 min-w-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
        />

        {/* Outflow */}
        <input
          type="number"
          value={form.outflow}
          onChange={(e) => { set('outflow', e.target.value); if (e.target.value) set('inflow', ''); }}
          placeholder="Outflow"
          step="0.01"
          min="0"
          className="w-24 flex-shrink-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm text-right bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
        />

        {/* Inflow */}
        <input
          type="number"
          value={form.inflow}
          onChange={(e) => { set('inflow', e.target.value); if (e.target.value) set('outflow', ''); }}
          placeholder="Inflow"
          step="0.01"
          min="0"
          className="w-24 flex-shrink-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm text-right bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
        />

        {/* Running balance placeholder */}
        <div className="w-28 flex-shrink-0" />

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {submitting ? '…' : 'Add'}
        </button>
      </div>
    </form>
  );
}
