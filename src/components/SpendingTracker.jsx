import React, { useState } from 'react'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const CATEGORIES = ['Groceries', 'Fun/Travel', 'Out to Eat', 'Gas', 'Shopping/Misc', 'Other']

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}
function fmtShort(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function ProgressBar({ value, max }) {
  const pct   = max ? Math.min((value / max) * 100, 100) : 0
  const color = pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--yellow)' : 'var(--blue)'
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function getPhase(startDate, month, year) {
  const start = new Date(startDate)
  const idx   = (year - start.getFullYear()) * 12 + (month - start.getMonth()) + 1
  return idx >= 1 && idx <= 3
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function SpendingTracker({ settings, transactions, setTransactions }) {
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [form, setForm] = useState({ date: todayStr(), amount: '', category: 'Groceries', note: '' })

  const isEarly = getPhase(settings.startDate, selMonth, selYear)
  const budget  = isEarly ? settings.earlyBudget : settings.laterBudget
  const catLimits = {
    'Groceries':     budget.groceries,
    'Fun/Travel':    budget.funTravel,
    'Out to Eat':    budget.outToEat,
    'Gas':           budget.gas,
    'Shopping/Misc': budget.shopping,
    'Other':         null,
  }

  // Transactions for selected month
  const monthTxns = transactions
    .filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === selMonth && d.getFullYear() === selYear
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const catTotals = {}
  CATEGORIES.forEach(c => {
    catTotals[c] = monthTxns.filter(t => t.category === c).reduce((s, t) => s + t.amount, 0)
  })
  const totalSpend = monthTxns.reduce((s, t) => s + t.amount, 0)

  const openAdd = () => {
    setEditId(null)
    setForm({ date: todayStr(), amount: '', category: 'Groceries', note: '' })
    setShowForm(true)
  }
  const openEdit = (txn) => {
    setEditId(txn.id)
    setForm({ date: txn.date, amount: String(txn.amount), category: txn.category, note: txn.note })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const handleSubmit = (e) => {
    e.preventDefault()
    const txn = {
      id:       editId || String(Date.now()),
      date:     form.date,
      amount:   parseFloat(form.amount),
      category: form.category,
      note:     form.note.trim(),
    }
    setTransactions(prev =>
      editId ? prev.map(t => t.id === editId ? txn : t) : [...prev, txn]
    )
    closeForm()
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this transaction?')) {
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
  }

  const prevMonth = () => {
    if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1) }
    else setSelMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1) }
    else setSelMonth(m => m + 1)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Spending Tracker</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Transaction</button>
      </div>

      {/* Month Nav */}
      <div className="month-nav">
        <button className="month-btn" onClick={prevMonth}>‹</button>
        <span className="month-label">{MONTH_NAMES[selMonth]} {selYear}</span>
        <button className="month-btn" onClick={nextMonth}>›</button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card form-card">
          <div className="card-section-title">{editId ? 'Edit Transaction' : 'New Transaction'}</div>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Amount ($)</label>
              <input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Note (optional)</label>
              <input type="text" placeholder="What was this for?" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn-primary">{editId ? 'Save Changes' : 'Add'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Category Summary */}
      <div className="card">
        <div className="card-section-title">
          Category Breakdown — {fmt(totalSpend)} spent
        </div>
        {CATEGORIES.map(cat => {
          const spent = catTotals[cat] || 0
          const limit = catLimits[cat]
          if (!spent && !limit) return null
          return (
            <div key={cat} className="budget-row-full">
              <div className="budget-row-top">
                <span>{cat}</span>
                <span className={limit && spent > limit ? 'amount-red' : ''}>
                  {fmt(spent)}
                  {limit
                    ? <span className="muted"> / {fmtShort(limit)}</span>
                    : <span className="muted"> / no limit</span>}
                </span>
              </div>
              {limit && <ProgressBar value={spent} max={limit} />}
            </div>
          )
        })}
        {totalSpend === 0 && (
          <p className="empty-state">No spending logged for this month.</p>
        )}
      </div>

      {/* Transaction List */}
      <div className="card">
        <div className="card-section-title">Transactions ({monthTxns.length})</div>
        {monthTxns.length === 0 ? (
          <p className="empty-state">No transactions this month. Add one above!</p>
        ) : (
          <div className="txn-list">
            {monthTxns.map(txn => (
              <div key={txn.id} className="txn-row">
                <div className="txn-info">
                  <div className="txn-category">{txn.category}</div>
                  {txn.note
                    ? <div className="txn-note">{txn.note}</div>
                    : <div className="txn-note"><span className="muted">No note</span></div>}
                  <div className="txn-date">
                    {new Date(txn.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="txn-right">
                  <div className="txn-amount">−{fmt(txn.amount)}</div>
                  <div className="txn-actions">
                    <button className="btn-icon" onClick={() => openEdit(txn)} title="Edit">✏️</button>
                    <button className="btn-icon btn-icon-red" onClick={() => handleDelete(txn.id)} title="Delete">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
