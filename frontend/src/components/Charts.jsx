import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const COLORS = { healthy: '#35c9a5', attention: '#f0a93a', critical: '#e5563f', accent: '#4c8dff' }

const tooltipStyle = {
  background: '#1f2733',
  border: '1px solid #2a323d',
  borderRadius: 3,
  fontSize: 12,
  color: '#e7ecf2',
}

export function HealthDistributionChart({ healthy, attention, critical }) {
  const data = [
    { name: 'Healthy', value: healthy, color: COLORS.healthy },
    { name: 'Attention', value: attention, color: COLORS.attention },
    { name: 'Critical', value: critical, color: COLORS.critical },
  ].filter((d) => d.value > 0)

  if (data.length === 0) {
    return <div className="empty-state">No machines yet.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
          {data.map((d) => <Cell key={d.name} fill={d.color} stroke="none" />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MachineHealthBarChart({ machines }) {
  const data = machines.map((m) => ({
    name: m.name.length > 14 ? m.name.slice(0, 13) + '…' : m.name,
    health: m.health_score,
    color: m.health_score >= 70 ? COLORS.healthy : m.health_score >= 40 ? COLORS.attention : COLORS.critical,
  }))

  if (data.length === 0) {
    return <div className="empty-state">No machines yet.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a323d" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#8a97a8', fontSize: 11 }} axisLine={{ stroke: '#2a323d' }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#8a97a8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="health" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GenericBarChart({ data, xKey, yKey, color = COLORS.accent, height = 220 }) {
  if (!data || data.length === 0) {
    return <div className="empty-state">Nothing to show yet.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a323d" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: '#8a97a8', fontSize: 11 }} axisLine={{ stroke: '#2a323d' }} tickLine={false} />
        <YAxis tick={{ fill: '#8a97a8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey={yKey} fill={color} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
