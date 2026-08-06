// Unit tests for calc.js (Phase 1 shared calculation engine).
// Run with: node --test test/calc.test.js
// Zero dependencies — Node's built-in test runner + assert, matching the
// rest of this project's "no build step" philosophy.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../calc.js');

// ── Fixtures ──────────────────────────────────────────────────────────
const checkingAcct = { id: 'acc_checking', type: 'checking' };
const creditAcct    = { id: 'acc_credit',   type: 'credit' };
const hysaAcct       = { id: 'acc_hysa',     type: 'hysa' };
const accounts = [checkingAcct, creditAcct, hysaAcct];

const MONTH = '2026-08';
const d = (day) => `${MONTH}-${String(day).padStart(2, '0')}`;

test('classifyTransaction: plain checking expense → expense', () => {
  const tx = { type: 'expense', date: d(1), amount: 50, category: 'dining', accountId: 'acc_checking' };
  assert.equal(calc.classifyTransaction(tx, calc.accountsById(accounts)), 'expense');
});

test('classifyTransaction: category hysa → savingsContribution, never counted as spending', () => {
  const tx = { type: 'expense', date: d(1), amount: 500, category: 'hysa', accountId: 'acc_checking' };
  const byId = calc.accountsById(accounts);
  assert.equal(calc.classifyTransaction(tx, byId), 'savingsContribution');
  assert.equal(calc.isRealExpense(tx, byId), false);
});

test('classifyTransaction: category rothIRA → investmentContribution, never counted as spending', () => {
  const tx = { type: 'expense', date: d(1), amount: 625, category: 'rothIRA', accountId: 'acc_checking' };
  const byId = calc.accountsById(accounts);
  assert.equal(calc.classifyTransaction(tx, byId), 'investmentContribution');
  assert.equal(calc.isRealExpense(tx, byId), false);
});

test('classifyTransaction: expense on a credit-type account → creditCardPurchase', () => {
  const tx = { type: 'expense', date: d(1), amount: 42, category: 'shopping', accountId: 'acc_credit' };
  assert.equal(calc.classifyTransaction(tx, calc.accountsById(accounts)), 'creditCardPurchase');
});

test('classifyTransaction: transfer into a credit account → creditCardPayment, not a plain transfer', () => {
  const tx = { type: 'transfer', date: d(1), amount: 300, accountId: 'acc_checking', toAccountId: 'acc_credit' };
  assert.equal(calc.classifyTransaction(tx, calc.accountsById(accounts)), 'creditCardPayment');
});

test('classifyTransaction: transfer between two non-credit accounts → transfer', () => {
  const tx = { type: 'transfer', date: d(1), amount: 300, accountId: 'acc_checking', toAccountId: 'acc_hysa' };
  assert.equal(calc.classifyTransaction(tx, calc.accountsById(accounts)), 'transfer');
});

test('classifyTransaction: income → income', () => {
  const tx = { type: 'income', date: d(1), amount: 1713, category: 'income', accountId: 'acc_checking' };
  assert.equal(calc.classifyTransaction(tx, calc.accountsById(accounts)), 'income');
});

test('classifyTransaction: keyword-matched refund → refund', () => {
  const tx = { type: 'expense', date: d(1), amount: 20, description: 'Amazon refund', accountId: 'acc_checking' };
  assert.equal(calc.classifyTransaction(tx, calc.accountsById(accounts)), 'refund');
});

test('classifyTransaction: explicit kind is never overwritten by the heuristic', () => {
  const tx = { type: 'expense', date: d(1), amount: 20, category: 'hysa', kind: 'fee', accountId: 'acc_checking' };
  assert.equal(calc.classifyTransaction(tx, calc.accountsById(accounts)), 'fee');
});

test('calcExpensesThisMonth: excludes savings, investing, transfers, and credit-card payments', () => {
  const transactions = [
    { type: 'expense', date: d(1),  amount: 100, category: 'dining',    accountId: 'acc_checking' },
    { type: 'expense', date: d(2),  amount: 1800, category: 'hysa',     accountId: 'acc_checking' },   // savings
    { type: 'expense', date: d(3),  amount: 625,  category: 'rothIRA',  accountId: 'acc_checking' },   // investing
    { type: 'transfer', date: d(4), amount: 300,  accountId: 'acc_checking', toAccountId: 'acc_credit' }, // cc payment
    { type: 'transfer', date: d(5), amount: 50,   accountId: 'acc_checking', toAccountId: 'acc_hysa' },   // plain transfer
    { type: 'expense', date: d(6),  amount: 60,   category: 'shopping', accountId: 'acc_credit' },     // real cc purchase
  ];
  assert.equal(calc.calcExpensesThisMonth(transactions, MONTH, accounts), 160); // 100 + 60
});

test('calcExpensesThisMonth: a refund nets OUT of spending, never below zero', () => {
  const transactions = [
    { type: 'expense', date: d(1), amount: 50, category: 'dining', accountId: 'acc_checking' },
    { type: 'expense', date: d(2), amount: 20, description: 'refund from restaurant', accountId: 'acc_checking' },
  ];
  assert.equal(calc.calcExpensesThisMonth(transactions, MONTH, accounts), 30);
});

test('calcExpensesThisMonth: ignores transactions outside the requested month', () => {
  const transactions = [
    { type: 'expense', date: '2026-07-31', amount: 999, category: 'dining', accountId: 'acc_checking' },
    { type: 'expense', date: d(1), amount: 40, category: 'dining', accountId: 'acc_checking' },
  ];
  assert.equal(calc.calcExpensesThisMonth(transactions, MONTH, accounts), 40);
});

test('calcSavedThisMonth / calcInvestedThisMonth: correctly separated, never mixed', () => {
  const transactions = [
    { type: 'expense', date: d(1), amount: 1800, category: 'hysa',    accountId: 'acc_checking' },
    { type: 'expense', date: d(2), amount: 625,  category: 'rothIRA', accountId: 'acc_checking' },
    { type: 'expense', date: d(3), amount: 100,  category: 'dining',  accountId: 'acc_checking' },
  ];
  assert.equal(calc.calcSavedThisMonth(transactions, MONTH, accounts), 1800);
  assert.equal(calc.calcInvestedThisMonth(transactions, MONTH, accounts), 625);
});

test('calcPurchaseCount: excludes transfers, savings, investing, and credit-card payments', () => {
  const transactions = [
    { type: 'expense', date: d(1),  amount: 10, category: 'dining',   accountId: 'acc_checking' },
    { type: 'expense', date: d(2),  amount: 20, category: 'groceries',accountId: 'acc_checking' },
    { type: 'expense', date: d(3),  amount: 1800, category: 'hysa',   accountId: 'acc_checking' },
    { type: 'transfer', date: d(4), amount: 300, accountId: 'acc_checking', toAccountId: 'acc_credit' },
    { type: 'income',  date: d(5),  amount: 1713, accountId: 'acc_checking' },
  ];
  assert.equal(calc.calcPurchaseCount(transactions, MONTH, accounts), 2);
});

test('calcSavingsRateActual: realized rate from actual income minus actual spending', () => {
  const transactions = [
    { type: 'income',  date: d(1), amount: 3426, accountId: 'acc_checking' },
    { type: 'expense', date: d(2), amount: 882,  category: 'dining', accountId: 'acc_checking' },
    { type: 'expense', date: d(3), amount: 1800, category: 'hysa',   accountId: 'acc_checking' }, // not spending
  ];
  // (3426 - 882) / 3426 = 74.26%
  assert.equal(calc.calcSavingsRateActual(transactions, MONTH, accounts), 74.26);
});

test('calcSavingsRateActual: zero income → 0, never divides by zero', () => {
  assert.equal(calc.calcSavingsRateActual([], MONTH, accounts), 0);
});

test('calcBudgetRemaining: budget minus expenses, can go negative when over budget', () => {
  assert.equal(calc.calcBudgetRemaining(882, 1300), 418);
  assert.equal(calc.calcBudgetRemaining(1500, 1300), -200);
});

test('migrateTransactionKinds: backfills kind on legacy rows, reports changed:true', () => {
  const legacy = [
    { type: 'expense', date: d(1), amount: 1800, category: 'hysa', accountId: 'acc_checking' },
    { type: 'expense', date: d(2), amount: 40,   category: 'dining', accountId: 'acc_checking' },
  ];
  const { transactions: migrated, changed } = calc.migrateTransactionKinds(legacy, accounts);
  assert.equal(changed, true);
  assert.equal(migrated[0].kind, 'savingsContribution');
  assert.equal(migrated[1].kind, 'expense');
});

test('migrateTransactionKinds: idempotent — a second pass reports changed:false and leaves kinds untouched', () => {
  const legacy = [{ type: 'expense', date: d(1), amount: 1800, category: 'hysa', accountId: 'acc_checking' }];
  const first  = calc.migrateTransactionKinds(legacy, accounts);
  const second = calc.migrateTransactionKinds(first.transactions, accounts);
  assert.equal(second.changed, false);
  assert.deepEqual(second.transactions, first.transactions);
});

test('migrateTransactionKinds: never mutates the input array or its rows in place', () => {
  const legacy = [{ type: 'expense', date: d(1), amount: 1800, category: 'hysa', accountId: 'acc_checking' }];
  const before = JSON.stringify(legacy);
  calc.migrateTransactionKinds(legacy, accounts);
  assert.equal(JSON.stringify(legacy), before);
});
