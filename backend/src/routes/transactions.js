'use strict';

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/**
 * GET /api/accounts/:id/transactions
 * Returns paginated transactions for an account with running balance.
 */
router.get('/accounts/:id/transactions', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Total count for pagination
    const total = db.prepare(
      'SELECT COUNT(*) AS cnt FROM transactions WHERE account_id = ?'
    ).get(id).cnt;

    // Fetch transactions with category info
    const transactions = db.prepare(`
      SELECT
        t.id, t.account_id, t.date, t.payee, t.category_id,
        c.name AS category_name,
        cg.name AS category_group_name,
        t.memo, t.amount, t.cleared, t.reconciled,
        t.transfer_transaction_id, t.is_income,
        t.created_at, t.updated_at,
        -- Transfer account info
        (SELECT a2.id FROM transactions t2 JOIN accounts a2 ON a2.id = t2.account_id
         WHERE t2.id = t.transfer_transaction_id LIMIT 1) AS transfer_account_id,
        (SELECT a2.name FROM transactions t2 JOIN accounts a2 ON a2.id = t2.account_id
         WHERE t2.id = t.transfer_transaction_id LIMIT 1) AS transfer_account_name
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN category_groups cg ON cg.id = c.category_group_id
      WHERE t.account_id = ?
      ORDER BY t.date DESC, t.id DESC
      LIMIT ? OFFSET ?
    `).all(id, limit, offset);

    // Compute running balance for this page
    // Get the total balance of all transactions newer than our offset
    const totalBalance = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS bal FROM transactions WHERE account_id = ?'
    ).get(id).bal;

    // Sum of transactions above the offset (more recent)
    const aboveOffset = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS bal
      FROM (
        SELECT amount FROM transactions WHERE account_id = ?
        ORDER BY date DESC, id DESC
        LIMIT ?
      )
    `).get(id, offset).bal;

    let runningBalance = totalBalance - aboveOffset;

    const txsWithBalance = transactions.map(tx => {
      runningBalance += tx.amount;
      const result = formatTransaction(tx, runningBalance);
      return result;
    });

    // Reverse to match DESC display order (each tx shows balance after itself)
    // Actually we want running balance from top down in DESC order
    // Re-compute properly
    let bal = totalBalance;
    const txsFormatted = transactions.map(tx => {
      const result = formatTransaction(tx, bal);
      bal -= tx.amount;
      return result;
    });

    res.json({
      account_id: Number(id),
      total,
      page,
      limit,
      transactions: txsFormatted,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/transactions
 * Creates a transaction or a transfer (two linked transactions atomically).
 */
router.post('/transactions', (req, res, next) => {
  try {
    const db = getDb();
    const {
      account_id,
      date,
      payee,
      category_id,
      memo,
      amount,
      cleared = false,
      is_income = false,
      transfer_account_id,
    } = req.body;

    if (!account_id || !date || amount === undefined) {
      return res.status(400).json({ error: 'account_id, date, and amount are required' });
    }

    if (!Number.isInteger(amount)) {
      return res.status(400).json({ error: 'amount must be an integer (cents)' });
    }

    const account = db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(account_id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Transfer transaction
    if (transfer_account_id) {
      const destAccount = db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(transfer_account_id);
      if (!destAccount) return res.status(404).json({ error: 'Transfer destination account not found' });

      const createTransfer = db.transaction(() => {
        // Source leg (outflow from source account)
        const sourceResult = db.prepare(`
          INSERT INTO transactions (account_id, date, payee, memo, amount, cleared, transfer_transaction_id)
          VALUES (?, ?, ?, ?, ?, ?, NULL)
        `).run(
          account_id,
          date,
          `Transfer : ${destAccount.name}`,
          memo || '',
          -Math.abs(amount),
          cleared ? 1 : 0
        );
        const sourceId = sourceResult.lastInsertRowid;

        // Destination leg (inflow to dest account)
        const destResult = db.prepare(`
          INSERT INTO transactions (account_id, date, payee, memo, amount, cleared, transfer_transaction_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          transfer_account_id,
          date,
          `Transfer : ${account.name}`,
          memo || '',
          Math.abs(amount),
          cleared ? 1 : 0,
          sourceId
        );
        const destId = destResult.lastInsertRowid;

        // Link the source leg back to the dest leg
        db.prepare('UPDATE transactions SET transfer_transaction_id = ? WHERE id = ?').run(destId, sourceId);

        return [sourceId, destId];
      });

      const [sourceId, destId] = createTransfer();

      const txns = [
        fetchFullTransaction(db, sourceId),
        fetchFullTransaction(db, destId),
      ];

      return res.status(201).json({ transactions: txns });
    }

    // Regular transaction
    const result = db.prepare(`
      INSERT INTO transactions (account_id, date, payee, category_id, memo, amount, cleared, is_income)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      account_id,
      date,
      payee || null,
      category_id || null,
      memo || null,
      amount,
      cleared ? 1 : 0,
      is_income ? 1 : 0
    );

    const tx = fetchFullTransaction(db, result.lastInsertRowid);
    res.status(201).json({ transactions: [tx] });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/transactions/:id
 * Updates an existing transaction.
 */
router.put('/transactions/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const tx = db.prepare('SELECT id, transfer_transaction_id FROM transactions WHERE id = ?').get(id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const { date, payee, category_id, memo, amount, cleared, is_income } = req.body;

    const fields = [];
    const values = [];

    if (date !== undefined) { fields.push('date = ?'); values.push(date); }
    if (payee !== undefined) { fields.push('payee = ?'); values.push(payee); }
    if (category_id !== undefined) { fields.push('category_id = ?'); values.push(category_id); }
    if (memo !== undefined) { fields.push('memo = ?'); values.push(memo); }
    if (amount !== undefined) {
      if (!Number.isInteger(amount)) {
        return res.status(400).json({ error: 'amount must be an integer (cents)' });
      }
      fields.push('amount = ?');
      values.push(amount);
    }
    if (cleared !== undefined) { fields.push('cleared = ?'); values.push(cleared ? 1 : 0); }
    if (is_income !== undefined) { fields.push('is_income = ?'); values.push(is_income ? 1 : 0); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    // If this is a transfer and amount/date changed, update the paired leg
    if (tx.transfer_transaction_id && (amount !== undefined || date !== undefined || cleared !== undefined)) {
      const patchPaired = [];
      const patchValues = [];
      if (date !== undefined) { patchPaired.push('date = ?'); patchValues.push(date); }
      if (amount !== undefined) { patchPaired.push('amount = ?'); patchValues.push(-amount); }
      if (cleared !== undefined) { patchPaired.push('cleared = ?'); patchValues.push(cleared ? 1 : 0); }
      patchPaired.push("updated_at = datetime('now')");
      patchValues.push(tx.transfer_transaction_id);
      db.prepare(`UPDATE transactions SET ${patchPaired.join(', ')} WHERE id = ?`).run(...patchValues);
    }

    const updated = fetchFullTransaction(db, Number(id));
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/transactions/:id
 * Deletes a transaction. For transfers, deletes both legs.
 */
router.delete('/transactions/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const tx = db.prepare('SELECT id, transfer_transaction_id FROM transactions WHERE id = ?').get(id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const deleteTransfer = db.transaction(() => {
      if (tx.transfer_transaction_id) {
        db.prepare('UPDATE transactions SET transfer_transaction_id = NULL WHERE id = ?').run(id);
        db.prepare('UPDATE transactions SET transfer_transaction_id = NULL WHERE id = ?').run(tx.transfer_transaction_id);
        db.prepare('DELETE FROM transactions WHERE id = ?').run(tx.transfer_transaction_id);
      }
      db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    });

    deleteTransfer();
    res.json({ success: true, id: Number(id) });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/transactions/:id/clear
 * Toggles the cleared status of a transaction.
 */
router.put('/transactions/:id/clear', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const tx = db.prepare('SELECT id, cleared FROM transactions WHERE id = ?').get(id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const newCleared = tx.cleared === 1 ? 0 : 1;
    db.prepare("UPDATE transactions SET cleared = ?, updated_at = datetime('now') WHERE id = ?").run(newCleared, id);

    const updated = fetchFullTransaction(db, Number(id));
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

function fetchFullTransaction(db, id) {
  const tx = db.prepare(`
    SELECT
      t.id, t.account_id, t.date, t.payee, t.category_id,
      c.name AS category_name,
      cg.name AS category_group_name,
      t.memo, t.amount, t.cleared, t.reconciled,
      t.transfer_transaction_id, t.is_income,
      t.created_at, t.updated_at,
      (SELECT a2.id FROM transactions t2 JOIN accounts a2 ON a2.id = t2.account_id
       WHERE t2.id = t.transfer_transaction_id LIMIT 1) AS transfer_account_id,
      (SELECT a2.name FROM transactions t2 JOIN accounts a2 ON a2.id = t2.account_id
       WHERE t2.id = t.transfer_transaction_id LIMIT 1) AS transfer_account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN category_groups cg ON cg.id = c.category_group_id
    WHERE t.id = ?
  `).get(id);

  return formatTransaction(tx, null);
}

function formatTransaction(t, runningBalance) {
  return {
    id: t.id,
    account_id: t.account_id,
    date: t.date,
    payee: t.payee,
    category_id: t.category_id,
    category_name: t.category_name || null,
    category_group_name: t.category_group_name || null,
    memo: t.memo,
    amount: t.amount,
    cleared: t.cleared === 1,
    reconciled: t.reconciled === 1,
    transfer_transaction_id: t.transfer_transaction_id,
    transfer_account_id: t.transfer_account_id || null,
    transfer_account_name: t.transfer_account_name || null,
    is_income: t.is_income === 1,
    running_balance: runningBalance,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

module.exports = router;
