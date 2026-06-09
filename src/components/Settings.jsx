import React, { useState, useEffect } from 'react'
import { DEFAULT_SETTINGS } from '../App'

function Field({ label, stateKey, value, onChange, type = 'number', prefix = '$', step = '1', min = '0' }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className={prefix ? 'input-with-prefix' : ''}>
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type={type}
          step={step}
          min={min}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={prefix ? { paddingLeft: '28px' } : {}}
        />
      </div>
    </div>
  )
}

export default function Settings({ settings, setSettings }) {
  const [local, setLocal]   = useState(settings)
  const [saved, setSaved]   = useState(false)

  // Keep local in sync if parent settings change externally
  useEffect(() => { setLocal(settings) }, [settings])

  const set = (key, val) =>
    setLocal(s => ({ ...s, [key]: typeof val === 'string' ? parseFloat(val) || 0 : val }))

  const setBudget = (phase, key, val) =>
    setLocal(s => ({ ...s, [phase]: { ...s[phase], [key]: parseFloat(val) || 0 } }))

  const setStr = (key, val) =>
    setLocal(s => ({ ...s, [key]: val }))

  const handleSave = (e) => {
    e.preventDefault()
    setSettings(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    if (window.confirm('Reset ALL settings to defaults? This will not delete transactions or goals.')) {
      setLocal(DEFAULT_SETTINGS)
    }
  }

  const eb = local.earlyBudget  || {}
  const lb = local.laterBudget  || {}

  // Computed remaining for each phase
  const earlyTotal = (eb.utilities||0) + (eb.rothIRA||0) + (eb.hysa||0) +
                     (eb.groceries||0) + (eb.gas||0) + (eb.funTravel||0) +
                     (eb.outToEat||0)  + (eb.shopping||0)
  const earlyRemaining = (local.takeHome||0) - earlyTotal

  const laterTotal = (lb.rent||0) + (lb.utilities||0) + (lb.rothIRA||0) + (lb.hysa||0) +
                     (lb.groceries||0) + (lb.gas||0) + (lb.funTravel||0) +
                     (lb.outToEat||0)  + (lb.shopping||0)
  const laterRemaining = (local.takeHome||0) - laterTotal

  const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saved && <span className="badge badge-green">✓ Saved</span>}
          <button type="button" className="btn-ghost" onClick={handleReset}
            style={{ fontSize: '0.8rem', padding: '7px 14px' }}>
            Reset Defaults
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Income */}
        <div className="card settings-section">
          <div className="card-section-title">💰 Income & Taxes</div>
          <div className="settings-grid">
            <Field label="Gross Monthly (OTE)" value={local.grossMonthly}
              onChange={v => set('grossMonthly', v)} />
            <Field label="Federal + GA + FICA Taxes /mo" value={local.federalTax}
              onChange={v => set('federalTax', v)} />
            <Field label="401(k) Pre-Tax Contribution /mo" value={local.contribution401k}
              onChange={v => set('contribution401k', v)} />
            <Field label="Take-Home to Bank /mo" value={local.takeHome}
              onChange={v => set('takeHome', v)} />
            <Field label="Start Date" value={local.startDate}
              onChange={v => setStr('startDate', v)} type="date" prefix="" step={undefined} min={undefined} />
          </div>
        </div>

        {/* Commission Split */}
        <div className="card settings-section">
          <div className="card-section-title">📊 Commission Split Rule</div>
          <div className="settings-grid">
            <Field label="HYSA %" prefix="%" value={local.commissionHYSAPct}
              onChange={v => set('commissionHYSAPct', v)} />
            <Field label="Personal %" prefix="%" value={local.commissionPersonalPct}
              onChange={v => set('commissionPersonalPct', v)} />
          </div>
        </div>

        {/* Early Budget */}
        <div className="card settings-section">
          <div className="card-section-title">
            🏠 Months 1–3 Budget (Rent-Free)
            <span style={{ marginLeft: 12, fontWeight: 700, color: earlyRemaining >= 0 ? 'var(--green)' : 'var(--red)', textTransform: 'none', fontSize: '0.85rem' }}>
              {fmt(earlyRemaining)} remaining
            </span>
          </div>
          <div className="settings-grid">
            <Field label="Utilities + Fee" value={eb.utilities}
              onChange={v => setBudget('earlyBudget', 'utilities', v)} />
            <Field label="Roth IRA" value={eb.rothIRA}
              onChange={v => setBudget('earlyBudget', 'rothIRA', v)} />
            <Field label="HYSA" value={eb.hysa}
              onChange={v => setBudget('earlyBudget', 'hysa', v)} />
            <Field label="Groceries" value={eb.groceries}
              onChange={v => setBudget('earlyBudget', 'groceries', v)} />
            <Field label="Gas" value={eb.gas}
              onChange={v => setBudget('earlyBudget', 'gas', v)} />
            <Field label="Fun / Travel" value={eb.funTravel}
              onChange={v => setBudget('earlyBudget', 'funTravel', v)} />
            <Field label="Out to Eat" value={eb.outToEat}
              onChange={v => setBudget('earlyBudget', 'outToEat', v)} />
            <Field label="Shopping / Misc" value={eb.shopping}
              onChange={v => setBudget('earlyBudget', 'shopping', v)} />
          </div>
        </div>

        {/* Later Budget */}
        <div className="card settings-section">
          <div className="card-section-title">
            🏙️ Months 4–12 Budget (With Rent)
            <span style={{ marginLeft: 12, fontWeight: 700, color: laterRemaining >= 0 ? 'var(--green)' : 'var(--red)', textTransform: 'none', fontSize: '0.85rem' }}>
              {fmt(laterRemaining)} remaining
            </span>
          </div>
          <div className="settings-grid">
            <Field label="Rent + Fee" value={lb.rent}
              onChange={v => setBudget('laterBudget', 'rent', v)} />
            <Field label="Utilities" value={lb.utilities}
              onChange={v => setBudget('laterBudget', 'utilities', v)} />
            <Field label="Roth IRA" value={lb.rothIRA}
              onChange={v => setBudget('laterBudget', 'rothIRA', v)} />
            <Field label="HYSA" value={lb.hysa}
              onChange={v => setBudget('laterBudget', 'hysa', v)} />
            <Field label="Groceries" value={lb.groceries}
              onChange={v => setBudget('laterBudget', 'groceries', v)} />
            <Field label="Gas" value={lb.gas}
              onChange={v => setBudget('laterBudget', 'gas', v)} />
            <Field label="Fun / Travel" value={lb.funTravel}
              onChange={v => setBudget('laterBudget', 'funTravel', v)} />
            <Field label="Out to Eat" value={lb.outToEat}
              onChange={v => setBudget('laterBudget', 'outToEat', v)} />
            <Field label="Shopping / Misc" value={lb.shopping}
              onChange={v => setBudget('laterBudget', 'shopping', v)} />
          </div>
        </div>

        {/* Goals */}
        <div className="card settings-section">
          <div className="card-section-title">🎯 Goals & IRS Limits</div>
          <div className="settings-grid">
            <Field label="HYSA Goal" value={local.hysaGoal}
              onChange={v => set('hysaGoal', v)} />
            <Field label="Roth IRA Yearly Limit" value={local.rothIRAYearlyLimit}
              onChange={v => set('rothIRAYearlyLimit', v)} />
            <Field label="401(k) IRS Yearly Max" value={local.ira401kYearlyMax}
              onChange={v => set('ira401kYearlyMax', v)} />
            <Field label="Employer Match %" prefix="%" value={local.employerMatchPct}
              onChange={v => set('employerMatchPct', v)} />
          </div>
        </div>

        <button type="submit" className="btn-primary btn-full">Save All Settings</button>
      </form>
    </div>
  )
}
