import { useMemo, useState } from 'react';

export interface ChartDataPoint {
  day: number;
  revenue: number;
}

interface RevenueChartProps {
  data: ChartDataPoint[];
}

const CHART_HEIGHT = 200;
const PADDING = { top: 16, right: 12, bottom: 28, left: 48 };

export default function RevenueChart({ data }: RevenueChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartWidth = 480;
  const innerWidth = chartWidth - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const maxRevenue = useMemo(() => Math.max(...data.map((d) => d.revenue), 1), [data]);

  const yTicks = useMemo(() => {
    const step = maxRevenue <= 4 ? 1 : Math.ceil(maxRevenue / 4 / 100) * 100 || Math.ceil(maxRevenue / 4);
    const ticks: number[] = [];
    for (let v = 0; v <= maxRevenue; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < maxRevenue) ticks.push(maxRevenue);
    return ticks.length > 1 ? ticks : [0, maxRevenue];
  }, [maxRevenue]);

  const points = useMemo(() => {
    if (data.length === 0) return [];
    const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;
    return data.map((d, i) => ({
      x: PADDING.left + i * stepX,
      y: PADDING.top + innerHeight - (d.revenue / maxRevenue) * innerHeight,
      ...d,
    }));
  }, [data, innerWidth, innerHeight, maxRevenue]);

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baseline = PADDING.top + innerHeight;
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }, [points, linePath, innerHeight]);

  const xLabels = useMemo(() => {
    if (data.length === 0) return [];
    const step = data.length <= 10 ? 1 : Math.ceil(data.length / 6);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  if (data.length === 0) {
    return (
      <div style={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
        Bu ay için tamamlanan işlem yok
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        style={{ width: '100%', height: CHART_HEIGHT, display: 'block' }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e52d6e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e52d6e" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#e52d6e" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = PADDING.top + innerHeight - (tick / maxRevenue) * innerHeight;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={chartWidth - PADDING.right}
                y2={y}
                stroke="#edf2f7"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#a0aec0"
              >
                {tick >= 1000 ? `${(tick / 1000).toFixed(tick % 1000 === 0 ? 0 : 1)}k` : tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#revenueGradient)" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) =>
          p.revenue > 0 ? (
            <circle
              key={p.day}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 4}
              fill="white"
              stroke="#e52d6e"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ) : null,
        )}

        {points.map((p, i) => (
          <rect
            key={`hit-${p.day}`}
            x={p.x - innerWidth / data.length / 2}
            y={PADDING.top}
            width={innerWidth / data.length}
            height={innerHeight}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}

        {xLabels.map((d) => {
          const idx = data.findIndex((item) => item.day === d.day);
          const p = points[idx];
          if (!p) return null;
          return (
            <text
              key={`x-${d.day}`}
              x={p.x}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#a0aec0"
            >
              {d.day}
            </text>
          );
        })}
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: `${(hovered.x / chartWidth) * 100}%`,
            top: '8px',
            transform: 'translateX(-50%)',
            backgroundColor: '#1a202c',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{hovered.day}. gün</div>
          <div style={{ color: '#f9a8d4', marginTop: '2px' }}>
            {hovered.revenue.toLocaleString('tr-TR')} TL
          </div>
        </div>
      )}
    </div>
  );
}
