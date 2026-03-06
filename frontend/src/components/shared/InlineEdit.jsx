import { useState, useRef, useEffect } from 'react';

export default function InlineEdit({ value, onSave, className = '', placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        className={`bg-white dark:bg-slate-700 border border-primary-400 rounded px-1 py-0.5 text-sm outline-none ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-text hover:underline decoration-dotted ${className}`}
      title="Double-click to edit"
    >
      {value || placeholder}
    </span>
  );
}
