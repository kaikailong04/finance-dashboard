import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import SpendingTracker from './components/SpendingTracker'
import Goals from './components/Goals'
import CommissionTracker from './components/CommissionTracker'
import Settings from './components/Settings'

export const DEFAULT_SETTINGS = {
  grossMonthly: 6667,
  federalTax: 1461,
  contribution401k: 300,
  takeHome: 3755,
  startDate: '2025-07-01',
  commissionHYSAPct: 60,
  commissionPersonalPct: 40,
  earlyBudget: {
    utilities: 100,
    rothIRA: 583,
    hysa: 1800,
    groceries: 400,
    gas: 150,
    funTravel: 250,
    outToEat: 250,
    shopping: 150,
  },
  laterBudget: {
    rent: 1342,
    utilities: 50,
    rothIRA: 583,
    hysa: 500,
    groceries: 400,
    gas: 150,
    funTravel: 250,
    outToEat: 250,
    shopping: 150,
  },
  hysaGoal: 11000,
  rothIRAYearlyLimit: 7000,
  ira401kYearlyMax: 23500,
  employerMatchPct: 6,
}

const DEFAULT_GOALS = {
  hysaBalance: 0,
  ira401kBalance: 0,
  rothIRAOverride: null,
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    // Deep-merge objects so new default keys are always present
    if (typeof fallback === 'object' && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed }
    }
    return parsed
  } catch {
    return fallback
  }
}

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',   icon: '📊' },
  { id: 'spending',   label: 'Spending',     icon: '💳' },
  { id: 'goals',      label: 'Goals',        icon: '🎯' },
  { id: 'commission', label: 'Commission',   icon: '💰' },
  { id: 'settings',   label: 'Settings',     icon: '⚙️' },
]

export default function App() {
  const [activeTab, setActiveTab]     = useState('dashboard')
  const [settings, setSettings]       = useState(() => load('fd_settings', DEFAULT_SETTINGS))
  const [transactions, setTransactions] = useState(() => load('fd_transactions', []))
  const [goals, setGoals]             = useState(() => load('fd_goals', DEFAULT_GOALS))
  const [commissions, setCommissions] = useState(() => load('fd_commissions', []))

  useEffect(() => { localStorage.setItem('fd_settings', JSON.stringify(settings)) }, [settings])
  useEffect(() => { localStorage.setItem('fd_transactions', JSON.stringify(transactions)) }, [transactions])
  useEffect(() => { localStorage.setItem('fd_goals', JSON.stringify(goals)) }, [goals])
  useEffect(() => { localStorage.setItem('fd_commissions', JSON.stringify(commissions)) }, [commissions])

  const shared = { settings, transactions, setTransactions, goals, setGoals, commissions, setCommissions }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':  return <Dashboard {...shared} />
      case 'spending':   return <SpendingTracker {...shared} />
      case 'goals':      return <Goals {...shared} />
      case 'commission': return <CommissionTracker {...shared} />
      case 'settings':   return <Settings settings={settings} setSettings={setSettings} />
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">💼 Finance Dashboard</h1>
          <nav className="desktop-nav">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`nav-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main-content">
        {renderTab()}
      </main>

      <nav className="mobile-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`mobile-nav-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="mobile-nav-icon">{t.icon}</span>
            <span className="mobile-nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
