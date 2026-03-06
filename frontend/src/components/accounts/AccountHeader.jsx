import { formatCents } from '../../utils/currency.js';

export default function AccountHeader({ account, onReconcile }) {
  if (!account) return null;

  const typeLabels = {
    checking: 'Checking',
    savings: 'Savings',
    credit_card: 'Credit Card',
    cash: 'Cash',
    investment: 'Investment',
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{account.name}</h1>
            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full">
              {typeLabels[account.type] || account.type}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span>
              Cleared:{' '}
              <span
                className={`font-semibold ${
                  account.cleared_balance < 0
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {formatCents(account.cleared_balance)}
              </span>
            </span>
            {account.uncleared_balance !== 0 && (
              <span>
                Uncleared:{' '}
                <span
                  className={`font-semibold ${
                    account.uncleared_balance < 0
                      ? 'text-orange-500 dark:text-orange-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {formatCents(account.uncleared_balance)}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div
              className={`text-2xl font-bold tabular-nums ${
                account.balance < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {formatCents(account.balance)}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Total Balance</div>
          </div>
          <button
            onClick={onReconcile}
            className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
          >
            Reconcile
          </button>
        </div>
      </div>
    </div>
  );
}
