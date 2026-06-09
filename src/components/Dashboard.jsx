import React from 'react'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const CATEGORIES = ['Groceries', 'Fun/Travel', 'Out to Eat', 'Gas', 'Shopping/Misc', 'Other']

function fmt(n, cents = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n)
}

function getPhase(startDate) {
  const start = new Date(startDate)
  const now   = new Date()
  const idx   = (now.getFullYear() - start.getFullYear()) * 12
              + (now.getMonth()    - start.getMonth()) + 1
  return { idx, isEarly: idx >= 1 && idx <= 3 }
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

export default function Dashboard({ settings, transactions, goals }) {
  const now = new Date()
  const { idx, isEarly } = getPhase(settings.startDate)
  const budget = isEarly ? settings.earlyBudget : settings.laterBudget

  // This month's variable spending
  const monthTxns = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const catSpend = {}
  CATEGORIES.forEach(c => {
    catSpend[c] = monthTxns.filter(t => t.category === c).reduce((s, t) => s + t.amount, 0)
  })

  const catLimits = {
    'Groceries':     budget.groceries,
    'Fun/Travel':    budget.funTravel,
    'Out to Eat':    budget.outToEat,
    'Gas':           budget.gas,
    'Shopping/Misc': budget.shopping,
    'Other':         null,
  }

  // Fixed costs for the phase
  const fixedTotal = isEarly
    ? budget.utilities
    : budget.rent + budget.utilities
  const savingsTotal = budget.rothIRA + budget.hysa
  const variableBudgeted = budget.groceries + budget.funTravel + budget.outToEat + budget.gas + budget.shopping
  const totalBudgeted = fixedTotal + savingsTotal + variableBudgeted
  const remaining = settings.takeHome - totalBudgeted

  const phaseLabel = idx < 1
    ? 'Pre-Start'
    : isEarly
    ? 'Rent-Free Phase'
    : 'Full Budget'

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</h2>
        <span className={`badge ${isEarly ? 'badge-blue' : 'badge-green'}`}>
          {idx >= 1 ? `Month ${idx} — ` : ''}{phaseLabel}
        </span>
      </div>

      {/* Income Breakdown */}
      <div className="section-title">Income Breakdown</div>
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-label">Gross Monthly (OTE)</div>
          <div className="stat-value">{fmt(settings.grossMonthly)}</div>
        </div>
        <div className="stat-card stat-card-red">
          <div className="stat-label">Taxes (Fed + GA + FICA)</div>
          <div className="stat-value stat-red">−{fmt(settings.federalTax)}</div>
        </div>
        <div className="stat-card stat-card-yellow">
          <div className="stat-label">401(k) Pre-Tax</div>
          <div className="stat-value stat-yellow">−{fmt(settings.contribution401k)}</div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-label">Take-Home to Bank</div>
          <div className="stat-value stat-green">{fmt(settings.takeHome)}</div>
        </div>
      </div>

      {/* Fixed + Savings */}
      <div className="section-title">Monthly Budget</div>
      <div className="grid-2">
        <div className="card">
          <div className="card-section-title">Fixed Expenses</div>
          {!isEarly && (
            <div className="budget-row">
              <span>Rent + Fee</span>
              <span className="amount-red">{fmt(budget.rent)}</span>
            </div>
          )}
          <div className="budget-row">
            <span>Utilities{isEarly ? ' + Fee' : ''}</span>
            <span className="amount-red">{fmt(budget.utilities)}</span>
          </div>
          <div className="budget-row" style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 10 }}>
            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subtotal</span>
            <span style={{ fontWeight: 700 }}>{fmt(fixedTotal)}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-section-title">Savings & Investments</div>
          <div className="budget-row">
            <span>Roth IRA</span>
            <span className="amount-blue">{fmt(budget.rothIRA)}</span>
          </div>
          <div className="budget-row">
            <span>HYSA</span>
            <span className="amount-blue">{fmt(budget.hysa)}</span>
          </div>
          <div className="budget-row" style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 10 }}>
            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subtotal</span>
            <span style={{ fontWeight: 700 }}>{fmt(savingsTotal)}</span>
          </div>
        </div>
      </div>

      {/* Variable Spending vs Budget */}
      <div className="card">
        <div className="card-section-title">Variable Spending — {MONTH_NAMES[now.getMonth()]}</div>
        {Object.entries(catLimits).map(([cat, limit]) => {
          const spent = catSpend[cat] || 0
          if (!limit && !spent) return null
          return (
            <div key={cat} className="budget-row-full">
              <div className="budget-row-top">
                <span>{cat}</span>
                <span className={limit && spent > limit ? 'amount-red' : ''}>
                  {fmt(spent, true)}
                  {limit
                    ? <span className="muted"> / {fmt(limit)}</span>
                    : <span className="muted"> / no limit</span>}
                </span>
              </div>
              {limit && <ProgressBar value={spent} max={limit} />}
            </div>
          )
        })}
        {CATEGORIES.every(c => !(catSpend[c])) && (
          <p className="empty-state" style={{ paddingTop: 8 }}>No spending logged this month yet.</p>
        )}
      </div>

      {/* Remaining */}
      <div className="remaining-card">
        <div className="remaining-label">Budgeted Surplus (Unallocated)</div>
        <div className={`remaining-value ${remaining < 0 ? 'amount-red' : 'amount-green'}`}>
          {fmt(remaining)}
        </div>
        <div className="remaining-sub">
          {fmt(settings.takeHome)} take-home − {fmt(totalBudgeted)} budgeted
        </div>
      </div>

      {/* ================================================================
          PLAID BANK CONNECTION — PLUG IN HERE
          ----------------------------------------------------------------
          To connect live account balances, replace the static takeHome /
          goals values above with data from the Plaid API:

          1. Install: npm install plaid
          2. Exchange public_token for access_token (one-time, store it)
          3. Call: plaidClient.accountsGet({ access_token })
          4. Pull balances from response.data.accounts[].balances.current

          Useful Plaid endpoints:
            - /accounts/get       → balances
            - /transactions/get   → spending history (replace manual tracker)
            - /identity/get       → account holder info

          Docs: https://plaid.com/docs/api/accounts/
          ================================================================ */}
    </div>
  )
}
