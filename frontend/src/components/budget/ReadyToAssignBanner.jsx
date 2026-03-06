import { formatCents } from '../../utils/currency.js';

export default function ReadyToAssignBanner({ amount }) {
  const isNegative = amount < 0;
  const isZero = amount === 0;

  const bgClass = isNegative
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : isZero
    ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';

  const amountClass = isNegative
    ? 'text-red-600 dark:text-red-400'
    : isZero
    ? 'text-slate-500 dark:text-slate-400'
    : 'text-green-600 dark:text-green-400';

  const label = isNegative ? 'Overassigned' : isZero ? 'Fully Assigned' : 'Ready to Assign';

  return (
    <div className={`flex flex-col items-center justify-center px-6 py-3 rounded-xl border transition-all ${bgClass}`}>
      <span className={`text-2xl font-bold tabular-nums transition-all ${amountClass}`}>
        {formatCents(Math.abs(amount))}
      </span>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}
