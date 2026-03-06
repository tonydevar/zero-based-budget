import { useState, useEffect } from 'react';
import { prevMonth, getCurrentMonth } from '../utils/dates.js';
import { categoriesApi } from '../api/categories.js';
import ReportTabs from '../components/reports/ReportTabs.jsx';
import ReportControls from '../components/reports/ReportControls.jsx';
import SpendingByCategoryChart from '../components/reports/SpendingByCategoryChart.jsx';
import IncomeVsExpenseChart from '../components/reports/IncomeVsExpenseChart.jsx';
import NetWorthChart from '../components/reports/NetWorthChart.jsx';
import AgeOfMoneyReport from '../components/reports/AgeOfMoneyReport.jsx';

const CURRENT_MONTH = getCurrentMonth();

function getDefaultStartMonth() {
  // Default: 12 months ago
  let m = CURRENT_MONTH;
  for (let i = 0; i < 11; i++) m = prevMonth(m);
  return m;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('spending');
  const [startMonth, setStartMonth] = useState(getDefaultStartMonth);
  const [endMonth, setEndMonth] = useState(CURRENT_MONTH);
  const [months, setMonths] = useState(12);
  const [categoryGroups, setCategoryGroups] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  useEffect(() => {
    categoriesApi.getGroups().then(setCategoryGroups).catch(() => {});
  }, []);

  const allCategories = categoryGroups.flatMap((g) => g.categories);

  const toggleCategory = (id) => {
    setCategoryFilter((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const clearFilter = () => setCategoryFilter([]);

  const filterLabel = categoryFilter.length === 0
    ? 'All Categories'
    : `${categoryFilter.length} selected`;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Reports</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Analyze your spending, income, and net worth over time.
            </p>
          </div>
          <ReportTabs activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setShowCategoryFilter(false); }} />
        </div>

        {/* Controls row */}
        {activeTab !== 'aom' && (
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <ReportControls
              startMonth={startMonth}
              endMonth={endMonth}
              months={months}
              onStartChange={setStartMonth}
              onEndChange={setEndMonth}
              onMonthsChange={setMonths}
              showMonths={activeTab === 'income' || activeTab === 'networth'}
            />

            {/* Category filter (spending tab only) */}
            {activeTab === 'spending' && allCategories.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowCategoryFilter((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm transition-colors ${
                    categoryFilter.length > 0
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400'
                  }`}
                >
                  🏷️ {filterLabel}
                  {categoryFilter.length > 0 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); clearFilter(); }}
                      className="ml-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </span>
                  )}
                </button>

                {showCategoryFilter && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-64 max-h-64 overflow-y-auto p-2">
                    <button
                      onClick={clearFilter}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-primary-600 dark:hover:text-blue-400 transition-colors"
                    >
                      Clear all
                    </button>
                    {categoryGroups.map((group) => (
                      <div key={group.id}>
                        <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {group.name}
                        </div>
                        {group.categories.map((cat) => (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={categoryFilter.includes(cat.id)}
                              onChange={() => toggleCategory(cat.id)}
                              className="w-3.5 h-3.5 rounded accent-primary-600"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-200">{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'spending' && (
          <div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Spending by Category
              <span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-2">
                {startMonth} – {endMonth}
              </span>
            </h2>
            <SpendingByCategoryChart
              key={`${startMonth}-${endMonth}-${categoryFilter.join(',')}`}
              startMonth={startMonth}
              endMonth={endMonth}
              categoryFilter={categoryFilter.length > 0 ? categoryFilter : null}
            />
          </div>
        )}

        {activeTab === 'income' && (
          <div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Income vs Expense
              <span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-2">
                Last {months} months
              </span>
            </h2>
            <IncomeVsExpenseChart key={months} months={months} />
          </div>
        )}

        {activeTab === 'networth' && (
          <div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Net Worth Over Time
              <span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-2">
                Last {months} months
              </span>
            </h2>
            <NetWorthChart key={months} months={months} />
          </div>
        )}

        {activeTab === 'aom' && (
          <div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Age of Money
            </h2>
            <AgeOfMoneyReport />
          </div>
        )}
      </div>

      {/* Close category filter dropdown on outside click */}
      {showCategoryFilter && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowCategoryFilter(false)}
        />
      )}
    </div>
  );
}
