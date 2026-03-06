import '../../utils/chartSetup.js';
import { Bar } from 'react-chartjs-2';
import { useRef, useState, useEffect, useMemo } from 'react';
import { formatCents } from '../../utils/currency.js';
import DrillDownTable from './DrillDownTable.jsx';
import Spinner from '../shared/Spinner.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { reportsApi } from '../../api/reports.js';
import { accountsApi } from '../../api/accounts.js';
import { useUiStore } from '../../store/uiStore.js';

export default function SpendingByCategoryChart({ startMonth, endMonth, categoryFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drillDown, setDrillDown] = useState(null); // { categoryItem, transactions }
  const [drillLoading, setDrillLoading] = useState(false);
  const darkMode = useUiStore((s) => s.darkMode);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!startMonth || !endMonth) return;
    setLoading(true);
    setError(null);
    setDrillDown(null);

    reportsApi.getSpendingByCategory(startMonth, endMonth)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [startMonth, endMonth]);

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    let items = data.data;
    if (categoryFilter && categoryFilter.length > 0) {
      items = items.filter((d) => categoryFilter.includes(d.category_id));
    }
    // Sort by absolute total (largest spending first, amounts are negative)
    return [...items].sort((a, b) => a.total - b.total);
  }, [data, categoryFilter]);

  const handleBarClick = async (event, elements) => {
    if (!elements || elements.length === 0) return;
    const idx = elements[0].index;
    const item = filteredData[idx];
    if (!item) return;

    setDrillLoading(true);
    setDrillDown({ categoryItem: item, transactions: [] });

    try {
      // Fetch all accounts, then get transactions for each, filter by category + date range
      const accounts = await accountsApi.getAccounts();
      const startDate = `${startMonth}-01`;
      const endDate = `${endMonth}-31`;

      const allTxns = [];
      for (const account of accounts) {
        if (!account.on_budget) continue;
        let page = 1;
        while (true) {
          const result = await accountsApi.getTransactions(account.id, page, 200);
          const matching = result.transactions.filter(
            (t) =>
              t.category_id === item.category_id &&
              t.date >= startDate &&
              t.date <= endDate
          );
          allTxns.push(...matching);
          if (result.transactions.length < 200 || page * 200 >= result.total) break;
          page++;
        }
      }

      // Sort by date descending
      allTxns.sort((a, b) => b.date.localeCompare(a.date));
      setDrillDown({ categoryItem: item, transactions: allTxns });
    } catch {
      setDrillDown((prev) => ({ ...prev, transactions: [] }));
    } finally {
      setDrillLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load spending data"
        description={error}
      />
    );
  }

  if (!filteredData.length) {
    return (
      <EmptyState
        icon="🏷️"
        title="No spending data"
        description="No transactions found for the selected date range and filters."
      />
    );
  }

  const textColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.2)';
  const barColors = filteredData.map((_, i) => {
    const hues = [210, 220, 200, 230, 195, 215, 225, 205];
    const h = hues[i % hues.length];
    return darkMode ? `hsla(${h}, 65%, 55%, 0.85)` : `hsla(${h}, 65%, 50%, 0.85)`;
  });

  const chartData = {
    labels: filteredData.map((d) => d.category_name),
    datasets: [
      {
        label: 'Spending',
        data: filteredData.map((d) => Math.abs(d.total) / 100),
        backgroundColor: barColors,
        borderColor: barColors.map((c) => c.replace('0.85', '1')),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleBarClick,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${formatCents(ctx.raw * 100)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          callback: (val) => `$${val.toLocaleString()}`,
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: textColor,
          font: { size: 12 },
        },
      },
    },
  };

  const chartHeight = Math.max(240, filteredData.length * 38);

  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 text-right">
        Click a bar to see individual transactions ↓
      </p>
      <div style={{ height: `${chartHeight}px` }}>
        <Bar ref={chartRef} data={chartData} options={options} />
      </div>

      {/* Drill-down */}
      {drillDown && (
        drillLoading ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <DrillDownTable
            category={drillDown.categoryItem}
            transactions={drillDown.transactions}
            onClose={() => setDrillDown(null)}
          />
        )
      )}
    </div>
  );
}
