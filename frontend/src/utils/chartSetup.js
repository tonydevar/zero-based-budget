/**
 * Registers only the Chart.js components we use, keeping bundle size lean.
 * Import this once at the top of any file that uses react-chartjs-2.
 */
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export { ChartJS };
