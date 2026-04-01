'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const AqiChart = dynamic(() => import('@/components/AqiChart'), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center">
      <span className="text-[#40485a] text-sm">Loading chart...</span>
    </div>
  )
})

interface LiveData {
  temperature: number
  humidity: number
  gas_level: number
  predicted_aqi: number
}
interface HistoryRow {
  Timestamp: string
  Temperature: number
  Humidity: number
  Gas_Level: number
  Predicted_AQI: number
}

const API = 'https://aqipredector.onrender.com'

// AQI 0–500 mapped to arc dashoffset (circumference r=140 → 879.6)
function aqiOffset(aqi: number) {
  const pct = Math.min(Math.max(aqi, 0), 300) / 300
  return 879.6 - pct * 879.6
}


export default function Dashboard() {
  const [live, setLive] = useState<LiveData>({ temperature: 0, humidity: 0, gas_level: 0, predicted_aqi: 0 })
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [connected, setConnected] = useState(false)

  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/live`)
      if (r.ok) { const j = await r.json(); setLive(j.data); setConnected(true) }
    } catch { setConnected(false) }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/history`)
      if (r.ok) { const j = await r.json(); setHistory(j.data) }
    } catch {}
  }, [])

  useEffect(() => {
    fetchLive(); fetchHistory()
    const id = setInterval(() => { fetchLive(); fetchHistory() }, 2500)
    return () => clearInterval(id)
  }, [fetchLive, fetchHistory])

  const aqi = live.predicted_aqi
  const aqiLabel = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy' : 'Hazardous'
  const aqiColor = aqi <= 50 ? '#99f7ff' : aqi <= 100 ? '#fbbf24' : '#ff716c'

  return (
    <div className="min-h-screen">
      {/* Ambient Blobs */}
      <div className="ambient-glow bg-[#2f2ebe]" style={{ top: '-20%', left: '-10%' }} />
      <div className="ambient-glow bg-[#00f1fe]" style={{ bottom: '-10%', right: '-5%' }} />

      {/* ── Top Nav ───────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/40 backdrop-blur-xl flex justify-between items-center px-8 py-4 shadow-[0_8px_32px_rgba(0,242,255,0.05)]">
        <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent font-headline tracking-tight">
          AetherLab
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-cyan-400 border-b-2 border-cyan-400 pb-1 font-headline tracking-tight transition-all active:scale-95 duration-200">Dashboard</Link>
          <Link href="/manual" className="text-slate-400 hover:text-cyan-300 transition-colors font-headline tracking-tight active:scale-95 duration-200">AI Forecast</Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-xs">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-slate-400">{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </nav>

      {/* ── Icon Sidebar ──────────────────────── */}
      <aside className="hidden lg:flex flex-col h-screen w-16 fixed left-0 top-0 border-r border-white/5 bg-slate-950/60 backdrop-blur-2xl items-center gap-8 pt-24 z-40 py-6">
        <Link href="/" className="flex items-center justify-center text-cyan-400 bg-cyan-500/10 w-10 h-10 rounded-lg border-l-4 border-cyan-400">
          <span className="material-symbols-outlined">sensors</span>
        </Link>
        <Link href="/manual" className="flex items-center justify-center text-slate-500 hover:text-cyan-200 hover:bg-indigo-500/10 w-10 h-10 rounded-lg transition-all">
          <span className="material-symbols-outlined">auto_awesome</span>
        </Link>
      </aside>

      {/* ── Main Content ──────────────────────── */}
      <main className="pt-28 pb-12 px-8 lg:pl-24 max-w-[1600px] mx-auto grid grid-cols-12 gap-8">

        {/* Left: Large Radial AQI Gauge */}
        <section className="col-span-12 lg:col-span-7 xl:col-span-8 glass-panel rounded-xl p-10 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-6 left-8">
            <h2 className="font-headline text-[#a3abc0] text-sm uppercase tracking-[0.2em]">Air Pollution Level Prediction</h2>
            <p className="text-2xl font-headline font-bold text-[#dde5fb] mt-1">Live Sensor Feed</p>
          </div>

          <div className="relative flex items-center justify-center mt-8">
            <svg className="w-80 h-80 transform -rotate-90">
              <circle cx="160" cy="160" fill="transparent" r="140" stroke="#1a263c" strokeWidth="12" />
              <circle
                cx="160" cy="160" fill="transparent" r="140"
                stroke={aqiColor}
                strokeWidth="12"
                strokeDasharray="879.6"
                strokeDashoffset={aqiOffset(aqi)}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px ${aqiColor})`, transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center text-center">
              <span className="font-headline text-7xl font-bold text-[#dde5fb]">{aqi.toFixed(0)}</span>
              <span className="font-headline font-bold tracking-widest uppercase text-sm mt-2" style={{ color: aqiColor }}>{aqiLabel}</span>
              <span className="text-[#a3abc0] text-xs mt-1">Gas: {live.gas_level.toFixed(0)} ppm</span>
            </div>
          </div>

          <div className="mt-12 flex gap-12 w-full justify-center">
            <div className="text-center">
              <p className="text-[#a3abc0] text-xs font-label uppercase tracking-wider">Temperature</p>
              <p className="font-headline text-xl mt-1">{live.temperature.toFixed(1)} <span className="text-xs text-[#6d7589]">°C</span></p>
            </div>
            <div className="text-center">
              <p className="text-[#a3abc0] text-xs font-label uppercase tracking-wider">Humidity</p>
              <p className="font-headline text-xl mt-1">{live.humidity.toFixed(1)} <span className="text-xs text-[#6d7589]">%</span></p>
            </div>
            <div className="text-center">
              <p className="text-[#a3abc0] text-xs font-label uppercase tracking-wider">Gas Level</p>
              <p className="font-headline text-xl mt-1">{live.gas_level.toFixed(0)} <span className="text-xs text-[#6d7589]">ppm</span></p>
            </div>
          </div>
        </section>

        {/* Right: Metric Cards */}
        <aside className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          {/* Temperature */}
          <div className="glass-panel rounded-xl p-6 flex justify-between items-center hover:bg-white/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#2f2ebe]/30 flex items-center justify-center text-[#9093ff]">
                <span className="material-symbols-outlined">thermostat</span>
              </div>
              <div>
                <p className="text-[#a3abc0] text-xs uppercase tracking-widest font-label">Temperature</p>
                <p className="font-headline text-3xl font-medium">{live.temperature.toFixed(1)}<span className="text-[#a3abc0] text-lg">°C</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#c6fff3] text-xs">Ambient</p>
              <p className="text-[#a3abc0] text-[10px]">ESP32 Sensor</p>
            </div>
          </div>

          {/* Humidity */}
          <div className="glass-panel rounded-xl p-6 flex justify-between items-center hover:bg-white/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#00f1fe]/20 flex items-center justify-center text-[#99f7ff]">
                <span className="material-symbols-outlined">humidity_percentage</span>
              </div>
              <div>
                <p className="text-[#a3abc0] text-xs uppercase tracking-widest font-label">Humidity</p>
                <p className="font-headline text-3xl font-medium">{live.humidity.toFixed(1)}<span className="text-[#a3abc0] text-lg">%</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#99f7ff] text-xs">Relative</p>
              <p className="text-[#a3abc0] text-[10px]">DHT Sensor</p>
            </div>
          </div>

          {/* Gas Concentration */}
          <div className="glass-panel rounded-xl p-6 hover:bg-white/5 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#65fde6]/20 flex items-center justify-center text-[#c6fff3]">
                <span className="material-symbols-outlined">air</span>
              </div>
              <div>
                <p className="text-[#a3abc0] text-xs uppercase tracking-widest font-label">Gas Concentration</p>
                <p className="font-headline text-3xl font-medium">{live.gas_level.toFixed(0)}<span className="text-[#a3abc0] text-lg">ppm</span></p>
              </div>
            </div>
            <div className="w-full bg-[#1a263c] h-1 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min((live.gas_level / 1000) * 100, 100)}%`,
                  background: 'linear-gradient(to right, #99f7ff, #9093ff)'
                }}
              />
            </div>
            <p className="text-[#a3abc0] text-[10px] mt-2">Threshold: 1000 ppm (Safety Limit)</p>
          </div>
        </aside>

        {/* Bottom: Area Chart */}
        <section className="col-span-12 glass-panel rounded-xl p-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h3 className="font-headline text-[#a3abc0] text-sm uppercase tracking-[0.2em]">Temporal Analysis</h3>
              <p className="text-2xl font-headline font-bold text-[#dde5fb] mt-1">Pollution History Log</p>
            </div>
          </div>

          <AqiChart data={history} />

          {/* Time row hint */}
          <div className="flex justify-between mt-4 text-[10px] font-label text-[#a3abc0] uppercase tracking-widest px-1">
            <span>Oldest</span><span>→</span><span>Latest</span>
          </div>
        </section>
      </main>
    </div>
  )
}
