import { prevMonth, getCurrentMonth } from '../../utils/dates.js';

/**
 * Date range (start/end month) and optional months count selector.
 */
export default function ReportControls({ startMonth, endMonth, months, onStartChange, onEndChange, onMonthsChange, showMonths = false }) {
  const currentMonth = getCurrentMonth();

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {showMonths ? (
        <div className="flex items-center gap-2">
          <label className="text-slate-500 dark:text-slate-400 font-medium">Months:</label>
          <select
            value={months}
            onChange={(e) => onMonthsChange(Number(e.target.value))}
            className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
          </select>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 font-medium">From:</label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => onStartChange(e.target.value)}
              max={endMonth}
              className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 font-medium">To:</label>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => onEndChange(e.target.value)}
              min={startMonth}
              max={currentMonth}
              className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
            />
          </div>
        </>
      )}
    </div>
  );
}
