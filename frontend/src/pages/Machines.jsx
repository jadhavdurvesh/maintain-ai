import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { Loading, ErrorState } from './Dashboard.jsx'

const EMPTY_FORM = {
  machine_code: '', name: '', category: 'induction_motor', manufacturer: '',
  model_number: '', location: '', department: '', operating_hours: 0,
  criticality: 'medium', maintenance_interval_hours: 500,
}

const RUNTIME_STYLES = {
  running: { color: '#4ade80', background: 'rgba(74, 222, 128, 0.10)', border: 'rgba(74, 222, 128, 0.28)' },
  idle: { color: '#facc15', background: 'rgba(250, 204, 21, 0.10)', border: 'rgba(250, 204, 21, 0.28)' },
  stopped: { color: '#94a3b8', background: 'rgba(148, 163, 184, 0.10)', border: 'rgba(148, 163, 184, 0.28)' },
  maintenance: { color: '#60a5fa', background: 'rgba(96, 165, 250, 0.10)', border: 'rgba(96, 165, 250, 0.28)' },
  fault: { color: '#f87171', background: 'rgba(248, 113, 113, 0.10)', border: 'rgba(248, 113, 113, 0.28)' },
}

function RuntimeBadge({ state }) {
  const normalized = state || 'stopped'
  const style = RUNTIME_STYLES[normalized] || RUNTIME_STYLES.stopped
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 9px',
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.color, boxShadow: normalized === 'running' ? `0 0 8px ${style.color}` : 'none' }} />
      {label}
    </span>
  )
}

function formatHours(value) {
  const hours = Number(value || 0)
  return hours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export default function Machines() {
  const [machines, setMachines] = useState(null)
  const [runtimeByMachine, setRuntimeByMachine] = useState({})
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const navigate = useNavigate()
  const mountedRef = useRef(true)

  const loadRuntime = async (items) => {
    if (!items?.length) {
      setRuntimeByMachine({})
      return
    }

    const results = await Promise.all(
      items.map(async (machine) => {
        try {
          return [machine.id, await api.get(`/api/machines/${machine.id}/runtime`)]
        } catch {
          return [machine.id, null]
        }
      }),
    )

    if (!mountedRef.current) return
    setRuntimeByMachine((current) => {
      const next = { ...current }
      results.forEach(([id, runtime]) => {
        if (runtime) next[id] = runtime
      })
      return next
    })
  }

  const load = async () => {
    try {
      const items = await api.get('/api/machines')
      if (!mountedRef.current) return
      setMachines(items)
      await loadRuntime(items)
    } catch (e) {
      if (mountedRef.current) setError(e.message)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    load()

    const timer = setInterval(async () => {
      try {
        const items = await api.get('/api/machines')
        if (!mountedRef.current) return
        setMachines(items)
        await loadRuntime(items)
      } catch {
        // Keep the last good list/runtime snapshot if a polling request fails.
      }
    }, 5000)

    return () => {
      mountedRef.current = false
      clearInterval(timer)
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/machines', {
        ...form,
        operating_hours: Number(form.operating_hours),
        maintenance_interval_hours: Number(form.maintenance_interval_hours),
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  if (error) return <ErrorState message={error} />
  if (!machines) return <Loading />

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Machines &amp; Assets</div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add Machine'}
        </button>
      </div>
      <div className="content">
        {showForm && (
          <div className="panel section-gap">
            <div className="panel-header"><span className="panel-title">New Machine</span></div>
            <form className="panel-body" onSubmit={submit}>
              <div className="grid-3">
                <div className="field">
                  <label>Machine code</label>
                  <input required value={form.machine_code} onChange={(e) => setForm({ ...form, machine_code: e.target.value })} placeholder="M-005" />
                </div>
                <div className="field">
                  <label>Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Induction Motor M-005" />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="induction_motor">Induction motor</option>
                    <option value="pump">Pump</option>
                    <option value="conveyor">Conveyor</option>
                    <option value="compressor">Compressor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Manufacturer</label>
                  <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="field">
                  <label>Department</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
                <div className="field">
                  <label>Initial operating hours</label>
                  <input type="number" value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} />
                </div>
                <div className="field">
                  <label>Maintenance interval (hours)</label>
                  <input type="number" value={form.maintenance_interval_hours} onChange={(e) => setForm({ ...form, maintenance_interval_hours: e.target.value })} />
                </div>
                <div className="field">
                  <label>Criticality</label>
                  <select value={form.criticality} onChange={(e) => setForm({ ...form, criticality: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <button className="btn" type="submit">Save Machine</button>
            </form>
          </div>
        )}

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Live Machine Runtime</span>
            <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>Updates every 5 seconds</span>
          </div>
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th>Location</th><th>Operating Hours</th><th>Runtime</th><th>Health</th><th>Condition</th></tr>
            </thead>
            <tbody>
              {machines.map((m) => {
                const runtime = runtimeByMachine[m.id]
                const hours = runtime?.operating_hours ?? m.operating_hours
                const state = runtime?.state || 'stopped'

                return (
                  <tr key={m.id} className="clickable" onClick={() => navigate(`/machines/${m.id}`)}>
                    <td className="mono">{m.machine_code}</td>
                    <td>{m.name}</td>
                    <td>{m.location || '—'}</td>
                    <td className="mono">
                      <strong>{formatHours(hours)}</strong> h
                      {runtime?.state === 'running' && <span style={{ marginLeft: 7, color: '#4ade80', fontSize: 11 }}>LIVE</span>}
                    </td>
                    <td><RuntimeBadge state={state} /></td>
                    <td className="mono">{m.health_score}/100</td>
                    <td><StatusBadge status={m.status} /></td>
                  </tr>
                )
              })}
              {machines.length === 0 && <tr><td colSpan={7} className="empty-state">No machines yet — add your first one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
