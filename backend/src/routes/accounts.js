'use strict';

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/**
 * GET /api/accounts
 * Returns all accounts with their computed balances.
 */
router.get('/', (req, res, next) => {
  try {
    const db = getDb();

    const accounts = db.prepare(`
      SELECT
        a.id,
        a.name,
        a.type,
        a.on_budget,
        a.closed,
        a.sort_order,
        a.created_at,
        a.updated_at,
        COALESCE(SUM(t.amount), 0) AS balance,
        COALESCE(SUM(CASE WHEN t.cleared = 1 OR t.reconciled = 1 THEN t.amount ELSE 0 END), 0) AS cleared_balance,
        COALESCE(SUM(CASE WHEN t.cleared = 0 AND t.reconciled = 0 THEN t.amount ELSE 0 END), 0) AS uncleared_balance
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id
      GROUP BY a.id
      ORDER BY a.sort_order, a.created_at
    `).all();

    res.json(accounts.map(formatAccount));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/accounts
 * Creates a new account. Auto-creates CC Payment category for credit_card type.
 */
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { name, type, balance = 0, on_budget = 1 } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    const validTypes = ['checking', 'savings', 'credit_card', 'cash', 'investment'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const createAccount = db.transaction(() => {
      // Get max sort_order
      const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM accounts').get();
      const sortOrder = maxOrder.m + 1000;

      const result = db.prepare(`
        INSERT INTO accounts (name, type, on_budget, sort_order)
        VALUES (?, ?, ?, ?)
      `).run(name, type, on_budget ? 1 : 0, sortOrder);

      const accountId = result.lastInsertRowid;

      // If starting balance provided, create an opening balance transaction
      if (balance !== 0) {
        db.prepare(`
          INSERT INTO transactions (account_id, date, payee, memo, amount, cleared, is_income)
          VALUES (?, date('now'), 'Opening Balance', 'Starting balance', ?, 1, ?)
        `).run(accountId, balance, balance > 0 ? 1 : 0);
      }

      // Auto-create Credit Card Payment category for credit_card accounts
      if (type === 'credit_card') {
        // Find or create the "Credit Card Payments" system group
        let ccGroup = db.prepare(
          "SELECT id FROM category_groups WHERE is_system = 1 AND name = 'Credit Card Payments' LIMIT 1"
        ).get();

        if (!ccGroup) {
          const maxGroupOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM category_groups').get();
          const groupResult = db.prepare(`
            INSERT INTO category_groups (name, sort_order, is_system)
            VALUES ('Credit Card Payments', ?, 1)
          `).run(maxGroupOrder.m + 1000);
          ccGroup = { id: groupResult.lastInsertRowid };
        }

        // Create CC payment category linked to this account
        const maxCatOrder = db.prepare(
          'SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories WHERE category_group_id = ?'
        ).get(ccGroup.id);

        db.prepare(`
          INSERT INTO categories (category_group_id, name, sort_order, is_system, linked_account_id)
          VALUES (?, ?, ?, 1, ?)
        `).run(ccGroup.id, name, (maxCatOrder.m + 1000), accountId);
      }

      return accountId;
    });

    const accountId = createAccount();

    // Fetch the full account with computed balances
    const account = db.prepare(`
      SELECT
        a.id, a.name, a.type, a.on_budget, a.closed, a.sort_order, a.created_at, a.updated_at,
        COALESCE(SUM(t.amount), 0) AS balance,
        COALESCE(SUM(CASE WHEN t.cleared = 1 OR t.reconciled = 1 THEN t.amount ELSE 0 END), 0) AS cleared_balance,
        COALESCE(SUM(CASE WHEN t.cleared = 0 AND t.reconciled = 0 THEN t.amount ELSE 0 END), 0) AS uncleared_balance
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id
      WHERE a.id = ?
      GROUP BY a.id
    `).get(accountId);

    res.status(201).json(formatAccount(account));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/accounts/:id
 * Updates account name, type, on_budget, sort_order, or closed status.
 */
router.put('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, type, on_budget, closed, sort_order } = req.body;

    const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (type !== undefined) { fields.push('type = ?'); values.push(type); }
    if (on_budget !== undefined) { fields.push('on_budget = ?'); values.push(on_budget ? 1 : 0); }
    if (closed !== undefined) { fields.push('closed = ?'); values.push(closed ? 1 : 0); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(`
      SELECT
        a.id, a.name, a.type, a.on_budget, a.closed, a.sort_order, a.created_at, a.updated_at,
        COALESCE(SUM(t.amount), 0) AS balance,
        COALESCE(SUM(CASE WHEN t.cleared = 1 OR t.reconciled = 1 THEN t.amount ELSE 0 END), 0) AS cleared_balance,
        COALESCE(SUM(CASE WHEN t.cleared = 0 AND t.reconciled = 0 THEN t.amount ELSE 0 END), 0) AS uncleared_balance
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id
      WHERE a.id = ?
      GROUP BY a.id
    `).get(id);

    res.json(formatAccount(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/accounts/:id
 * Closes (soft-deletes) an account by setting closed = 1.
 */
router.delete('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    db.prepare("UPDATE accounts SET closed = 1, updated_at = datetime('now') WHERE id = ?").run(id);

    res.json({ success: true, id: Number(id) });
  } catch (err) {
    next(err);
  }
});

function formatAccount(a) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance,
    cleared_balance: a.cleared_balance,
    uncleared_balance: a.uncleared_balance,
    on_budget: a.on_budget === 1,
    closed: a.closed === 1,
    sort_order: a.sort_order,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

module.exports = router;
