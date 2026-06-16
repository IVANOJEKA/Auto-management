'use client';

import React from 'react';

// ─── Simple Bar Chart ───────────────────────────────────────────────────────
interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    height?: number;
    formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 200, formatValue }: BarChartProps) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flex: 1 }}>
                {data.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            {formatValue ? formatValue(d.value) : d.value}
                        </span>
                        <div
                            style={{
                                width: '100%',
                                height: `${(d.value / max) * 75}%`,
                                minHeight: '4px',
                                background: d.color || 'var(--primary)',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.4s ease',
                                boxShadow: `0 0 8px ${d.color || 'var(--primary)'}55`
                            }}
                        />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {data.map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Line / Area Chart ────────────────────────────────────────────────────────
interface LineChartProps {
    data: { label: string; value: number }[];
    data2?: { label: string; value: number }[];
    height?: number;
    color?: string;
    color2?: string;
    formatValue?: (v: number) => string;
}

export function LineChart({ data, data2, height = 220, color = 'var(--primary)', color2 = 'var(--secondary-accent)', formatValue }: LineChartProps) {
    const allValues = [...data.map(d => d.value), ...(data2 || []).map(d => d.value)];
    const max = Math.max(...allValues, 1);
    const min = 0;
    const range = max - min || 1;
    const W = 600;
    const H = height - 40;
    const pad = 10;

    const getX = (i: number, arr: { value: number }[]) => pad + (i / Math.max(arr.length - 1, 1)) * (W - 2 * pad);
    const getY = (v: number) => H - ((v - min) / range) * (H - pad * 2) - pad;

    const buildPath = (arr: { value: number }[]) =>
        arr.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, arr).toFixed(1)} ${getY(d.value).toFixed(1)}`).join(' ');

    const buildArea = (arr: { value: number }[]) =>
        `${buildPath(arr)} L ${getX(arr.length - 1, arr).toFixed(1)} ${H} L ${getX(0, arr).toFixed(1)} ${H} Z`;

    return (
        <div style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${W} ${H + 10}`} style={{ width: '100%', height }} preserveAspectRatio="none">
                <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color2} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color2} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => (
                    <line key={t} x1={pad} y1={getY(min + t * range)} x2={W - pad} y2={getY(min + t * range)}
                        stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}
                {/* Area fill */}
                <path d={buildArea(data)} fill="url(#grad1)" />
                {data2 && <path d={buildArea(data2)} fill="url(#grad2)" />}
                {/* Lines */}
                <path d={buildPath(data)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {data2 && <path d={buildPath(data2)} fill="none" stroke={color2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />}
                {/* Dots */}
                {data.map((d, i) => (
                    <circle key={i} cx={getX(i, data)} cy={getY(d.value)} r="4" fill={color} stroke="var(--bg-card)" strokeWidth="2">
                        <title>{formatValue ? formatValue(d.value) : d.value}</title>
                    </circle>
                ))}
            </svg>
            {/* X labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingInline: '10px', marginTop: '-6px' }}>
                {data.map((d, i) => (
                    <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.label}</span>
                ))}
            </div>
        </div>
    );
}

// ─── Donut / Ring Chart ────────────────────────────────────────────────────────
interface DonutChartProps {
    segments: { label: string; value: number; color: string }[];
    size?: number;
    label?: string;
    sublabel?: string;
}

export function DonutChart({ segments, size = 140, label, sublabel }: DonutChartProps) {
    const total = segments.reduce((s, d) => s + d.value, 0) || 1;
    const r = 50;
    const cx = 60;
    const cy = 60;
    const circumference = 2 * Math.PI * r;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <svg width={size} height={size} viewBox="0 0 120 120">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
                {segments.map((seg, i) => {
                    const dash = (seg.value / total) * circumference;
                    const gap = circumference - dash;
                    const prevSum = segments.slice(0, i).reduce((s, d) => s + d.value, 0);
                    const currentOffset = (prevSum / total) * circumference;
                    return (
                        <circle
                            key={i}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="16"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-currentOffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                    );
                })}
                {label && (
                    <>
                        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{label}</text>
                        {sublabel && <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="9">{sublabel}</text>}
                    </>
                )}
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {segments.map((seg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-muted)' }}>{seg.label}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{Math.round((seg.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
interface ProgressBarProps {
    label: string;
    value: number;
    max?: number;
    color?: string;
    formatValue?: (v: number) => string;
}

export function ProgressBar({ label, value, max = 100, color = 'var(--primary)', formatValue }: ProgressBarProps) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>{label}</span>
                <span style={{ fontWeight: 600, color }}>{formatValue ? formatValue(value) : `${pct.toFixed(0)}%`}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s ease', boxShadow: `0 0 6px ${color}88` }} />
            </div>
        </div>
    );
}
