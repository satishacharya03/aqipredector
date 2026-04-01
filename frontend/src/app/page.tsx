'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Thermometer, Droplets, Wind, Activity } from 'lucide-react'

export default function Dashboard() {
  const [liveData, setLiveData] = useState({ temperature: 0, humidity: 0, gas_level: 0, predicted_aqi: 0 })
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Poll Data Logic
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/live')
        if (res.ok) {
          const json = await res.json()
          setLiveData(json.data)
        }
      } catch (e) {
        setError('Lost connection to backend server.')
      }
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/history')
        if (res.ok) {
          const json = await res.json()
          setHistory(json.data)
          setError('')
        }
      } catch (e) {
        setError('Lost connection to backend server.')
      }
    }

    // Initial fetch
    fetchLive()
    fetchHistory()
    setLoading(false)

    // Poll every 2 seconds
    const interval = setInterval(() => {
      fetchLive()
      fetchHistory() // History might be heavy, but required for live chart updates
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Dynamic color for AQI widget
  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return 'text-emerald-400 border-emerald-500/30 shadow-emerald-500/10'
    if (aqi <= 100) return 'text-amber-400 border-amber-500/30 shadow-amber-500/10'
    return 'text-rose-500 border-rose-500/30 shadow-rose-500/10'
  }

  if (loading) return <div className="text-center mt-20 animate-pulse text-slate-400">Booting neural link...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Global Hardware Feed</h2>
          <p className="text-slate-400">Listening to ESP32 / COM3 and Live Machine Learning Models</p>
        </div>
        {error && <div className="text-rose-400 text-sm font-semibold animate-pulse border border-rose-500/20 bg-rose-500/10 px-3 py-1 rounded-full">{error}</div>}
      </div>

      {/* Bento Grid layout for KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-800/50 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:border-teal-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-4">
            <span className="font-medium text-sm">Temperature</span>
            <Thermometer className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-4xl font-bold tracking-tighter text-white">
            {liveData.temperature.toFixed(1)}<span className="text-xl text-slate-500 font-normal">°C</span>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-4">
            <span className="font-medium text-sm">Humidity</span>
            <Droplets className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-4xl font-bold tracking-tighter text-white">
            {liveData.humidity.toFixed(1)}<span className="text-xl text-slate-500 font-normal">%</span>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-4">
            <span className="font-medium text-sm">Gas Sensor</span>
            <Wind className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-4xl font-bold tracking-tighter text-white">
            {liveData.gas_level.toFixed(0)}<span className="text-xl text-slate-500 font-normal">px</span>
          </div>
        </div>

        <div className={`bg-slate-800/30 backdrop-blur-xl border-2 rounded-2xl p-6 shadow-2xl transition-all ${getAqiColor(liveData.predicted_aqi)}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-sm tracking-wide uppercase opacity-80">Predicted AQI</span>
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-5xl font-black tracking-tighter">
            {liveData.predicted_aqi.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Recharts Historical Graph */}
      <div className="bg-slate-800/50 backdrop-blur-lg border border-white/5 rounded-3xl p-6 lg:p-8 mt-8 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-6">Historical Log Trajectory</h3>
        
        {history.length > 0 ? (
           <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis 
                  dataKey="Timestamp" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickFormatter={(val) => val.split(' ')[1]} 
                />
                <YAxis yAxisId="left" stroke="#34d399" fontSize={12} tickCount={6} />
                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff20', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="Predicted_AQI" 
                  stroke="#34d399" 
                  strokeWidth={3}
                  activeDot={{ r: 8 }} 
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="Gas_Level" 
                  stroke="#fbbf24" 
                  strokeWidth={2} 
                  opacity={0.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 w-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
            <p className="text-slate-500 font-medium">Insufficient Historical Data in backend (CSV might be empty)</p>
          </div>
        )}
      </div>

    </div>
  )
}
