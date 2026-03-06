import '../../utils/chartSetup.js';
import { Bar } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { formatCents } from '../../utils/currency.js';
import { monthToLabel } from '../../utils/dates.js';
import Spinner from '../shared/Spinner.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { reportsApi } from '../../api/reports.js';
import { useUiStore } from '../../store/uiStore.js';

export default function IncomeVsExpenseChart({ months }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const darkMode = useUiStore((s) => s.darkMode);

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportsApi.getIncomeVsExpense(months)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [months]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState icon="⚠️" title="Failed to load data" description={error} />;
  }

  if (!data?.data?.length) {
    return <EmptyState icon="📊" title="No data yet" description="Add income and expense transactions to see this chart." />;
  }

  const textColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.2)';

  const shortLabels = data.data.map((d) => {
    const label = monthToLabel(d.month);
    const parts = label.split(' ');
    return `${parts[0].slice(0, 3)} ${parts[1].slice(2)}`;
  });

  const chartData = {
    labels: shortLabels,
    datasets: [
      {
        label: 'Income',
        data: data.data.map((d) => d.income / 100),
        backgroundColor: darkMode ? 'rgba(34, 197, 94, 0.75)' : 'rgba(22, 163, 74, 0.75)',
        borderColor: darkMode ? 'rgb(34, 197, 94)' : 'rgb(22, 163, 74)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Expenses',
        data: data.data.map((d) => Math.abs(d.expense) / 100),
        backgroundColor: darkMode ? 'rgba(248, 113, 113, 0.75)' : 'rgba(220, 38, 38, 0.75)',
        borderColor: darkMode ? 'rgb(248, 113, 113)' : 'rgb(220, 38, 38)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textColor },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatCents(ctx.raw * 100)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          callback: (val) => `$${val.toLocaleString()}`,
        },
      },
    },
  };

  // Summary stats
  const totalIncome = data.data.reduce((s, d) => s + d.income, 0);
  const totalExpense = data.data.reduce((s, d) => s + d.expense, 0);
  const netSavings = totalIncome + totalExpense; // expense is negative

  return (
    <div>
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Income', value: totalIncome, color: 'text-green-600 dark:text-green-400' },
          { label: 'Total Expenses', value: Math.abs(totalExpense), color: 'text-red-600 dark:text-red-400' },
          { label: 'Net Savings', value: netSavings, color: netSavings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <div className={`text-xl font-bold tabular-nums ${color}`}>{formatCents(value)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ height: '320px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
