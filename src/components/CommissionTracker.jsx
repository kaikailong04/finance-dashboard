import React, { useState } from 'react'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}
function fmtShort(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function CommissionTracker({ settings, commissions, setCommissions }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: todayStr(), amount: '', note: '' })

  const hysaPct     = settings.commissionHYSAPct / 100
  const personalPct = settings.commissionPersonalPct / 100

  const preview = form.amount && !isNaN(parseFloat(form.amount))
    ? {
        hysa:     parseFloat(form.amount) * hysaPct,
        personal: parseFloat(form.amount) * personalPct,
      }
    : null

  const handleSubmit = (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    setCommissions(prev => [{
      id:             String(Date.now()),
      date:           form.date,
      amount,
      note:           form.note.trim(),
      hysaPortion:    +(amount * hysaPct).toFixed(2),
      personalPortion: +(amount * personalPct).toFixed(2),
    }, ...prev])
    setForm({ date: todayStr(), amount: '', note: '' })
    setShowForm(false)
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this commission entry?')) {
      setCommissions(prev => prev.filter(c => c.id !== id))
    }
  }

  const sorted       = [...commissions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const totalAmount  = commissions.reduce((s, c) => s + c.amount, 0)
  const totalHYSA    = commissions.reduce((s, c) => s + c.hysaPortion, 0)
  const totalPersonal = commissions.reduce((s, c) => s + c.personalPortion, 0)

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Commission Tracker</h2>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ Log Commission'}
        </button>
      </div>

      {/* Split Rule Banner */}
      <div className="commission-rule">
        <div className="split-pill split-hysa">{settings.commissionHYSAPct}% → HYSA</div>
        <div className="split-divider">+</div>
        <div className="split-pill split-personal">{settings.commissionPersonalPct}% → Personal</div>
      </div>

      {/* Running Totals */}
      <div className="grid-3">
        <div className="stat-card">
          <div className="stat-label">Total Commission Earned</div>
          <div className="stat-value">{fmtShort(totalAmount)}</div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-label">→ HYSA ({settings.commissionHYSAPct}%)</div>
          <div className="stat-value stat-green">{fmtShort(totalHYSA)}</div>
        </div>
        <div className="stat-card stat-card-blue">
          <div className="stat-label">→ Personal ({settings.commissionPersonalPct}%)</div>
          <div className="stat-value stat-blue">{fmtShort(totalPersonal)}</div>
        </div>
      </div>

      {/* Log Form */}
      {showForm && (
        <div className="card form-card">
          <div className="card-section-title">Log Commission Payment</div>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Gross Commission ($)</label>
              <input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div className="form-group form-full">
              <label>Note (optional)</label>
              <input type="text" placeholder="Deal name, pay period, etc." value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            {preview && (
              <div className="commission-preview">
                <span className="preview-hysa">HYSA: {fmt(preview.hysa)}</span>
                <span className="preview-personal">Personal: {fmt(preview.personal)}</span>
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Log Commission</button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      <div className="card">
        <div className="card-section-title">Commission History ({commissions.length})</div>
        {sorted.length === 0 ? (
          <p className="empty-state">No commissions logged yet. Hit the button above!</p>
        ) : (
          <div className="commission-list">
            {sorted.map(c => (
              <div key={c.id} className="commission-row">
                <div className="commission-info">
                  <div className="commission-amount">{fmt(c.amount)}</div>
                  {c.note
                    ? <div className="commission-note">{c.note}</div>
                    : <div className="commission-note"><span className="muted">No note</span></div>}
                  <div className="commission-date">
                    {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="commission-split">
                  <div className="split-item split-item-green">+{fmt(c.hysaPortion)} HYSA</div>
                  <div className="split-item split-item-blue">+{fmt(c.personalPortion)} Personal</div>
                </div>
                <button className="btn-icon btn-icon-red" onClick={() => handleDelete(c.id)} title="Delete">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
