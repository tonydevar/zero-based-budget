const TABS = [
  { id: 'spending', label: '🏷️ Spending by Category' },
  { id: 'income', label: '📊 Income vs Expense' },
  { id: 'networth', label: '📈 Net Worth' },
  { id: 'aom', label: '⏱️ Age of Money' },
];

export default function ReportTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === tab.id
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
