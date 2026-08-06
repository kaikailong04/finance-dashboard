// ══════════════════════════════════════════════════════════════════════
// calc.js — Shared Financial Calculation Engine (Phase 1)
//
// Pure functions only: no DOM, no React, no localStorage. This exists so
// every screen in index.html can call ONE shared implementation of
// "expenses this month" / "saved this month" / "savings rate" / etc.
// instead of each independently re-deriving its own totals from raw
// transactions — an audit of this app found "spent this month" alone
// reimplemented six different ways across Dashboard/Spending/Insights/
// Monthly Review/Year in Review, and "savings rate" computed with two
// genuinely different definitions (a planned/budgeted rate vs. a realized
// rate from actual transactions) depending on which screen you looked at.
//
// Deliberately self-contained (a local safeNum/round2/refund-keyword list
// rather than reaching into index.html's globals) so this file is
// independently unit-testable via `node --test test/calc.test.js` with
// zero dependencies, and loads in the browser as a plain <script> before
// the app's own Babel-compiled script.
//
// IMPORTANT — additive, not a replacement: the existing transaction
// `type` field ('income' | 'expense' | 'transfer') is what
// applyTransactionToAccounts() in index.html reads to move money between
// accounts, and it keeps doing exactly that. `kind` (the richer 9-value
// taxonomy below) is new, purely descriptive metadata layered on top —
// classifying a transaction's `kind` never changes what `type` it has or
// how balances move.
// ══════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';

  const safeNum = n => (typeof n === 'number' && isFinite(n)) ? n : 0;
  const round2  = n => Math.round(((+n || 0) + Number.EPSILON) * 100) / 100;

  // The 9-value classification the Phase 1 audit's PRD asked for.
  const TX_KINDS = [
    'income',
    'expense',
    'transfer',
    'savingsContribution',
    'investmentContribution',
    'creditCardPurchase',
    'creditCardPayment',
    'refund',
    'fee',
  ];

  // Same heuristic index.html's own isRefund() already used (keyword match
  // over description/merchant/notes, or an explicit flag) — reused here
  // rather than reinvented, so classification agrees with the existing
  // refund-pill UI on the Spending calendar day-drilldown.
  const REFUND_KEYWORDS = ['refund', 'return', 'reversal', 'credit adjustment', 'chargeback', 'reimburse'];
  function looksLikeRefund(tx) {
    if (!tx) return false;
    if (tx.refund === true || tx.isRefund === true) return true;
    if (tx.type !== 'expense') return false;
    const hay = ((tx.description || '') + ' ' + (tx.merchant || '') + ' ' + (tx.notes || '')).toLowerCase();
    return REFUND_KEYWORDS.some(k => hay.includes(k));
  }

  function accountsById(accounts) {
    const m = {};
    for (const a of (accounts || [])) m[a.id] = a;
    return m;
  }

  // Classifies a transaction into the richer `kind` taxonomy from its
  // existing `type` + category + (optional) account context. Idempotent —
  // if a transaction already carries a valid `kind` (set at creation time,
  // or previously migrated), that's returned as-is rather than
  // recalculated, so a user's own explicit classification is never
  // silently overwritten by a heuristic guess on a later render.
  function classifyTransaction(tx, byId) {
    if (!tx) return null;
    if (tx.kind && TX_KINDS.indexOf(tx.kind) !== -1) return tx.kind;
    byId = byId || {};
    if (tx.type === 'transfer') {
      const to = byId[tx.toAccountId];
      if (to && to.type === 'credit') return 'creditCardPayment';
      return 'transfer';
    }
    if (tx.type === 'income') return 'income';
    // type === 'expense' from here down.
    if (looksLikeRefund(tx)) return 'refund';
    if (tx.category === 'hysa') return 'savingsContribution';
    if (tx.category === 'rothIRA') return 'investmentContribution';
    const acct = byId[tx.accountId];
    if (acct && acct.type === 'credit') return 'creditCardPurchase';
    return 'expense';
  }

  // "Real spending" — the single definition every screen should share
  // instead of each writing its own filter. Transfers, savings/investment
  // contributions, credit-card payments, and refunds are never spending.
  function isRealExpense(tx, byId) {
    const kind = classifyTransaction(tx, byId);
    return kind === 'expense' || kind === 'creditCardPurchase' || kind === 'fee';
  }
  function isSavingsContribution(tx, byId) { return classifyTransaction(tx, byId) === 'savingsContribution'; }
  function isInvestmentContribution(tx, byId) { return classifyTransaction(tx, byId) === 'investmentContribution'; }
  // "Purchase count" per the audit: real spending only — transfers,
  // savings/investment contributions, and credit-card payments excluded.
  function isPurchase(tx, byId) { return isRealExpense(tx, byId); }

  function monthKeyOf(dateStr) { return (dateStr || '').slice(0, 7); }

  function calcExpensesThisMonth(transactions, monthKey, accounts) {
    const byId = accountsById(accounts);
    let total = 0;
    for (const t of (transactions || [])) {
      if (monthKeyOf(t.date) !== monthKey) continue;
      const kind = classifyTransaction(t, byId);
      if (kind === 'expense' || kind === 'creditCardPurchase' || kind === 'fee') total += safeNum(t.amount);
      else if (kind === 'refund') total -= safeNum(t.amount);
    }
    return round2(Math.max(total, 0));
  }

  function calcSavedThisMonth(transactions, monthKey, accounts) {
    const byId = accountsById(accounts);
    let total = 0;
    for (const t of (transactions || [])) {
      if (monthKeyOf(t.date) !== monthKey) continue;
      if (classifyTransaction(t, byId) === 'savingsContribution') total += safeNum(t.amount);
    }
    return round2(total);
  }

  function calcInvestedThisMonth(transactions, monthKey, accounts) {
    const byId = accountsById(accounts);
    let total = 0;
    for (const t of (transactions || [])) {
      if (monthKeyOf(t.date) !== monthKey) continue;
      if (classifyTransaction(t, byId) === 'investmentContribution') total += safeNum(t.amount);
    }
    return round2(total);
  }

  function calcPurchaseCount(transactions, monthKey, accounts) {
    const byId = accountsById(accounts);
    let n = 0;
    for (const t of (transactions || [])) {
      if (monthKeyOf(t.date) !== monthKey) continue;
      if (isPurchase(t, byId)) n++;
    }
    return n;
  }

  // Realized savings rate: (income − real spending) ÷ income, from ACTUAL
  // logged transactions this month. Deliberately distinct from a "planned
  // contribution ÷ take-home" rate some screens compute straight from a
  // Settings budget scenario — that's a forward-looking plan number, this
  // is what actually happened. Phase 2 decides which screens show which;
  // Phase 1 just gives both a single, named, shared implementation instead
  // of four independent reimplementations of one of them.
  function calcSavingsRateActual(transactions, monthKey, accounts) {
    const byId = accountsById(accounts);
    let income = 0, expenses = 0;
    for (const t of (transactions || [])) {
      if (monthKeyOf(t.date) !== monthKey) continue;
      const kind = classifyTransaction(t, byId);
      if (kind === 'income') income += safeNum(t.amount);
      else if (kind === 'expense' || kind === 'creditCardPurchase' || kind === 'fee') expenses += safeNum(t.amount);
      else if (kind === 'refund') expenses -= safeNum(t.amount);
    }
    if (income <= 0) return 0;
    return round2(((income - expenses) / income) * 100);
  }

  function calcBudgetRemaining(expensesThisMonth, totalBudget) {
    return round2(safeNum(totalBudget) - safeNum(expensesThisMonth));
  }

  // One-time migration: backfills `kind` on every transaction that
  // doesn't already carry a valid one. Idempotent and safe to run on
  // every load — rows that already have a `kind` are left untouched, so
  // re-running it costs one classifyTransaction() call per row (a cheap,
  // pure computation) and never re-derives or overwrites a value that
  // was already set, whether by an earlier run of this same migration or
  // by a user action.
  function migrateTransactionKinds(transactions, accounts) {
    const byId = accountsById(accounts);
    let changed = false;
    const next = (transactions || []).map(t => {
      if (t.kind && TX_KINDS.indexOf(t.kind) !== -1) return t;
      changed = true;
      return Object.assign({}, t, { kind: classifyTransaction(t, byId) });
    });
    return { transactions: next, changed };
  }

  const api = {
    TX_KINDS,
    classifyTransaction,
    isRealExpense,
    isSavingsContribution,
    isInvestmentContribution,
    isPurchase,
    calcExpensesThisMonth,
    calcSavedThisMonth,
    calcInvestedThisMonth,
    calcPurchaseCount,
    calcSavingsRateActual,
    calcBudgetRemaining,
    migrateTransactionKinds,
    monthKeyOf,
    accountsById,
    looksLikeRefund,
    safeNum,
    round2,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api; // Node (tests)
  else root.FinCalc = api; // browser global, consumed by index.html
})(typeof window !== 'undefined' ? window : globalThis);
