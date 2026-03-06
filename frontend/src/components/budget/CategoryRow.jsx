import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CurrencyInput from '../shared/CurrencyInput.jsx';
import InlineEdit from '../shared/InlineEdit.jsx';
import ConfirmPopover from '../shared/ConfirmPopover.jsx';
import { formatCents } from '../../utils/currency.js';
import { useBudgetStore } from '../../store/budgetStore.js';

export default function CategoryRow({ category, groupId }) {
  const setAssigned = useBudgetStore((s) => s.setAssigned);
  const updateCategory = useBudgetStore((s) => s.updateCategory);
  const deleteCategory = useBudgetStore((s) => s.deleteCategory);

  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const rowRef = useRef(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const availableClass =
    category.available < 0
      ? 'text-red-600 dark:text-red-400 font-semibold'
      : category.available === 0
      ? 'text-slate-400 dark:text-slate-500'
      : 'text-green-600 dark:text-green-500';

  const handleAssignedChange = async (cents) => {
    try {
      setError(null);
      await setAssigned(category.id, cents);
    } catch {
      setError('Failed to save');
    }
  };

  const handleRename = async (newName) => {
    await updateCategory(category.id, { name: newName });
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(category.id);
    } catch (err) {
      setShowConfirm(false);
      setError(err.message);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
    >
      {/* Drag handle */}
      {!category.is_system && (
        <div
          {...attributes}
          {...listeners}
          className="px-2 py-2.5 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          ⠿
        </div>
      )}
      {category.is_system && <div className="w-6" />}

      {/* Category name */}
      <div className="flex-1 px-2 py-2.5 flex items-center gap-2 min-w-0">
        {category.is_system ? (
          <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
            {category.name}
            <span className="text-xs">💳</span>
          </span>
        ) : (
          <InlineEdit
            value={category.name}
            onSave={handleRename}
            className="text-sm text-slate-700 dark:text-slate-200"
          />
        )}
        {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
      </div>

      {/* Assigned */}
      <div className="w-28 px-2 py-2.5">
        <CurrencyInput
          value={category.assigned}
          onChange={handleAssignedChange}
          disabled={category.is_system}
          className={`text-sm ${category.is_system ? '' : 'text-blue-700 dark:text-blue-400'}`}
        />
      </div>

      {/* Activity */}
      <div className="w-28 px-2 py-2.5 text-right text-sm text-slate-500 dark:text-slate-400 tabular-nums">
        {category.activity !== 0 ? formatCents(category.activity) : '—'}
      </div>

      {/* Available */}
      <div className={`w-28 px-2 py-2.5 text-right text-sm tabular-nums ${availableClass}`}>
        {formatCents(category.available)}
      </div>

      {/* Delete (non-system only) */}
      {!category.is_system && (
        <div className="relative w-8 flex justify-center">
          <button
            onClick={() => setShowConfirm(true)}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-all text-xs"
            title="Delete category"
          >
            🗑
          </button>
          {showConfirm && (
            <ConfirmPopover
              message={`Delete "${category.name}"?`}
              onConfirm={handleDelete}
              onCancel={() => setShowConfirm(false)}
            />
          )}
        </div>
      )}
      {category.is_system && <div className="w-8" />}
    </div>
  );
}
