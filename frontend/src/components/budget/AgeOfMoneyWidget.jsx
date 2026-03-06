import { useState } from 'react';

export default function AgeOfMoneyWidget({ days, trend = [] }) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Simple sparkline using SVG
  const renderSparkline = () => {
    if (!trend || trend.length === 0) return null;
    const values = trend.map((t) => t.days);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    });
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mt-1">
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      className="relative flex flex-col items-center cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-700 dark:text-slate-200 tabular-nums">
          {days ?? 0}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">days</span>
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500">Age of Money</span>
      {renderSparkline()}

      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 w-52 text-center shadow-xl z-50">
          Your money is {days ?? 0} days old on average — the higher, the more buffer you have.
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}
