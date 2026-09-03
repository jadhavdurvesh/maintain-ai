import { useEffect, useState } from 'react'
import api from '../api/client.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { Loading, ErrorState } from './Dashboard.jsx'

export default function Alerts() {
  const [alerts, setAlerts] = useState(null)
  const [error, setError] = useState(null)

  const load = () => api.get('/api/alerts').then(setAlerts).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const ack = async (id) => { await api.post(`/api/alerts/${id}/acknowledge`); load() }
  const resolve = async (id) => { await api.post(`/api/alerts/${id}/resolve`); load() }

  if (error) return <ErrorState message={error} />
  if (!alerts) return <Loading />

  return (
    <>
      <div className="topbar"><div className="topbar-title">Alerts</div></div>
      <div className="content">
        <div className="panel">
          <table>
            <thead><tr><th>Severity</th><th>Message</th><th>Acknowledged</th><th></th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td><StatusBadge status={a.severity} /></td>
                  <td>{a.message}</td>
                  <td>{a.acknowledged ? 'Yes' : '—'}</td>
                  <td className="chip-row">
                    {!a.acknowledged && <button className="btn secondary" onClick={() => ack(a.id)}>Acknowledge</button>}
                    <button className="btn secondary" onClick={() => resolve(a.id)}>Resolve</button>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && <tr><td colSpan={4} className="empty-state">No active alerts. All clear.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
