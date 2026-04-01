'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

interface HistoryRow {
  Timestamp: string
  Predicted_AQI: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel rounded-lg px-4 py-2 border border-white/10 text-xs space-y-1">
      <p className="text-[#a3abc0]">{label?.split(' ')[1]}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke }} className="font-semibold">
          {p.name}: {parseFloat(p.value).toFixed(1)}
        </p>
      ))}
    </div>
  )
}

export default function AqiChart({ data }: { data: HistoryRow[] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl gap-3">
        <span className="material-symbols-outlined text-[#40485a] text-4xl">sensors_off</span>
        <p className="text-sm text-[#6d7589]">No data — connect your ESP32 on COM3</p>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#99f7ff" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#99f7ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,72,90,0.2)" />
          <XAxis
            dataKey="Timestamp"
            tickFormatter={(v) => v.split(' ')[1]?.slice(0, 5) ?? ''}
            stroke="#40485a"
            tick={{ fill: '#6d7589', fontSize: 10 }}
          />
          <YAxis stroke="#40485a" tick={{ fill: '#6d7589', fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone" dataKey="Predicted_AQI" name="AQI"
            stroke="#99f7ff" strokeWidth={2} fill="url(#aqiGrad)"
            dot={false} activeDot={{ r: 5, fill: '#99f7ff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
