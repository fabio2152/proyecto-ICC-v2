import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useReadings } from '../../hooks/useReadings'
import { formatTime } from '../../lib/utils'

const WINDOWS = [
  { label: '30 min', minutes: 30 },
  { label: '2 h', minutes: 120 },
  { label: '24 h', minutes: 1440 },
]

export default function VitalsChart() {
  const [window, setWindow] = useState(120)
  const { data: readings } = useReadings(window)

  const chartData = (readings ?? []).map((r) => ({
    time: formatTime(r.timestamp),
    hr: r.heart_rate,
    spo2: r.spo2,
  }))

  return (
    <div className="rounded-lg bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">Tendencia de Vitales</span>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.minutes}
              onClick={() => setWindow(w.minutes)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                window === w.minutes
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 25%)" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(215 20% 65%)' }} interval="preserveStartEnd" />
          <YAxis yAxisId="hr" domain={[40, 140]} tick={{ fontSize: 11, fill: 'hsl(215 20% 65%)' }} label={{ value: 'BPM', angle: -90, position: 'insideLeft', fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
          <YAxis yAxisId="spo2" orientation="right" domain={[85, 100]} tick={{ fontSize: 11, fill: 'hsl(215 20% 65%)' }} label={{ value: 'SpO₂ %', angle: 90, position: 'insideRight', fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(222 47% 15%)', border: '1px solid hsl(217 33% 25%)', borderRadius: '8px', fontSize: 12 }}
            labelStyle={{ color: 'hsl(210 40% 98%)' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="hr" type="monotone" dataKey="hr" name="FC (BPM)" stroke="#f87171" dot={false} strokeWidth={2} />
          <Line yAxisId="spo2" type="monotone" dataKey="spo2" name="SpO₂ (%)" stroke="#60a5fa" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
