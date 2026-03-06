'use strict';

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/**
 * GET /api/category-groups
 * Returns all category groups with their categories.
 */
router.get('/category-groups', (req, res, next) => {
  try {
    const db = getDb();

    const groups = db.prepare(`
      SELECT id, name, sort_order, is_system, created_at
      FROM category_groups
      ORDER BY sort_order, id
    `).all();

    const categories = db.prepare(`
      SELECT id, category_group_id, name, sort_order, is_hidden, is_system, linked_account_id, created_at
      FROM categories
      ORDER BY sort_order, id
    `).all();

    const catsByGroup = {};
    for (const cat of categories) {
      if (!catsByGroup[cat.category_group_id]) catsByGroup[cat.category_group_id] = [];
      catsByGroup[cat.category_group_id].push(formatCategory(cat));
    }

    const result = groups.map(g => ({
      id: g.id,
      name: g.name,
      sort_order: g.sort_order,
      is_system: g.is_system === 1,
      created_at: g.created_at,
      categories: catsByGroup[g.id] || [],
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/category-groups
 * Creates a new category group.
 */
router.post('/category-groups', (req, res, next) => {
  try {
    const db = getDb();
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM category_groups').get();
    const sortOrder = maxOrder.m + 1000;

    const result = db.prepare(
      'INSERT INTO category_groups (name, sort_order, is_system) VALUES (?, ?, 0)'
    ).run(name, sortOrder);

    const group = db.prepare('SELECT * FROM category_groups WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...group,
      is_system: group.is_system === 1,
      categories: [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/category-groups/:id
 * Updates a category group's name or sort_order.
 */
router.put('/category-groups/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, sort_order } = req.body;

    const group = db.prepare('SELECT id FROM category_groups WHERE id = ?').get(id);
    if (!group) return res.status(404).json({ error: 'Category group not found' });

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    db.prepare(`UPDATE category_groups SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM category_groups WHERE id = ?').get(id);
    res.json({ ...updated, is_system: updated.is_system === 1 });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/category-groups/:id
 * Deletes a category group (must have no categories or all categories must have no transactions).
 */
router.delete('/category-groups/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const group = db.prepare('SELECT id, is_system FROM category_groups WHERE id = ?').get(id);
    if (!group) return res.status(404).json({ error: 'Category group not found' });
    if (group.is_system) return res.status(400).json({ error: 'Cannot delete system category groups' });

    // Check for transactions in any category in this group
    const txCount = db.prepare(`
      SELECT COUNT(*) AS cnt FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE c.category_group_id = ?
    `).get(id);

    if (txCount.cnt > 0) {
      return res.status(409).json({ error: 'Cannot delete group with existing transactions' });
    }

    db.prepare('DELETE FROM category_groups WHERE id = ?').run(id);
    res.json({ success: true, id: Number(id) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/categories
 * Creates a new category within a group.
 */
router.post('/categories', (req, res, next) => {
  try {
    const db = getDb();
    const { category_group_id, name } = req.body;

    if (!category_group_id || !name) {
      return res.status(400).json({ error: 'category_group_id and name are required' });
    }

    const group = db.prepare('SELECT id FROM category_groups WHERE id = ?').get(category_group_id);
    if (!group) return res.status(404).json({ error: 'Category group not found' });

    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories WHERE category_group_id = ?'
    ).get(category_group_id);
    const sortOrder = maxOrder.m + 1000;

    const result = db.prepare(`
      INSERT INTO categories (category_group_id, name, sort_order) VALUES (?, ?, ?)
    `).run(category_group_id, name, sortOrder);

    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(formatCategory(cat));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/categories/reorder
 * Batch updates sort_order for multiple categories (for drag-and-drop).
 * IMPORTANT: This static route must be registered BEFORE PUT /categories/:id
 * to prevent Express from matching "reorder" as the :id parameter.
 */
router.put('/categories/reorder', (req, res, next) => {
  try {
    const db = getDb();
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const updateOrder = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
    const updateGroup = db.prepare('UPDATE categories SET sort_order = ?, category_group_id = ? WHERE id = ?');

    const doReorder = db.transaction(() => {
      let updated = 0;
      for (const item of items) {
        if (item.category_group_id !== undefined) {
          updateGroup.run(item.sort_order, item.category_group_id, item.id);
        } else {
          updateOrder.run(item.sort_order, item.id);
        }
        updated++;
      }
      return updated;
    });

    const updated = doReorder();
    res.json({ updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/categories/:id
 * Updates category name, sort_order, or is_hidden.
 */
router.put('/categories/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, sort_order, is_hidden, category_group_id } = req.body;

    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    if (is_hidden !== undefined) { fields.push('is_hidden = ?'); values.push(is_hidden ? 1 : 0); }
    if (category_group_id !== undefined) { fields.push('category_group_id = ?'); values.push(category_group_id); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json(formatCategory(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/categories/:id
 * Deletes a category. Returns 409 if it has transactions.
 */
router.delete('/categories/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const cat = db.prepare('SELECT id, is_system FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    if (cat.is_system) return res.status(400).json({ error: 'Cannot delete system categories' });

    const txCount = db.prepare(
      'SELECT COUNT(*) AS cnt FROM transactions WHERE category_id = ?'
    ).get(id);

    if (txCount.cnt > 0) {
      return res.status(409).json({ error: 'Cannot delete category with existing transactions' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, id: Number(id) });
  } catch (err) {
    next(err);
  }
});

function formatCategory(c) {
  return {
    id: c.id,
    category_group_id: c.category_group_id,
    name: c.name,
    sort_order: c.sort_order,
    is_hidden: c.is_hidden === 1,
    is_system: c.is_system === 1,
    linked_account_id: c.linked_account_id,
    created_at: c.created_at,
  };
}

module.exports = router;
