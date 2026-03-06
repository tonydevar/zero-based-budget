import { useNavigate, useParams } from 'react-router-dom';
import { prevMonth, nextMonth, monthToLabel, getCurrentMonth } from '../../utils/dates.js';

export default function MonthSelector({ month }) {
  const navigate = useNavigate();

  const goTo = (m) => navigate(`/budget/${m}`);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => goTo(prevMonth(month))}
        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="text-lg font-semibold text-slate-800 dark:text-slate-100 min-w-[160px] text-center">
        {monthToLabel(month)}
      </span>
      <button
        onClick={() => goTo(nextMonth(month))}
        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        aria-label="Next month"
      >
        ›
      </button>
      {month !== getCurrentMonth() && (
        <button
          onClick={() => goTo(getCurrentMonth())}
          className="ml-2 px-2 py-0.5 text-xs text-primary-600 dark:text-blue-400 border border-primary-300 dark:border-blue-600 rounded-full hover:bg-primary-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          Today
        </button>
      )}
    </div>
  );
}
