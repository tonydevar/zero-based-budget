'use strict';

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/**
 * Computes the "Ready to Assign" value for a given month.
 *
 * Ready to Assign (month M) =
 *   Total income received in M
 *   + Unassigned carried from M-1 (prior month's ready-to-assign)
 *   - Sum of all assigned amounts in M
 *   - Overspending deductions from M-1 cash (non-CC) categories
 */
function computeReadyToAssign(db, month) {
  // Total income this month (is_income = 1, positive inflows to on-budget accounts)
  const incomeResult = db.prepare(`
    SELECT COALESCE(SUM(t.amount), 0) AS total
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE substr(t.date, 1, 7) = ?
      AND t.is_income = 1
      AND a.on_budget = 1
  `).get(month);
  const incomeThisMonth = incomeResult.total;

  // Total assigned this month across all categories
  const assignedResult = db.prepare(`
    SELECT COALESCE(SUM(assigned), 0) AS total
    FROM monthly_budgets
    WHERE month = ?
  `).get(month);
  const assignedThisMonth = assignedResult.total;

  // Prior month overspending deductions from non-CC (cash) categories
  const prevMonth = getPrevMonth(month);
  const overspendingResult = db.prepare(`
    SELECT COALESCE(SUM(avail), 0) AS total
    FROM (
      SELECT
        c.id,
        COALESCE(mb.assigned, 0) +
        COALESCE((
          SELECT SUM(t2.amount)
          FROM transactions t2
          JOIN accounts a2 ON a2.id = t2.account_id
          WHERE t2.category_id = c.id
            AND substr(t2.date, 1, 7) = ?
            AND a2.on_budget = 1
            AND t2.transfer_transaction_id IS NULL
        ), 0) AS avail
      FROM categories c
      JOIN category_groups cg ON cg.id = c.category_group_id
      LEFT JOIN monthly_budgets mb ON mb.category_id = c.id AND mb.month = ?
      WHERE c.is_system = 0
        AND cg.is_system = 0
    )
    WHERE avail < 0
  `).get(prevMonth, prevMonth);
  const prevMonthOverspending = overspendingResult.total; // already negative

  // Prior month's unassigned carry (recursive — simplified: income - assigned for prev month)
  // We use a simpler approach: Ready to Assign is computed directly from all-time history
  // by summing: all income to date (for on-budget accounts) minus all assigned to date
  // This naturally handles carry-forward without recursion.
  const allTimeIncome = db.prepare(`
    SELECT COALESCE(SUM(t.amount), 0) AS total
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE t.is_income = 1
      AND a.on_budget = 1
      AND substr(t.date, 1, 7) <= ?
  `).get(month);

  const allTimeAssigned = db.prepare(`
    SELECT COALESCE(SUM(assigned), 0) AS total
    FROM monthly_budgets
    WHERE month <= ?
  `).get(month);

  // Overspending from prior months (all cash categories) up to prevMonth
  const allPriorOverspending = computeAllPriorOverspendingDeductions(db, month);

  const readyToAssign = allTimeIncome.total - allTimeAssigned.total - allPriorOverspending;
  return readyToAssign;
}

/**
 * Computes sum of all cash-category overspending from months prior to the given month.
 * This amount is deducted from Ready to Assign in the current month.
 */
function computeAllPriorOverspendingDeductions(db, throughMonth) {
  // Get all months with transactions prior to throughMonth
  const months = db.prepare(`
    SELECT DISTINCT substr(date, 1, 7) AS month
    FROM transactions
    WHERE substr(date, 1, 7) < ?
    ORDER BY month
  `).all(throughMonth);

  let totalDeduction = 0;

  for (const { month } of months) {
    // For each cash (non-system) category, compute available for that month
    // available = (prior available) + assigned + activity
    // Overspending = min(available, 0) * -1 (deduction amount)
    const categories = db.prepare(`
      SELECT c.id
      FROM categories c
      JOIN category_groups cg ON cg.id = c.category_group_id
      WHERE c.is_system = 0 AND cg.is_system = 0
    `).all();

    for (const cat of categories) {
      const assigned = db.prepare(
        'SELECT COALESCE(assigned, 0) AS a FROM monthly_budgets WHERE category_id = ? AND month = ?'
      ).get(cat.id, month);

      const activity = db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) AS a
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        WHERE t.category_id = ?
          AND substr(t.date, 1, 7) = ?
          AND a.on_budget = 1
          AND t.transfer_transaction_id IS NULL
      `).get(cat.id, month);

      const available = (assigned ? assigned.a : 0) + (activity ? activity.a : 0);
      if (available < 0) {
        totalDeduction += Math.abs(available);
      }
    }
  }

  return totalDeduction;
}

/**
 * Computes available balance for a category in a given month.
 * Available(C, M) = Available(C, M-1) + Assigned(C, M) + Activity(C, M)
 * Cash category overspending from M-1 is zeroed (not carried, it deducts from RTA instead).
 */
function computeAvailable(db, categoryId, month, isCashCategory) {
  // Activity this month
  const activity = db.prepare(`
    SELECT COALESCE(SUM(t.amount), 0) AS a
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE t.category_id = ?
      AND substr(t.date, 1, 7) = ?
      AND a.on_budget = 1
      AND t.transfer_transaction_id IS NULL
  `).get(categoryId, month);

  // Assigned this month
  const assigned = db.prepare(
    'SELECT COALESCE(assigned, 0) AS a FROM monthly_budgets WHERE category_id = ? AND month = ?'
  ).get(categoryId, month);

  // Prior month available (recursive)
  const prevMonth = getPrevMonth(month);
  const prevAvailable = computeAvailableForMonth(db, categoryId, prevMonth, isCashCategory, 12);

  // For cash categories: if prior available was negative, carry 0 (deducted from RTA instead)
  const carriedFromPrev = isCashCategory ? Math.max(prevAvailable, 0) : prevAvailable;

  return carriedFromPrev + (assigned ? assigned.a : 0) + (activity ? activity.a : 0);
}

function computeAvailableForMonth(db, categoryId, month, isCashCategory, depth) {
  if (depth <= 0) return 0;

  // Check if there's any data at all before this month
  const hasData = db.prepare(`
    SELECT COUNT(*) as cnt FROM transactions t
    WHERE t.category_id = ? AND substr(t.date, 1, 7) <= ?
  `).get(categoryId, month);

  const hasAssigned = db.prepare(
    'SELECT COUNT(*) as cnt FROM monthly_budgets WHERE category_id = ? AND month <= ?'
  ).get(categoryId, month);

  if (hasData.cnt === 0 && hasAssigned.cnt === 0) return 0;

  const activity = db.prepare(`
    SELECT COALESCE(SUM(t.amount), 0) AS a
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE t.category_id = ?
      AND substr(t.date, 1, 7) = ?
      AND a.on_budget = 1
      AND t.transfer_transaction_id IS NULL
  `).get(categoryId, month);

  const assigned = db.prepare(
    'SELECT COALESCE(assigned, 0) AS a FROM monthly_budgets WHERE category_id = ? AND month = ?'
  ).get(categoryId, month);

  const prevMonth = getPrevMonth(month);
  const prevAvailable = computeAvailableForMonth(db, categoryId, prevMonth, isCashCategory, depth - 1);
  const carriedFromPrev = isCashCategory ? Math.max(prevAvailable, 0) : prevAvailable;

  return carriedFromPrev + (assigned ? assigned.a : 0) + (activity ? activity.a : 0);
}

function getPrevMonth(month) {
  const [year, m] = month.split('-').map(Number);
  if (m === 1) return `${year - 1}-12`;
  return `${year}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * GET /api/budget/:month
 * Returns the full budget for a month including ready-to-assign and all category balances.
 */
router.get('/:month', (req, res, next) => {
  try {
    const db = getDb();
    const { month } = req.params;

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be in YYYY-MM format' });
    }

    const groups = db.prepare(`
      SELECT id, name, sort_order, is_system
      FROM category_groups
      ORDER BY sort_order, id
    `).all();

    const categories = db.prepare(`
      SELECT c.id, c.category_group_id, c.name, c.sort_order, c.is_hidden,
             c.is_system, c.linked_account_id,
             COALESCE(mb.assigned, 0) AS assigned
      FROM categories c
      LEFT JOIN monthly_budgets mb ON mb.category_id = c.id AND mb.month = ?
      ORDER BY c.sort_order, c.id
    `).all(month);

    // Compute activity for all categories this month in one query
    const activityRows = db.prepare(`
      SELECT t.category_id, COALESCE(SUM(t.amount), 0) AS activity
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      WHERE substr(t.date, 1, 7) = ?
        AND a.on_budget = 1
        AND t.transfer_transaction_id IS NULL
        AND t.category_id IS NOT NULL
      GROUP BY t.category_id
    `).all(month);

    const activityMap = {};
    for (const row of activityRows) {
      activityMap[row.category_id] = row.activity;
    }

    const readyToAssign = computeReadyToAssign(db, month);

    // Get age of money
    const ageOfMoney = computeAgeOfMoney(db);

    // Build groups with categories
    const catsByGroup = {};
    for (const cat of categories) {
      if (!catsByGroup[cat.category_group_id]) catsByGroup[cat.category_group_id] = [];

      const isCashCategory = !cat.is_system;
      const activity = activityMap[cat.id] || 0;
      const available = computeAvailableForMonth(db, cat.id, month, isCashCategory, 12);

      catsByGroup[cat.category_group_id].push({
        id: cat.id,
        name: cat.name,
        sort_order: cat.sort_order,
        is_hidden: cat.is_hidden === 1,
        is_system: cat.is_system === 1,
        linked_account_id: cat.linked_account_id,
        assigned: cat.assigned,
        activity,
        available,
      });
    }

    const result = {
      month,
      readyToAssign,
      ageOfMoney,
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        sort_order: g.sort_order,
        is_system: g.is_system === 1,
        categories: catsByGroup[g.id] || [],
      })),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/budget/:month/:categoryId
 * Sets the assigned amount for a category in a month.
 * Returns the updated category values plus the new readyToAssign.
 */
router.put('/:month/:categoryId', (req, res, next) => {
  try {
    const db = getDb();
    const { month, categoryId } = req.params;
    const { assigned } = req.body;

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be in YYYY-MM format' });
    }

    if (typeof assigned !== 'number' || !Number.isInteger(assigned)) {
      return res.status(400).json({ error: 'assigned must be an integer (cents)' });
    }

    const cat = db.prepare(
      'SELECT id, is_system FROM categories WHERE id = ?'
    ).get(categoryId);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    if (cat.is_system) return res.status(400).json({ error: 'Cannot manually assign CC payment categories' });

    // Upsert the monthly budget row
    db.prepare(`
      INSERT INTO monthly_budgets (category_id, month, assigned)
      VALUES (?, ?, ?)
      ON CONFLICT(category_id, month) DO UPDATE SET assigned = excluded.assigned
    `).run(categoryId, month, assigned);

    // Compute updated values
    const activity = db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) AS a
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      WHERE t.category_id = ?
        AND substr(t.date, 1, 7) = ?
        AND a.on_budget = 1
        AND t.transfer_transaction_id IS NULL
    `).get(categoryId, month);

    const available = computeAvailableForMonth(db, Number(categoryId), month, true, 12);
    const readyToAssign = computeReadyToAssign(db, month);

    res.json({
      categoryId: Number(categoryId),
      month,
      assigned,
      activity: activity.a,
      available,
      readyToAssign,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Computes Age of Money: FIFO average days between income receipt and spending,
 * using the last 10 cash spending transactions.
 */
function computeAgeOfMoney(db) {
  // Get last 10 spending transactions from on-budget cash accounts
  const spendingTxns = db.prepare(`
    SELECT t.id, t.date, t.amount
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE t.amount < 0
      AND t.is_income = 0
      AND t.transfer_transaction_id IS NULL
      AND a.on_budget = 1
      AND a.type != 'credit_card'
    ORDER BY t.date DESC, t.id DESC
    LIMIT 10
  `).all();

  if (spendingTxns.length === 0) return 0;

  // Get all income transactions ordered by date (FIFO queue)
  const incomeTxns = db.prepare(`
    SELECT t.id, t.date, t.amount
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE t.is_income = 1
      AND a.on_budget = 1
    ORDER BY t.date ASC, t.id ASC
  `).all();

  if (incomeTxns.length === 0) return 0;

  // Build FIFO queue of income dollars with their dates
  const incomeQueue = [];
  for (const tx of incomeTxns) {
    incomeQueue.push({ date: tx.date, amount: tx.amount });
  }

  let totalDays = 0;
  let matched = 0;
  let queueIdx = 0;
  let remainingInQueue = queueIdx < incomeQueue.length ? incomeQueue[0].amount : 0;

  // For each spending transaction (most recent first), calculate age
  for (const spendTx of spendingTxns) {
    const spendAmount = Math.abs(spendTx.amount);
    const spendDate = new Date(spendTx.date);

    let remaining = spendAmount;
    let weightedDays = 0;

    // FIFO: consume income dollars from the queue
    let tempIdx = queueIdx;
    let tempRemaining = remainingInQueue;

    while (remaining > 0 && tempIdx < incomeQueue.length) {
      const incomeEntry = incomeQueue[tempIdx];
      const incomeDate = new Date(incomeEntry.date);
      const daysOld = Math.max(0, Math.floor((spendDate - incomeDate) / 86400000));

      const consumed = Math.min(remaining, tempRemaining);
      weightedDays += consumed * daysOld;
      remaining -= consumed;
      tempRemaining -= consumed;

      if (tempRemaining <= 0) {
        tempIdx++;
        tempRemaining = tempIdx < incomeQueue.length ? incomeQueue[tempIdx].amount : 0;
      }
    }

    if (spendAmount > 0) {
      totalDays += weightedDays / spendAmount;
      matched++;
    }

    // Advance the main queue pointer
    let toConsume = spendAmount;
    while (toConsume > 0 && queueIdx < incomeQueue.length) {
      const consumed = Math.min(toConsume, remainingInQueue);
      toConsume -= consumed;
      remainingInQueue -= consumed;
      if (remainingInQueue <= 0) {
        queueIdx++;
        remainingInQueue = queueIdx < incomeQueue.length ? incomeQueue[queueIdx].amount : 0;
      }
    }
  }

  if (matched === 0) return 0;
  return Math.round(totalDays / matched);
}

module.exports = router;
module.exports.computeAgeOfMoney = computeAgeOfMoney;
module.exports.getPrevMonth = getPrevMonth;
