import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const API = 'http://localhost:4000/api/simulation'
const SOCKET_URL = 'http://localhost:4000'

const STAGES = [
  { key: 'setup',      label: 'Setup',      icon: '⚙️',  actor: 'system'  },
  { key: 'seeding',    label: 'Seeding',    icon: '🌱',  actor: 'manager' },
  { key: 'growing',    label: 'Growing',    icon: '📈',  actor: 'admin'   },
  { key: 'harvesting', label: 'Harvesting', icon: '🌾',  actor: 'manager' },
  { key: 'completed',  label: 'Completed',  icon: '🎉',  actor: 'admin'   },
  { key: 'finished',   label: 'Finished',   icon: '🏁',  actor: 'system'  },
]

const ROLE_COLORS = {
  admin:   { bg: '#3b82f620', border: '#3b82f6', text: '#60a5fa', label: '🧑‍💼 Admin'   },
  manager: { bg: '#8b5cf620', border: '#8b5cf6', text: '#a78bfa', label: '👔 Manager' },
  member:  { bg: '#10b98120', border: '#10b981', text: '#34d399', label: '👥 Member'  },
  ai:      { bg: '#f59e0b20', border: '#f59e0b', text: '#fbbf24', label: '🤖 AI'      },
  system:  { bg: '#6b728020', border: '#6b7280', text: '#9ca3af', label: '⚙️ System'  },
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.system
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: '9999px', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

function StatusBadge({ running, stage }) {
  if (!stage || stage === 'setup' && !running) {
    return <span style={badge('#6b7280')}>Idle</span>
  }
  if (running) return <span style={badge('#3b82f6', true)}>● Running</span>
  if (stage === 'finished') return <span style={badge('#10b981')}>✅ Finished</span>
  return <span style={badge('#f59e0b')}>Paused</span>
}

function badge(color, pulse = false) {
  return {
    background: `${color}25`,
    border: `1px solid ${color}`,
    color,
    borderRadius: '9999px',
    padding: '4px 14px',
    fontSize: '13px',
    fontWeight: 700,
    animation: pulse ? 'simPulse 2s infinite' : 'none',
  }
}

function UserCard({ name, role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.system
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: '#1e2330', borderRadius: '10px', padding: '10px 14px',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: c.bg, border: `2px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: c.text, fontWeight: 800, fontSize: '13px', flexShrink: 0,
      }}>{initials}</div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{name}</div>
        <RoleBadge role={role} />
      </div>
    </div>
  )
}

export default function SimulationPanel() {
  const [status, setStatus]     = useState(null)
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [users, setUsers]       = useState(null)
  const [batchInfo, setBatchInfo] = useState(null)
  const [stageIndex, setStageIndex] = useState(-1)
  const [simRunning, setSimRunning] = useState(false)
  const feedRef = useRef(null)
  const socketRef = useRef(null)

  // ── Socket.io connection ──────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('sim:update', (event) => {
      setEvents(prev => [...prev, event])
      setStageIndex(event.stageIndex ?? -1)
      setSimRunning(true)
      if (event.users) setUsers(event.users)
      if (event.batchId) setBatchInfo(prev => ({ ...prev, batchId: event.batchId, status: event.batchStatus || prev?.status }))
      if (event.healthScore !== undefined) setBatchInfo(prev => ({ ...prev, healthScore: event.healthScore, predictedHarvest: event.predictedHarvest }))
    })

    socket.on('sim:finished', (data) => {
      setSimRunning(false)
      setStageIndex(5)
      setBatchInfo(prev => ({ ...prev, status: 'completed', batchId: data.batchId }))
    })

    socket.on('sim:reset', () => {
      setEvents([])
      setStageIndex(-1)
      setSimRunning(false)
      setUsers(null)
      setBatchInfo(null)
    })

    return () => socket.disconnect()
  }, [])

  // ── Auto-scroll feed ─────────────────────────────────────────
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [events])

  // ── Poll status on mount ──────────────────────────────────────
  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const r = await fetch(`${API}/status`)
      const data = await r.json()
      setStatus(data)
      if (data.events?.length) setEvents(data.events)
      if (data.running) { setSimRunning(true); setStageIndex(data.stageIndex ?? 0) }
      if (data.users && Object.keys(data.users).length) setUsers(data.users)
      if (data.batchId) setBatchInfo(prev => ({ ...prev, batchId: data.batchId }))
    } catch {
      // backend not up yet
    }
  }

  async function handleStart() {
    setLoading(true)
    setError(null)
    setEvents([])
    setStageIndex(-1)
    setBatchInfo(null)
    setUsers(null)
    try {
      const r = await fetch(`${API}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Use faster intervals: 30s seeding, 60s each for growing/harvesting/completed, 10s done
        body: JSON.stringify({ intervalsSec: [30, 60, 60, 60, 10] }),
      })
      if (!r.ok) {
        const d = await r.json()
        throw new Error(d.message || 'Failed to start simulation')
      }
      setSimRunning(true)
      setStageIndex(0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    setLoading(true)
    setError(null)
    try {
      await fetch(`${API}/reset`, { method: 'POST' })
      setEvents([])
      setStageIndex(-1)
      setSimRunning(false)
      setUsers(null)
      setBatchInfo(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const currentStageKey = STAGES[stageIndex]?.key
  const totalMs = (30 + 60 + 60 + 60 + 10) * 1000
  const elapsed = status?.elapsedMs || 0
  const progress = Math.min(100, Math.round((elapsed / totalMs) * 100))

  return (
    <div style={{
      minHeight: '80vh',
      background: 'linear-gradient(135deg, #0f1117 0%, #131926 60%, #0d1f2d 100%)',
      padding: '32px 24px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      marginTop: '5rem'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes simPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .sim-event { animation: slideIn 0.35s ease; }
        .sim-btn { transition: all 0.2s; cursor: pointer; font-weight: 700; border: none; border-radius: 10px; padding: 10px 12px; font-size: 14px; }
        .sim-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        .sim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <h1 style={{ color: '#f1f5f9', fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              🎬 Demo Simulation
            </h1>
            <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: '14px' }}>
              Full crop lifecycle · ~4 minutes · AI insights · Role-based actions · Live Socket.io feed
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge running={simRunning} stage={currentStageKey} />
            <button
              className="sim-btn"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff' }}
              disabled={loading || simRunning}
              onClick={handleStart}
            >
              {loading ? '⏳ Starting…' : '▶ Start Demo'}
            </button>
            <button
              className="sim-btn"
              style={{ background: '#1e2330', color: '#94a3b8', border: '1px solid #334155' }}
              disabled={loading}
              onClick={handleReset}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#7f1d1d30', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', color: '#f87171', marginBottom: 24 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Stage Timeline ── */}
        <div style={{
          background: '#161b27', border: '1px solid #1e2a3a', borderRadius: 16,
          padding: '24px', marginBottom: 24,
        }}>
          <h3 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>
            Lifecycle Progress
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STAGES.map((s, i) => {
              const done = stageIndex > i
              const active = stageIndex === i
              const c = done ? '#10b981' : active ? '#3b82f6' : '#334155'
              return (
                <React.Fragment key={s.key}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: done ? '#10b98120' : active ? '#3b82f620' : '#1e2330',
                      border: `2px solid ${c}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: active ? '22px' : '18px',
                      boxShadow: active ? `0 0 16px ${c}60` : 'none',
                      transition: 'all 0.4s',
                    }}>
                      {done ? '✓' : s.icon}
                    </div>
                    <div style={{ fontSize: '11px', color: active ? '#f1f5f9' : done ? '#34d399' : '#475569', fontWeight: active ? 700 : 500, marginTop: 6, textAlign: 'center' }}>
                      {s.label}
                    </div>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div style={{
                      height: 2, flex: 1, maxWidth: 48,
                      background: done ? '#10b981' : '#1e2330',
                      borderRadius: 2, transition: 'background 0.4s',
                      marginBottom: 22,
                    }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* ── Live Event Feed ── */}
          <div style={{
            background: '#161b27', border: '1px solid #1e2a3a', borderRadius: 16, padding: '24px',
            display: 'flex', flexDirection: 'column',
          }}>
            <h3 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 16px' }}>
              Live Event Feed
            </h3>
            <div
              ref={feedRef}
              style={{
                flex: 1, minHeight: 360, maxHeight: 440, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
            >
              {events.length === 0 && (
                <div style={{ color: '#475569', fontSize: '14px', textAlign: 'center', marginTop: 80 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
                  Click <strong>Start Demo</strong> to begin the simulation.<br />
                  Events will appear here in real time via Socket.io.
                </div>
              )}
              {events.map((ev, i) => {
                const c = ROLE_COLORS[ev.actorRole] || ROLE_COLORS.system
                return (
                  <div
                    key={i}
                    className="sim-event"
                    style={{
                      background: c.bg,
                      border: `1px solid ${c.border}30`,
                      borderLeft: `3px solid ${c.border}`,
                      borderRadius: '8px',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <RoleBadge role={ev.actorRole} />
                      <span style={{ color: '#475569', fontSize: '11px' }}>
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5 }}>{ev.message}</div>
                    {ev.healthScore !== undefined && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                        <span style={{ color: '#fbbf24', fontSize: '12px' }}>💚 Health: {ev.healthScore}/100</span>
                        {ev.phAnomalies !== undefined && <span style={{ color: '#94a3b8', fontSize: '12px' }}>pH anomalies: {ev.phAnomalies}</span>}
                        {ev.ecAnomalies !== undefined && <span style={{ color: '#94a3b8', fontSize: '12px' }}>EC anomalies: {ev.ecAnomalies}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Batch card */}
            <div style={{ background: '#161b27', border: '1px solid #1e2a3a', borderRadius: 16, padding: '20px' }}>
              <h3 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px' }}>
                Active Batch
              </h3>
              {batchInfo ? (
                <div>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px', marginBottom: 8 }}>
                    🥬 Demo Lettuce Batch
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>Status</span>
                      <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: '13px', textTransform: 'capitalize' }}>{batchInfo.status || 'planning'}</span>
                    </div>
                    {batchInfo.healthScore !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Health Score</span>
                        <span style={{ color: batchInfo.healthScore >= 80 ? '#34d399' : '#f59e0b', fontWeight: 700, fontSize: '13px' }}>{batchInfo.healthScore}/100</span>
                      </div>
                    )}
                    {batchInfo.predictedHarvest && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Est. Harvest</span>
                        <span style={{ color: '#a78bfa', fontSize: '13px' }}>{new Date(batchInfo.predictedHarvest).toLocaleDateString()}</span>
                      </div>
                    )}
                    {batchInfo.batchId && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ color: '#475569', fontSize: '11px', wordBreak: 'break-all' }}>ID: {String(batchInfo.batchId)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#475569', fontSize: '13px' }}>No active batch yet.</div>
              )}
            </div>

            {/* User roster */}
            <div style={{ background: '#161b27', border: '1px solid #1e2a3a', borderRadius: 16, padding: '20px' }}>
              <h3 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px' }}>
                Demo Team
              </h3>
              {users ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <UserCard name={users.admin?.name}   role="admin"   />
                  <UserCard name={users.manager?.name} role="manager" />
                  <UserCard name={users.member1?.name} role="member"  />
                  <UserCard name={users.member2?.name} role="member"  />
                </div>
              ) : (
                <div style={{ color: '#475569', fontSize: '13px' }}>Users created during setup stage.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
