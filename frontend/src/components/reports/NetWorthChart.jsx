import '../../utils/chartSetup.js';
import { Line } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { formatCents } from '../../utils/currency.js';
import { monthToLabel } from '../../utils/dates.js';
import Spinner from '../shared/Spinner.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { reportsApi } from '../../api/reports.js';
import { useUiStore } from '../../store/uiStore.js';

export default function NetWorthChart({ months }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const darkMode = useUiStore((s) => s.darkMode);

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportsApi.getNetWorth(months)
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
    return <EmptyState icon="📈" title="No data yet" description="Add accounts with transactions to see your net worth trend." />;
  }

  const textColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.2)';

  const shortLabels = data.data.map((d) => {
    const label = monthToLabel(d.month);
    const parts = label.split(' ');
    return `${parts[0].slice(0, 3)} ${parts[1].slice(2)}`;
  });

  // Most recent net worth
  const latestNetWorth = data.data[data.data.length - 1]?.net_worth ?? 0;
  const firstNetWorth = data.data[0]?.net_worth ?? 0;
  const change = latestNetWorth - firstNetWorth;

  const netWorthColor = latestNetWorth >= 0 ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)';
  const netWorthColorAlpha = latestNetWorth >= 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)';

  const chartData = {
    labels: shortLabels,
    datasets: [
      {
        label: 'Assets',
        data: data.data.map((d) => d.assets / 100),
        borderColor: darkMode ? 'rgba(34, 197, 94, 0.7)' : 'rgba(22, 163, 74, 0.7)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 3,
        tension: 0.3,
      },
      {
        label: 'Net Worth',
        data: data.data.map((d) => d.net_worth / 100),
        borderColor: netWorthColor,
        backgroundColor: netWorthColorAlpha,
        borderWidth: 2.5,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: netWorthColor,
        tension: 0.3,
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
          callback: (val) => `$${(val >= 0 ? '' : '-')}${Math.abs(val).toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div>
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Current Net Worth',
            value: latestNetWorth,
            color: latestNetWorth >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400',
          },
          {
            label: 'Assets',
            value: data.data[data.data.length - 1]?.assets ?? 0,
            color: 'text-green-600 dark:text-green-400',
          },
          {
            label: `Change (${months}mo)`,
            value: Math.abs(change),
            color: change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            prefix: change >= 0 ? '+' : '-',
          },
        ].map(({ label, value, color, prefix = '' }) => (
          <div key={label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
            <div className={`text-xl font-bold tabular-nums ${color}`}>
              {prefix}{formatCents(Math.abs(value))}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ height: '320px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
