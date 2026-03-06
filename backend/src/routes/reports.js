'use strict';

const express = require('express');
const { getDb } = require('../db');
const { computeAgeOfMoney, getPrevMonth } = require('./budgets');

const router = express.Router();

/**
 * GET /api/reports/spending-by-category?start=YYYY-MM&end=YYYY-MM
 * Returns total spending per category for a date range.
 */
router.get('/spending-by-category', (req, res, next) => {
  try {
    const db = getDb();
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end query params are required (YYYY-MM)' });
    }

    if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) {
      return res.status(400).json({ error: 'start and end must be in YYYY-MM format' });
    }

    // First day of start month, last day of end month
    const startDate = `${start}-01`;
    const endDate = `${end}-31`;

    const data = db.prepare(`
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        cg.name AS group_name,
        COALESCE(SUM(t.amount), 0) AS total
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      JOIN categories c ON c.id = t.category_id
      JOIN category_groups cg ON cg.id = c.category_group_id
      WHERE t.date >= ?
        AND t.date <= ?
        AND a.on_budget = 1
        AND t.amount < 0
        AND t.transfer_transaction_id IS NULL
        AND t.is_income = 0
      GROUP BY c.id
      ORDER BY total ASC
    `).all(startDate, endDate);

    res.json({ start, end, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/income-vs-expense?months=12
 * Returns monthly income vs expense totals for the past N months.
 */
router.get('/income-vs-expense', (req, res, next) => {
  try {
    const db = getDb();
    const months = Math.min(60, Math.max(1, parseInt(req.query.months) || 12));

    // Build list of N months ending with the current month
    const monthList = buildMonthList(months);

    const data = monthList.map(month => {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      const income = db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) AS total
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        WHERE t.date >= ? AND t.date <= ?
          AND a.on_budget = 1
          AND t.is_income = 1
      `).get(startDate, endDate);

      const expense = db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) AS total
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        WHERE t.date >= ? AND t.date <= ?
          AND a.on_budget = 1
          AND t.amount < 0
          AND t.is_income = 0
          AND t.transfer_transaction_id IS NULL
      `).get(startDate, endDate);

      return {
        month,
        income: income.total,
        expense: expense.total,
      };
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/net-worth?months=12
 * Returns monthly net worth snapshots for the past N months.
 * Net worth = sum of all on-budget account balances as of end of each month.
 */
router.get('/net-worth', (req, res, next) => {
  try {
    const db = getDb();
    const months = Math.min(60, Math.max(1, parseInt(req.query.months) || 12));

    const monthList = buildMonthList(months);

    const accounts = db.prepare(
      "SELECT id, type FROM accounts WHERE closed = 0"
    ).all();

    const data = monthList.map(month => {
      const endDate = `${month}-31`;

      let assets = 0;
      let liabilities = 0;

      for (const account of accounts) {
        const balance = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) AS bal
          FROM transactions
          WHERE account_id = ? AND date <= ?
        `).get(account.id, endDate);

        const bal = balance.bal;
        if (account.type === 'credit_card') {
          liabilities += bal; // CC balances are typically negative (debt)
        } else {
          assets += bal;
        }
      }

      return {
        month,
        assets,
        liabilities,
        net_worth: assets + liabilities,
      };
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/age-of-money
 * Returns the current Age of Money metric and a 6-month trend.
 */
router.get('/age-of-money', (req, res, next) => {
  try {
    const db = getDb();

    const current = computeAgeOfMoney(db);

    // Build 6-month trend by computing AoM as of the end of each of the past 6 months
    const monthList = buildMonthList(6);
    const trend = monthList.map(month => {
      const endDate = `${month}-31`;

      // Compute AoM using only transactions up to the end of this month
      const aom = computeAgeOfMoneyAsOf(db, endDate);
      return { month, days: aom };
    });

    res.json({ current, trend });
  } catch (err) {
    next(err);
  }
});

/**
 * Computes Age of Money using only transactions on or before a given date.
 */
function computeAgeOfMoneyAsOf(db, endDate) {
  const spendingTxns = db.prepare(`
    SELECT t.id, t.date, t.amount
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE t.amount < 0
      AND t.is_income = 0
      AND t.transfer_transaction_id IS NULL
      AND a.on_budget = 1
      AND a.type != 'credit_card'
      AND t.date <= ?
    ORDER BY t.date DESC, t.id DESC
    LIMIT 10
  `).all(endDate);

  if (spendingTxns.length === 0) return 0;

  const incomeTxns = db.prepare(`
    SELECT t.id, t.date, t.amount
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE t.is_income = 1
      AND a.on_budget = 1
      AND t.date <= ?
    ORDER BY t.date ASC, t.id ASC
  `).all(endDate);

  if (incomeTxns.length === 0) return 0;

  let totalDays = 0;
  let matched = 0;
  let queueIdx = 0;
  let remainingInQueue = incomeTxns.length > 0 ? incomeTxns[0].amount : 0;

  for (const spendTx of spendingTxns) {
    const spendAmount = Math.abs(spendTx.amount);
    const spendDate = new Date(spendTx.date);

    let tempIdx = queueIdx;
    let tempRemaining = remainingInQueue;
    let weightedDays = 0;
    let remaining = spendAmount;

    while (remaining > 0 && tempIdx < incomeTxns.length) {
      const incomeEntry = incomeTxns[tempIdx];
      const incomeDate = new Date(incomeEntry.date);
      const daysOld = Math.max(0, Math.floor((spendDate - incomeDate) / 86400000));

      const consumed = Math.min(remaining, tempRemaining);
      weightedDays += consumed * daysOld;
      remaining -= consumed;
      tempRemaining -= consumed;

      if (tempRemaining <= 0) {
        tempIdx++;
        tempRemaining = tempIdx < incomeTxns.length ? incomeTxns[tempIdx].amount : 0;
      }
    }

    if (spendAmount > 0) {
      totalDays += weightedDays / spendAmount;
      matched++;
    }

    let toConsume = spendAmount;
    while (toConsume > 0 && queueIdx < incomeTxns.length) {
      const consumed = Math.min(toConsume, remainingInQueue);
      toConsume -= consumed;
      remainingInQueue -= consumed;
      if (remainingInQueue <= 0) {
        queueIdx++;
        remainingInQueue = queueIdx < incomeTxns.length ? incomeTxns[queueIdx].amount : 0;
      }
    }
  }

  if (matched === 0) return 0;
  return Math.round(totalDays / matched);
}

/**
 * Builds an array of YYYY-MM month strings ending at the current month.
 */
function buildMonthList(count) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const months = [];
  let month = currentMonth;
  for (let i = 0; i < count; i++) {
    months.unshift(month);
    month = getPrevMonth(month);
  }
  return months;
}

module.exports = router;
