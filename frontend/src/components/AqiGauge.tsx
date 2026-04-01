'use client'

type Props = { aqi: number }

export default function AqiGauge({ aqi }: Props) {
  // Map AQI 0-500 to 0-100% of arc (282 = full circumference of r=45)
  const pct = Math.min(aqi / 300, 1)
  const arcLen = 282
  const offset = arcLen - pct * arcLen

  const color = aqi <= 50 ? '#22c55e' : aqi <= 100 ? '#f59e0b' : aqi <= 150 ? '#f97316' : '#ef4444'
  const label = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy' : 'Hazardous'

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          {/* Arc */}
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={arcLen}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke 0.5s ease', filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-4xl font-black tracking-tight" style={{ color }}>{aqi.toFixed(0)}</span>
          <span className="text-xs font-semibold tracking-widest uppercase mt-0.5" style={{ color, opacity: 0.8 }}>{label}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 font-medium">Predicted AQI Index</p>
    </div>
  )
}
