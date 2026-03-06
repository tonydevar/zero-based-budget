import { useState, useMemo } from 'react';
import { formatCents, parseCurrencyInput } from '../../utils/currency.js';
import { reconciliationsApi } from '../../api/reconciliations.js';
import Modal from '../shared/Modal.jsx';

const STEP_ENTER = 1;
const STEP_CHECK = 2;
const STEP_DONE = 3;

export default function ReconciliationModal({
  open,
  onClose,
  account,
  transactions,
  onReconciled,
}) {
  const [step, setStep] = useState(STEP_ENTER);
  const [statementInput, setStatementInput] = useState('');
  const [statementBalance, setStatementBalance] = useState(0);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Already-cleared (but not yet reconciled) transactions
  const unclearedTxns = useMemo(
    () => transactions.filter((t) => !t.reconciled),
    [transactions]
  );

  const clearedTxns = useMemo(
    () => transactions.filter((t) => t.reconciled),
    [transactions]
  );

  // Running cleared balance: reconciled + checked uncleared
  const currentClearedBalance = useMemo(() => {
    const reconciledSum = clearedTxns.reduce((s, t) => s + t.amount, 0);
    const checkedSum = unclearedTxns
      .filter((t) => checkedIds.has(t.id))
      .reduce((s, t) => s + t.amount, 0);
    return reconciledSum + checkedSum;
  }, [clearedTxns, unclearedTxns, checkedIds]);

  const difference = currentClearedBalance - statementBalance;
  const isBalanced = difference === 0 && statementBalance !== 0;

  const toggleCheck = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    const cents = parseCurrencyInput(statementInput);
    setStatementBalance(cents);
    setCheckedIds(new Set());
    setStep(STEP_CHECK);
  };

  const handleFinish = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await reconciliationsApi.createReconciliation(
        account.id,
        statementBalance,
        Array.from(checkedIds)
      );
      setStep(STEP_DONE);
      onReconciled?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(STEP_ENTER);
    setStatementInput('');
    setStatementBalance(0);
    setCheckedIds(new Set());
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Reconcile Account">
      {step === STEP_ENTER && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Enter the ending balance from your bank statement.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Statement Balance
            </label>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={statementInput}
              onChange={(e) => setStatementInput(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-400"
              onKeyDown={(e) => { if (e.key === 'Enter' && statementInput) handleNext(); }}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={!statementInput}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {step === STEP_CHECK && (
        <div className="space-y-3">
          {/* Balance summary */}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${isBalanced ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'}`}>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <div>Statement: <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCents(statementBalance)}</span></div>
              <div>Cleared: <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCents(currentClearedBalance)}</span></div>
            </div>
            <div className="text-right">
              {isBalanced ? (
                <span className="text-green-600 dark:text-green-400 font-semibold text-sm">✓ Balanced!</span>
              ) : (
                <span className={`font-semibold text-sm ${difference !== 0 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                  Difference: {formatCents(Math.abs(difference))}
                  {difference !== 0 && (difference > 0 ? ' over' : ' under')}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Check off transactions that appear on your statement ({unclearedTxns.length} uncleared):
          </p>

          {/* Transaction list */}
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
            {unclearedTxns.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
                No uncleared transactions
              </div>
            ) : (
              unclearedTxns.map((tx) => (
                <label
                  key={tx.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    checkedIds.has(tx.id)
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checkedIds.has(tx.id)}
                    onChange={() => toggleCheck(tx.id)}
                    className="w-4 h-4 rounded accent-green-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-800 dark:text-slate-100 truncate">
                        {tx.payee || tx.category_name || '—'}
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ml-2 flex-shrink-0 ${
                          tx.amount < 0 ? 'text-slate-700 dark:text-slate-200' : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {tx.amount < 0 ? formatCents(-tx.amount) : `+${formatCents(tx.amount)}`}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{tx.date}</div>
                  </div>
                </label>
              ))
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-between gap-3">
            <button
              onClick={() => setStep(STEP_ENTER)}
              className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFinish}
                disabled={!isBalanced || submitting}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Saving…' : 'Finish Reconciliation ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === STEP_DONE && (
        <div className="text-center py-4 space-y-4">
          <div className="text-5xl">🎉</div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Reconciliation Complete!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {checkedIds.size} transaction{checkedIds.size !== 1 ? 's' : ''} marked as reconciled.
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
