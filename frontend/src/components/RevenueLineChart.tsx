import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { MonthlyGross } from '../api/types'
import { money } from '../ui/common'
import { cents, formatMonth } from '../ui/format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

/** Small area chart of gross revenue per month (the prototype's "miniRevenueChart"). */
export function RevenueLineChart({ data }: { data: MonthlyGross[] }) {
  return (
    <Line
      aria-label="Revenue by month"
      role="img"
      data={{
        labels: data.map(d => formatMonth(d.month)),
        datasets: [
          {
            data: data.map(d => cents(d.grossCents)),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,.1)',
            fill: true,
            tension: 0.38,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => money(Number(ctx.parsed.y)) } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 } }, border: { display: false } },
          y: { display: false, beginAtZero: true, grid: { display: false }, border: { display: false } },
        },
      }}
    />
  )
}
