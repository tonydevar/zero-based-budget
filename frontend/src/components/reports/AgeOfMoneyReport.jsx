import '../../utils/chartSetup.js';
import { Line } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { monthToLabel } from '../../utils/dates.js';
import Spinner from '../shared/Spinner.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { reportsApi } from '../../api/reports.js';
import { useUiStore } from '../../store/uiStore.js';

export default function AgeOfMoneyReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const darkMode = useUiStore((s) => s.darkMode);

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportsApi.getAgeOfMoney()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Spinner size="lg" /></div>;
  if (error) return <EmptyState icon="⚠️" title="Failed to load" description={error} />;
  if (!data) return null;

  const textColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.2)';

  const shortLabels = (data.trend || []).map((d) => {
    const label = monthToLabel(d.month);
    const parts = label.split(' ');
    return `${parts[0].slice(0, 3)} ${parts[1].slice(2)}`;
  });

  const chartData = {
    labels: shortLabels,
    datasets: [
      {
        label: 'Age of Money (days)',
        data: (data.trend || []).map((d) => d.days),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2.5,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw} days`,
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
          callback: (val) => `${val}d`,
        },
        min: 0,
      },
    },
  };

  const qualityLabel = (days) => {
    if (days >= 90) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400', emoji: '🌟' };
    if (days >= 30) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400', emoji: '👍' };
    if (days >= 14) return { label: 'Fair', color: 'text-amber-600 dark:text-amber-400', emoji: '⚠️' };
    return { label: 'Low', color: 'text-red-600 dark:text-red-400', emoji: '⚡' };
  };

  const quality = qualityLabel(data.current);

  return (
    <div className="space-y-6">
      {/* Hero metric */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-6">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {data.current ?? 0}
            </span>
            <span className="text-2xl text-slate-400 dark:text-slate-500">days</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Age of Money</p>
        </div>

        <div className="text-center">
          <div className={`text-3xl font-bold ${quality.color}`}>
            {quality.emoji} {quality.label}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Budget health</p>
        </div>

        <div className="max-w-xs text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-slate-700 dark:text-slate-200">What is Age of Money?</strong>
          <p className="mt-1">
            The average number of days between when you earned money and when you spent it.
            A higher number means you&apos;re living on older income — a sign of financial buffer.
          </p>
        </div>
      </div>

      {/* 6-month trend chart */}
      {data.trend && data.trend.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            6-Month Trend
          </h3>
          <div style={{ height: '240px' }}>
            <Line data={chartData} options={options} />
          </div>
        </div>
      )}

      {/* Milestone guide */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        {[
          { threshold: '0–13 days', label: 'Stretched', emoji: '⚡', desc: 'Spending income immediately' },
          { threshold: '14–29 days', label: 'Fair', emoji: '⚠️', desc: 'Two-week buffer' },
          { threshold: '30–89 days', label: 'Good', emoji: '👍', desc: 'One to three months ahead' },
          { threshold: '90+ days', label: 'Excellent', emoji: '🌟', desc: 'Three months of buffer' },
        ].map((tier) => (
          <div key={tier.threshold} className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">{tier.emoji}</div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{tier.label}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{tier.threshold}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tier.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
