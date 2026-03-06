import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBudgetStore } from '../store/budgetStore.js';
import { getCurrentMonth } from '../utils/dates.js';
import BudgetHeader from '../components/budget/BudgetHeader.jsx';
import BudgetTable from '../components/budget/BudgetTable.jsx';
import Spinner from '../components/shared/Spinner.jsx';
import EmptyState from '../components/shared/EmptyState.jsx';

export default function BudgetPage() {
  const { month } = useParams();
  const navigate = useNavigate();
  const currentMonth = getCurrentMonth();

  const fetchBudget = useBudgetStore((s) => s.fetchBudget);
  const storeMonth = useBudgetStore((s) => s.month);
  const readyToAssign = useBudgetStore((s) => s.readyToAssign);
  const ageOfMoney = useBudgetStore((s) => s.ageOfMoney);
  const ageTrend = useBudgetStore((s) => s.ageTrend);
  const groups = useBudgetStore((s) => s.groups);
  const loading = useBudgetStore((s) => s.loading);
  const error = useBudgetStore((s) => s.error);

  // Redirect if no month param
  useEffect(() => {
    if (!month) {
      navigate(`/budget/${currentMonth}`, { replace: true });
    }
  }, [month, navigate, currentMonth]);

  // Load budget when month changes
  useEffect(() => {
    if (month) {
      fetchBudget(month);
    }
  }, [month, fetchBudget]);

  if (!month) return null;

  return (
    <div className="flex flex-col h-full">
      <BudgetHeader
        month={month}
        readyToAssign={readyToAssign}
        ageOfMoney={ageOfMoney}
        ageTrend={ageTrend}
      />

      <div className="flex-1 overflow-auto">
        {loading && groups.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            icon="⚠️"
            title="Failed to load budget"
            description={error}
            action={
              <button
                onClick={() => fetchBudget(month)}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Retry
              </button>
            }
          />
        ) : (
          <BudgetTable />
        )}
      </div>
    </div>
  );
}
