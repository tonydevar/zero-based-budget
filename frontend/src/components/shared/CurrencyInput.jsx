import { useState, useRef, useEffect } from 'react';
import { formatCents, parseCurrencyInput } from '../../utils/currency.js';

/**
 * An input that displays a formatted currency value when blurred,
 * and shows a plain numeric input when focused.
 * Value and onChange use integer cents.
 */
export default function CurrencyInput({ value = 0, onChange, onBlur, disabled = false, className = '' }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const handleFocus = () => {
    if (disabled) return;
    setDraft(value !== 0 ? (value / 100).toFixed(2) : '');
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
    const cents = parseCurrencyInput(draft);
    onChange?.(cents);
    onBlur?.(cents);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setDraft(value !== 0 ? (value / 100).toFixed(2) : '');
      inputRef.current?.blur();
    }
  };

  if (disabled) {
    return (
      <span className={`text-slate-400 dark:text-slate-500 ${className}`}>
        {formatCents(value)}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type={focused ? 'number' : 'text'}
      value={focused ? draft : formatCents(value)}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKey}
      step="0.01"
      className={`text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-primary-400 focus:bg-white dark:focus:bg-slate-700 rounded px-1 py-0.5 outline-none transition-colors w-full ${className}`}
    />
  );
}
