'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'

export default function ManualEntry() {
  const [formData, setFormData] = useState({ temperature: '', humidity: '', gas_level: '' })
  const [prediction, setPrediction] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPrediction(null)

    try {
      const res = await fetch('http://127.0.0.1:5000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: parseFloat(formData.temperature),
          humidity: parseFloat(formData.humidity),
          gas_level: parseFloat(formData.gas_level)
        })
      })
      
      const json = await res.json()
      
      if (res.ok && json.status === 'success') {
        setPrediction(json.data.predicted_aqi)
      } else {
        setError(json.message || 'Failed to fetch prediction.')
      }
    } catch (err) {
      setError('Could not connect to the Python backend API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fly-in duration-500">
      
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Manual Forecast</h2>
        <p className="text-slate-400">Manually insert telemetry to run the AI regression model on isolated data points.</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-lg border border-white/5 rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Temperature (°C)</label>
            <input 
              type="number" 
              step="any"
              name="temperature"
              required
              value={formData.temperature}
              onChange={handleChange}
              placeholder="e.g. 25.5"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Humidity (%)</label>
            <input 
              type="number" 
              step="any"
              name="humidity"
              required
              value={formData.humidity}
              onChange={handleChange}
              placeholder="e.g. 60.0"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Gas Level Sensor</label>
            <input 
              type="number" 
              step="any"
              name="gas_level"
              required
              value={formData.gas_level}
              onChange={handleChange}
              placeholder="e.g. 450"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-900 font-bold text-lg rounded-xl px-4 py-4 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? <Activity className="animate-spin w-5 h-5"/> : <span>Run AI Prediction</span>}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {prediction !== null && (
          <div className="mt-8 p-6 rounded-2xl bg-slate-900 border-2 border-emerald-500/30 text-center animate-in zoom-in duration-300 shadow-xl shadow-emerald-500/10">
            <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Calculated AQI</div>
            <div className="text-5xl font-black text-white">{prediction.toFixed(1)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
