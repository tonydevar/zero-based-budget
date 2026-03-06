import { useNavigate, useLocation } from 'react-router-dom';
import { formatCents } from '../../utils/currency.js';

export default function AccountListItem({ account }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/accounts/${account.id}`;

  return (
    <button
      onClick={() => navigate(`/accounts/${account.id}`)}
      className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors rounded-r-lg ${
        isActive
          ? 'border-l-2 border-blue-400 bg-slate-700/50 text-white'
          : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
      }`}
    >
      <span className="truncate text-left">{account.name}</span>
      <span
        className={`ml-2 font-medium tabular-nums flex-shrink-0 ${
          account.balance < 0 ? 'text-red-400' : 'text-slate-300'
        }`}
      >
        {formatCents(account.balance)}
      </span>
    </button>
  );
}
