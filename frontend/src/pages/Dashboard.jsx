import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { HealthDistributionChart, MachineHealthBarChart } from '../components/Charts.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [machines, setMachines] = useState([])
  const [alerts, setAlerts] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [reliability, setReliability] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/reports/dashboard'),
      api.get('/api/machines'),
      api.get('/api/alerts'),
      api.get('/api/maintenance/due/upcoming'),
      api.get('/api/reports/reliability'),
    ])
      .then(([s, m, a, u, r]) => {
        setSummary(s); setMachines(m); setAlerts(a); setUpcoming(u); setReliability(r)
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!summary) return <Loading />

  const tiles = [
    { label: 'TOTAL MACHINES', value: summary.total_machines, cls: '' },
    { label: 'HEALTHY', value: summary.healthy, cls: 'healthy' },
    { label: 'NEEDS ATTENTION', value: summary.attention, cls: 'warning' },
    { label: 'CRITICAL', value: summary.critical, cls: 'critical' },
    { label: 'OPEN WORK ORDERS', value: summary.open_work_orders, cls: '' },
    { label: 'UPCOMING MAINTENANCE', value: summary.upcoming_maintenance, cls: '' },
    { label: 'ACTIVE ALERTS', value: summary.active_alerts, cls: summary.active_alerts > 0 ? 'warning' : '' },
  ]

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Dashboard</div>
      </div>
      <div className="content">
        <div className="stat-grid">
          {tiles.map((t) => (
            <div className="stat-tile" key={t.label}>
              <div className="stat-label">{t.label}</div>
              <div className={`stat-value ${t.cls}`}>{t.value}</div>
            </div>
          ))}
        </div>

        <div className="grid-2 section-gap">
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Health Distribution</span></div>
            <div className="panel-body">
              <HealthDistributionChart healthy={summary.healthy} attention={summary.attention} critical={summary.critical} />
            </div>
          </div>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Health Score by Machine</span></div>
            <div className="panel-body">
              <MachineHealthBarChart machines={machines} />
            </div>
          </div>
        </div>

        <div className="grid-2 section-gap">
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Machine Health Overview</span></div>
            <table>
              <thead>
                <tr><th>Machine</th><th>Health</th><th>Status</th></tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id} className="clickable" onClick={() => navigate(`/machines/${m.id}`)}>
                    <td>{m.name}</td>
                    <td className="mono">{m.health_score}/100</td>
                    <td><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
                {machines.length === 0 && <tr><td colSpan={3} className="empty-state">No machines yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-header"><span className="panel-title">Active Alerts</span></div>
            <table>
              <thead><tr><th>Message</th><th>Severity</th></tr></thead>
              <tbody>
                {alerts.slice(0, 6).map((a) => (
                  <tr key={a.id}>
                    <td>{a.message}</td>
                    <td><StatusBadge status={a.severity} /></td>
                  </tr>
                ))}
                {alerts.length === 0 && <tr><td colSpan={2} className="empty-state">No active alerts.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid-2">
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Upcoming Maintenance</span></div>
            <table>
              <thead><tr><th>Machine</th><th>Hours Remaining</th><th></th></tr></thead>
              <tbody>
                {upcoming.slice(0, 6).map((u) => (
                  <tr key={u.machine_id}>
                    <td>{u.name}</td>
                    <td className="mono">{u.hours_remaining}h</td>
                    <td>{u.overdue ? <StatusBadge status="critical" /> : u.due_soon ? <StatusBadge status="warning" /> : <StatusBadge status="healthy" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-header"><span className="panel-title">Most Frequently Failing Machines</span></div>
            <table>
              <thead><tr><th>Machine</th><th>Faults</th><th>Completion Rate</th></tr></thead>
              <tbody>
                {reliability.slice(0, 6).map((r) => (
                  <tr key={r.machine_id}>
                    <td>{r.name}</td>
                    <td className="mono">{r.fault_count}</td>
                    <td className="mono">{r.completion_rate != null ? `${r.completion_rate}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

export function Loading() {
  return <div className="content"><div className="empty-state">Loading…</div></div>
}

export function ErrorState({ message }) {
  return (
    <div className="content">
      <div className="panel panel-body">
        <strong style={{ color: 'var(--critical)' }}>Couldn't reach the backend.</strong>
        <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>
          Make sure the API is running (see backend/README) and VITE_API_URL points at it.
        </p>
        <p className="mono" style={{ color: 'var(--text-faint)', marginTop: 8, fontSize: 12 }}>{message}</p>
      </div>
    </div>
  )
}
