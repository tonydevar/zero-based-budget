'use strict';

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/**
 * POST /api/reconciliations
 * Marks specified transactions as reconciled and records the reconciliation.
 *
 * Request body:
 * {
 *   account_id: number,
 *   statement_balance: number,  // cents
 *   transaction_ids: number[]   // transactions to mark reconciled
 * }
 */
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { account_id, statement_balance, transaction_ids } = req.body;

    if (!account_id || statement_balance === undefined || !Array.isArray(transaction_ids)) {
      return res.status(400).json({
        error: 'account_id, statement_balance, and transaction_ids array are required',
      });
    }

    if (!Number.isInteger(statement_balance)) {
      return res.status(400).json({ error: 'statement_balance must be an integer (cents)' });
    }

    const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(account_id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const doReconcile = db.transaction(() => {
      // Verify all transaction IDs belong to this account
      if (transaction_ids.length > 0) {
        const placeholders = transaction_ids.map(() => '?').join(',');
        const txns = db.prepare(`
          SELECT id FROM transactions
          WHERE id IN (${placeholders}) AND account_id = ?
        `).all(...transaction_ids, account_id);

        if (txns.length !== transaction_ids.length) {
          const err = new Error('Some transactions do not belong to this account');
          err.status = 400;
          throw err;
        }

        // Mark transactions as cleared AND reconciled
        db.prepare(`
          UPDATE transactions
          SET cleared = 1, reconciled = 1, updated_at = datetime('now')
          WHERE id IN (${placeholders})
        `).run(...transaction_ids);
      }

      // Create reconciliation record
      const result = db.prepare(`
        INSERT INTO reconciliations (account_id, statement_balance)
        VALUES (?, ?)
      `).run(account_id, statement_balance);

      return result.lastInsertRowid;
    });

    const reconciliationId = doReconcile();

    const reconciliation = db.prepare(
      'SELECT * FROM reconciliations WHERE id = ?'
    ).get(reconciliationId);

    res.status(201).json({
      id: reconciliation.id,
      account_id: reconciliation.account_id,
      statement_balance: reconciliation.statement_balance,
      reconciled_at: reconciliation.reconciled_at,
      transactions_reconciled: transaction_ids.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
