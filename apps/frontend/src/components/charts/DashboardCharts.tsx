import React from 'react';

/* ═══════════════════════════════════════════════════════════
   SMARTHOSTEL — PURE SVG CHART COMPONENTS
   No dependencies. Fully themed with CSS variables.
═══════════════════════════════════════════════════════════ */

// ──────── Color Palette for Charts ────────
const CHART_COLORS = [
  '#E35336', // Coral Red (primary)
  '#F4A460', // Sandy Orange
  '#A0522D', // Sienna Brown
  '#4CAF50', // Green
  '#5C6BC0', // Indigo
  '#FF7043', // Deep Orange
  '#26A69A', // Teal
  '#AB47BC', // Purple
  '#FFA726', // Orange
  '#78909C', // Blue Grey
];

// ──────── DONUT / PIE CHART ────────
interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 180,
  strokeWidth = 28,
  showLegend = true,
  centerLabel,
  centerValue,
}) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No data</p>;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const dashGap = circumference - dashLen;
          const offset = -(accumulated * circumference) + circumference * 0.25;
          accumulated += pct;
          const color = seg.color || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${dashGap}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
            />
          );
        })}
        {/* Center text */}
        {(centerLabel || centerValue !== undefined) && (
          <g style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
            {centerValue !== undefined && (
              <text
                x="50%"
                y="46%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: `${size * 0.16}px`, fontWeight: 800, fill: 'var(--text-main)' }}
              >
                {centerValue}
              </text>
            )}
            {centerLabel && (
              <text
                x="50%"
                y="60%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: `${size * 0.075}px`, fontWeight: 500, fill: 'var(--text-muted)' }}
              >
                {centerLabel}
              </text>
            )}
          </g>
        )}
      </svg>

      {showLegend && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', justifyContent: 'center' }}>
          {data.map((seg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '3px',
                background: seg.color || CHART_COLORS[i % CHART_COLORS.length],
                flexShrink: 0
              }} />
              <span style={{ color: 'var(--text-muted)' }}>{seg.label}</span>
              <strong style={{ color: 'var(--text-main)' }}>{seg.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ──────── VERTICAL BAR CHART ────────
interface BarChartBar {
  label: string;
  value: number;
  color?: string;
  secondaryValue?: number;
  secondaryColor?: string;
}

interface BarChartProps {
  data: BarChartBar[];
  height?: number;
  barWidth?: number;
  showValues?: boolean;
  unit?: string;
  stacked?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 160,
  barWidth = 32,
  showValues = true,
  unit = '',
  stacked = false,
}) => {
  if (data.length === 0) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No data</p>;

  const maxVal = Math.max(...data.map(d => stacked ? (d.value + (d.secondaryValue || 0)) : d.value), 1);
  const chartWidth = Math.max(data.length * (barWidth + 20) + 30, 200);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width={chartWidth} height={height + 40} viewBox={`0 0 ${chartWidth} ${height + 40}`} style={{ display: 'block', margin: '0 auto' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line
            key={i}
            x1={30}
            y1={height * (1 - pct) + 5}
            x2={chartWidth}
            y2={height * (1 - pct) + 5}
            stroke="var(--border-color)"
            strokeWidth={pct === 0 ? 1.5 : 0.5}
            strokeDasharray={pct === 0 ? '' : '4 4'}
          />
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = 40 + i * (barWidth + 20);
          const barH = (d.value / maxVal) * (height - 10);
          const secH = stacked && d.secondaryValue ? (d.secondaryValue / maxVal) * (height - 10) : 0;
          const color = d.color || CHART_COLORS[i % CHART_COLORS.length];
          const secColor = d.secondaryColor || CHART_COLORS[(i + 1) % CHART_COLORS.length];

          return (
            <g key={i}>
              {/* Primary bar */}
              <rect
                x={x}
                y={height - barH - secH + 5}
                width={barWidth}
                height={barH}
                rx={4}
                ry={4}
                fill={color}
                opacity={0.9}
                style={{ transition: 'height 0.5s ease, y 0.5s ease' }}
              >
                <animate attributeName="height" from="0" to={barH} dur="0.6s" fill="freeze" />
                <animate attributeName="y" from={height + 5} to={height - barH - secH + 5} dur="0.6s" fill="freeze" />
              </rect>

              {/* Secondary (stacked) bar */}
              {stacked && secH > 0 && (
                <rect
                  x={x}
                  y={height - secH + 5}
                  width={barWidth}
                  height={secH}
                  rx={4}
                  ry={4}
                  fill={secColor}
                  opacity={0.7}
                >
                  <animate attributeName="height" from="0" to={secH} dur="0.6s" fill="freeze" />
                  <animate attributeName="y" from={height + 5} to={height - secH + 5} dur="0.6s" fill="freeze" />
                </rect>
              )}

              {/* Value label */}
              {showValues && (
                <text
                  x={x + barWidth / 2}
                  y={height - barH - secH - 2}
                  textAnchor="middle"
                  style={{ fontSize: '0.65rem', fontWeight: 700, fill: 'var(--text-main)' }}
                >
                  {d.value}{unit}
                </text>
              )}

              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={height + 22}
                textAnchor="middle"
                style={{ fontSize: '0.6rem', fill: 'var(--text-muted)', fontWeight: 500 }}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ──────── HORIZONTAL BAR CHART ────────
interface HBarData {
  label: string;
  value: number;
  total?: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: HBarData[];
  height?: number;
  showPercentage?: boolean;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  height = 28,
  showPercentage = true,
}) => {
  const maxVal = Math.max(...data.map(d => d.total || d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {data.map((d, i) => {
        const pct = d.total ? Math.round((d.value / d.total) * 100) : Math.round((d.value / maxVal) * 100);
        const color = d.color || CHART_COLORS[i % CHART_COLORS.length];
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{d.label}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                {d.value}{d.total ? ` / ${d.total}` : ''} {showPercentage && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({pct}%)</span>}
              </span>
            </div>
            <div style={{
              height: `${height}px`, background: 'var(--bg-subtle)', borderRadius: `${height / 2}px`,
              overflow: 'hidden', position: 'relative'
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                borderRadius: `${height / 2}px`,
                transition: 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                position: 'relative',
              }}>
                {/* Shimmer effect */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: `${height / 2}px`,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                  animation: 'shimmer 2s infinite',
                }} />
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

// ──────── MINI SPARKLINE ────────
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 40,
  color = '#E35336',
  fillOpacity = 0.15,
}) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padY = 4;
  const usableH = height - padY * 2;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: padY + usableH - ((v - min) / range) * usableH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
    </svg>
  );
};

// ──────── PROGRESS RING / GAUGE ────────
interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 12,
  color = '#E35336',
  label,
  sublabel,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const dashLen = pct * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border-color)" strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dashLen} ${circumference - dashLen}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        />
        {/* Center text */}
        <g style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
          <text
            x="50%" y="48%"
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: `${size * 0.22}px`, fontWeight: 800, fill: 'var(--text-main)' }}
          >
            {Math.round(pct * 100)}%
          </text>
          {sublabel && (
            <text
              x="50%" y="66%"
              textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: `${size * 0.09}px`, fontWeight: 500, fill: 'var(--text-muted)' }}
            >
              {sublabel}
            </text>
          )}
        </g>
      </svg>
      {label && (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
      )}
    </div>
  );
};

// ──────── MINI STAT CARD WITH SPARKLINE ────────
interface MiniStatProps {
  title: string;
  value: string | number;
  trend?: number[];
  trendColor?: string;
  icon?: React.ReactNode;
  suffix?: string;
}

export const MiniStatCard: React.FC<MiniStatProps> = ({
  title,
  value,
  trend,
  trendColor = '#E35336',
  icon,
  suffix,
}) => {
  return (
    <div className="glass-panel stat-card" style={{
      padding: '1.25rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '0.5rem',
    }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{title}</span>
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem', lineHeight: 1.1 }}>
          {value}{suffix && <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>{suffix}</span>}
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
        {icon}
        {trend && trend.length > 1 && <Sparkline data={trend} width={80} height={30} color={trendColor} />}
      </div>
    </div>
  );
};
