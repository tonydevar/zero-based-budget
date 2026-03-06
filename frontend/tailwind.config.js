/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        budget: {
          positive: '#16a34a',
          zero: '#6b7280',
          negative: '#dc2626',
          assigned: '#1e40af',
        },
        sidebar: {
          bg: '#1e293b',
          text: '#94a3b8',
          active: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
};
