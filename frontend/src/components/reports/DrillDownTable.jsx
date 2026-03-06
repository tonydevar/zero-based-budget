import { formatCents } from '../../utils/currency.js';

export default function DrillDownTable({ category, transactions, onClose }) {
  const total = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {category.group_name && (
              <span className="text-slate-400 dark:text-slate-500 font-normal mr-1">
                {category.group_name} /
              </span>
            )}
            {category.category_name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} &mdash; Total:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCents(Math.abs(total))}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-sm px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          ✕ Close
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          No transactions found for this category in the selected date range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Payee</th>
                <th className="px-4 py-2 text-left">Memo</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                >
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{tx.date}</td>
                  <td className="px-4 py-2 text-slate-800 dark:text-slate-100">
                    {tx.payee || <span className="text-slate-400 dark:text-slate-500 italic">—</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-400 dark:text-slate-500 text-xs">
                    {tx.memo || ''}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${tx.amount < 0 ? 'text-slate-800 dark:text-slate-100' : 'text-green-600 dark:text-green-400'}`}>
                    {tx.amount < 0 ? formatCents(-tx.amount) : `+${formatCents(tx.amount)}`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Spending</td>
                <td className="px-4 py-2 text-right tabular-nums font-bold text-slate-800 dark:text-slate-100">
                  {formatCents(Math.abs(total))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
