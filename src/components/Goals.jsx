import React, { useState } from 'react'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function ProgressBar({ value, max, color }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="progress-track progress-track-lg">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// Returns months elapsed from start to now (clamped to ≥ 0)
function monthsFrom(dateStr) {
  const start = new Date(dateStr)
  const now   = new Date()
  return Math.max(
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
    0
  )
}

export default function Goals({ settings, goals, setGoals }) {
  const now = new Date()

  // ── HYSA ──────────────────────────────────────────────────────────────
  const hysaBalance   = goals.hysaBalance || 0
  const hysaPct       = Math.min((hysaBalance / settings.hysaGoal) * 100, 100)
  const hysaRemaining = Math.max(settings.hysaGoal - hysaBalance, 0)

  // Projected completion: future monthly HYSA savings (month 4+ = $500/mo)
  const start      = new Date(settings.startDate)
  const monthIndex = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1
  const futureRate = monthIndex <= 3 ? settings.earlyBudget.hysa : settings.laterBudget.hysa
  const hysaProjectedMonths = futureRate > 0 && hysaRemaining > 0 ? Math.ceil(hysaRemaining / futureRate) : 0
  const hysaProjectedDate = (() => {
    if (!hysaProjectedMonths) return null
    const d = new Date(now)
    d.setMonth(d.getMonth() + hysaProjectedMonths)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })()

  // ── Roth IRA ───────────────────────────────────────────────────────────
  // Auto-calculate: contributions since Jan 1 of current year (or startDate, whichever is later)
  const yearStart    = new Date(now.getFullYear(), 0, 1)
  const finStart     = new Date(settings.startDate)
  const rothStart    = finStart > yearStart ? finStart : yearStart
  const rothMonths   = Math.max(
    (now.getFullYear() - rothStart.getFullYear()) * 12 + (now.getMonth() - rothStart.getMonth()),
    0
  )
  const rothAuto     = Math.min(rothMonths * settings.earlyBudget.rothIRA, settings.rothIRAYearlyLimit)
  const rothBalance  = goals.rothIRAOverride !== null && goals.rothIRAOverride !== undefined
                       ? goals.rothIRAOverride
                       : rothAuto
  const rothPct      = Math.min((rothBalance / settings.rothIRAYearlyLimit) * 100, 100)
  const rothRemaining = Math.max(settings.rothIRAYearlyLimit - rothBalance, 0)
  const monthsToRothMax = settings.earlyBudget.rothIRA > 0
    ? Math.ceil(rothRemaining / settings.earlyBudget.rothIRA)
    : 0

  // ── 401(k) ─────────────────────────────────────────────────────────────
  const ira401kBalance  = goals.ira401kBalance || 0
  const ira401kPct      = Math.min((ira401kBalance / settings.ira401kYearlyMax) * 100, 100)
  const ira401kRemaining = Math.max(settings.ira401kYearlyMax - ira401kBalance, 0)

  // ── Form state ─────────────────────────────────────────────────────────
  const [hysaInput,   setHysaInput]   = useState('')
  const [ira401kInput, setIra401kInput] = useState('')
  const [rothInput,   setRothInput]   = useState('')

  const updateHYSA = (e) => {
    e.preventDefault()
    const val = parseFloat(hysaInput)
    if (!isNaN(val)) setGoals(g => ({ ...g, hysaBalance: val }))
    setHysaInput('')
  }
  const update401k = (e) => {
    e.preventDefault()
    const val = parseFloat(ira401kInput)
    if (!isNaN(val)) setGoals(g => ({ ...g, ira401kBalance: val }))
    setIra401kInput('')
  }
  const updateRoth = (e) => {
    e.preventDefault()
    const val = parseFloat(rothInput)
    setGoals(g => ({ ...g, rothIRAOverride: isNaN(val) ? null : val }))
    setRothInput('')
  }
  const resetRothAuto = () => setGoals(g => ({ ...g, rothIRAOverride: null }))

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Goals Progress</h2>
      </div>

      {/* ── HYSA ─────────────────────────────────────────────────────── */}
      <div className="card goal-card">
        <div className="goal-header">
          <div>
            <div className="goal-title">🏦 HYSA</div>
            <div className="goal-subtitle">High-Yield Savings Account</div>
          </div>
          <div className="goal-amounts">
            <span className="goal-current">{fmt(hysaBalance)}</span>
            <span className="goal-sep">/</span>
            <span className="goal-max">{fmt(settings.hysaGoal)}</span>
          </div>
        </div>
        <ProgressBar value={hysaBalance} max={settings.hysaGoal} color="var(--green)" />
        <div className="goal-stats">
          <span>{hysaPct.toFixed(1)}% complete</span>
          <span>{fmt(hysaRemaining)} remaining</span>
        </div>
        {hysaProjectedDate ? (
          <div className="goal-projection">
            📅 At {fmt(futureRate)}/mo → hit goal in <strong>{hysaProjectedDate}</strong>{' '}
            <span className="muted">({hysaProjectedMonths} months)</span>
          </div>
        ) : hysaBalance >= settings.hysaGoal ? (
          <div className="goal-projection">🎉 Goal reached!</div>
        ) : null}
        <form onSubmit={updateHYSA} className="goal-update-form">
          <input
            type="number" step="0.01" min="0"
            placeholder={`Update balance (currently ${fmt(hysaBalance)})`}
            value={hysaInput}
            onChange={e => setHysaInput(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-sm">Update</button>
        </form>
      </div>

      {/* ── Roth IRA ─────────────────────────────────────────────────── */}
      <div className="card goal-card">
        <div className="goal-header">
          <div>
            <div className="goal-title">📈 Roth IRA</div>
            <div className="goal-subtitle">{now.getFullYear()} Limit — Resets January 1</div>
          </div>
          <div className="goal-amounts">
            <span className="goal-current">{fmt(rothBalance)}</span>
            <span className="goal-sep">/</span>
            <span className="goal-max">{fmt(settings.rothIRAYearlyLimit)}</span>
          </div>
        </div>
        <ProgressBar value={rothBalance} max={settings.rothIRAYearlyLimit} color="var(--purple)" />
        <div className="goal-stats">
          <span>{rothPct.toFixed(1)}% complete</span>
          <span>{fmt(rothRemaining)} remaining</span>
        </div>
        {goals.rothIRAOverride === null || goals.rothIRAOverride === undefined ? (
          <div className="goal-projection">
            ⚡ Auto-tracking: {rothMonths} months × {fmt(settings.earlyBudget.rothIRA)}/mo
            {monthsToRothMax > 0 && <> — max in ~{monthsToRothMax} months</>}
          </div>
        ) : (
          <div className="goal-projection">
            ✏️ Manually set to {fmt(goals.rothIRAOverride)} —{' '}
            <button className="btn-link" onClick={resetRothAuto}>reset to auto-track</button>
          </div>
        )}
        <form onSubmit={updateRoth} className="goal-update-form">
          <input
            type="number" step="0.01" min="0"
            placeholder="Override balance ($) — leave blank to auto-track"
            value={rothInput}
            onChange={e => setRothInput(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-sm">Override</button>
        </form>
      </div>

      {/* ── 401(k) ───────────────────────────────────────────────────── */}
      <div className="card goal-card">
        <div className="goal-header">
          <div>
            <div className="goal-title">🏛️ 401(k)</div>
            <div className="goal-subtitle">
              IRS Max {now.getFullYear()}: {fmt(settings.ira401kYearlyMax)} — Contributing ~{settings.employerMatchPct}% (employer match only)
            </div>
          </div>
          <div className="goal-amounts">
            <span className="goal-current">{fmt(ira401kBalance)}</span>
            <span className="goal-sep">/</span>
            <span className="goal-max">{fmt(settings.ira401kYearlyMax)}</span>
          </div>
        </div>
        <ProgressBar value={ira401kBalance} max={settings.ira401kYearlyMax} color="var(--yellow)" />
        <div className="goal-stats">
          <span>{ira401kPct.toFixed(1)}% of IRS max</span>
          <span>{fmt(ira401kRemaining)} to max out</span>
        </div>
        <div className="goal-projection">
          ℹ️ Contributing {fmt(settings.contribution401k)}/mo pre-tax — enough to capture full employer match. Not maxing intentionally.
        </div>
        <form onSubmit={update401k} className="goal-update-form">
          <input
            type="number" step="0.01" min="0"
            placeholder={`Update balance (currently ${fmt(ira401kBalance)})`}
            value={ira401kInput}
            onChange={e => setIra401kInput(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-sm">Update</button>
        </form>
      </div>
    </div>
  )
}
