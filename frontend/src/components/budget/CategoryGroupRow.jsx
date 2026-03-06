import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import CategoryRow from './CategoryRow.jsx';
import InlineEdit from '../shared/InlineEdit.jsx';
import ConfirmPopover from '../shared/ConfirmPopover.jsx';
import { formatCents } from '../../utils/currency.js';
import { useBudgetStore } from '../../store/budgetStore.js';

export default function CategoryGroupRow({ group }) {
  const updateGroup = useBudgetStore((s) => s.updateGroup);
  const deleteGroup = useBudgetStore((s) => s.deleteGroup);
  const createCategory = useBudgetStore((s) => s.createCategory);

  const [collapsed, setCollapsed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [error, setError] = useState(null);

  const totalAssigned = group.categories.reduce((s, c) => s + c.assigned, 0);
  const totalActivity = group.categories.reduce((s, c) => s + c.activity, 0);
  const totalAvailable = group.categories.reduce((s, c) => s + c.available, 0);

  const handleRenameGroup = async (name) => {
    await updateGroup(group.id, { name });
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(group.id);
    } catch (err) {
      setShowConfirm(false);
      setError(err.message);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await createCategory(group.id, newCatName.trim());
    setNewCatName('');
    setAddingCategory(false);
  };

  return (
    <div className="mb-2">
      {/* Group header */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 sticky top-0 z-10">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="px-3 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          {collapsed ? '▶' : '▼'}
        </button>

        <div className="flex-1 px-1 py-2.5 font-semibold text-sm text-slate-700 dark:text-slate-200">
          {group.is_system ? (
            <span>{group.name}</span>
          ) : (
            <InlineEdit value={group.name} onSave={handleRenameGroup} />
          )}
          {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
        </div>

        {/* Group totals */}
        <div className="w-28 px-2 text-right text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">
          {formatCents(totalAssigned)}
        </div>
        <div className="w-28 px-2 text-right text-sm text-slate-500 dark:text-slate-400 tabular-nums">
          {totalActivity !== 0 ? formatCents(totalActivity) : '—'}
        </div>
        <div className={`w-28 px-2 text-right text-sm font-medium tabular-nums ${totalAvailable < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
          {formatCents(totalAvailable)}
        </div>

        {/* Actions */}
        <div className="w-8 flex justify-center relative">
          {!group.is_system && (
            <>
              <button
                onClick={() => setShowConfirm((v) => !v)}
                className="p-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                title="Delete group"
              >
                🗑
              </button>
              {showConfirm && (
                <ConfirmPopover
                  message={`Delete group "${group.name}"?`}
                  onConfirm={handleDeleteGroup}
                  onCancel={() => setShowConfirm(false)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Category rows */}
      {!collapsed && (
        <SortableContext
          items={group.categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {group.categories.map((cat) => (
            <CategoryRow key={cat.id} category={cat} groupId={group.id} />
          ))}
        </SortableContext>
      )}

      {/* Add category row */}
      {!collapsed && !group.is_system && (
        <div className="pl-8 pr-8 py-1">
          {addingCategory ? (
            <form onSubmit={handleAddCategory} className="flex gap-2 items-center">
              <input
                autoFocus
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="flex-1 text-sm px-2 py-1 border border-primary-400 rounded outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                onKeyDown={(e) => { if (e.key === 'Escape') setAddingCategory(false); }}
              />
              <button type="submit" className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">
                Add
              </button>
              <button type="button" onClick={() => setAddingCategory(false)} className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              className="text-xs text-slate-400 hover:text-primary-600 dark:hover:text-blue-400 transition-colors py-1"
            >
              + Add Category
            </button>
          )}
        </div>
      )}
    </div>
  );
}
