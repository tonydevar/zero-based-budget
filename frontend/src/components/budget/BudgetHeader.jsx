import MonthSelector from './MonthSelector.jsx';
import ReadyToAssignBanner from './ReadyToAssignBanner.jsx';
import AgeOfMoneyWidget from './AgeOfMoneyWidget.jsx';

export default function BudgetHeader({ month, readyToAssign, ageOfMoney, ageTrend }) {
  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <MonthSelector month={month} />
        <ReadyToAssignBanner amount={readyToAssign} />
        <AgeOfMoneyWidget days={ageOfMoney} trend={ageTrend} />
      </div>
    </div>
  );
}
