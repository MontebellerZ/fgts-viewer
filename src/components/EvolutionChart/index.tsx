import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "../../types";
import { formatBRL } from "../../utils/format";
import "./index.css";

interface EvolutionChartProps {
  chartData: ChartPoint[];
  showAccumulatedLabel: boolean;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-month">{label}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label chart-tooltip-saldo">Saldo</span>
        <span className="chart-tooltip-value">{formatBRL(d.totalBalance)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label chart-tooltip-juros-totais">Juros totais</span>
        <span className="chart-tooltip-value">{formatBRL(d.jamCredit)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label chart-tooltip-credito-mes">Credito no mes</span>
        <span className="chart-tooltip-value">{formatBRL(d.creditMonth)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label chart-tooltip-juros-mes">Juros no mes</span>
        <span className="chart-tooltip-value">{formatBRL(d.jamMonth)}</span>
      </div>
    </div>
  );
}

export function EvolutionChart({ chartData, showAccumulatedLabel }: EvolutionChartProps) {
  if (chartData.length === 0) return null;

  return (
    <section className="chart-card">
      <h2>Evolucao mensal {showAccumulatedLabel ? "(acumulado)" : ""}</h2>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1f77ff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#1f77ff" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="jamGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="totalBalance"
              name="Saldo"
              stroke="#1f77ff"
              fill="url(#totalGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="jamCredit"
              name="Juros totais"
              stroke="#16a34a"
              fill="url(#jamGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
