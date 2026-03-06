import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import CategoryGroupRow from './CategoryGroupRow.jsx';
import { useBudgetStore } from '../../store/budgetStore.js';

export default function BudgetTable() {
  const groups = useBudgetStore((s) => s.groups);
  const reorderCategories = useBudgetStore((s) => s.reorderCategories);
  const createGroup = useBudgetStore((s) => s.createGroup);

  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    // Find which group contains the dragged item
    for (const group of groups) {
      const catIds = group.categories.map((c) => c.id);
      if (catIds.includes(active.id)) {
        const oldIndex = catIds.indexOf(active.id);
        const newIndex = catIds.indexOf(over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(group.categories, oldIndex, newIndex);
        const items = reordered.map((c, i) => ({ id: c.id, sort_order: (i + 1) * 1000 }));
        await reorderCategories(group.id, items);
        break;
      }
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await createGroup(newGroupName.trim());
    setNewGroupName('');
    setAddingGroup(false);
  };

  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="flex items-center bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 sticky top-0 z-20">
        <div className="w-6" />
        <div className="flex-1">Category</div>
        <div className="w-28 text-right">Assigned</div>
        <div className="w-28 text-right">Activity</div>
        <div className="w-28 text-right">Available</div>
        <div className="w-8" />
      </div>

      {/* Groups */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1">
          {groups.map((group) => (
            <CategoryGroupRow key={group.id} group={group} />
          ))}
        </div>
      </DndContext>

      {/* Add group */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        {addingGroup ? (
          <form onSubmit={handleAddGroup} className="flex gap-2 items-center">
            <input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="flex-1 text-sm px-3 py-1.5 border border-primary-400 rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              onKeyDown={(e) => { if (e.key === 'Escape') setAddingGroup(false); }}
            />
            <button type="submit" className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Add Group
            </button>
            <button type="button" onClick={() => setAddingGroup(false)} className="text-sm px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAddingGroup(true)}
            className="text-sm text-slate-400 hover:text-primary-600 dark:hover:text-blue-400 transition-colors"
          >
            + Add Category Group
          </button>
        )}
      </div>
    </div>
  );
}
