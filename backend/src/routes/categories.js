const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/categories
router.get('/', auth, async (req, res) => {
  const { type } = req.query;
  try {
    let q = 'SELECT * FROM categories WHERE user_id = $1';
    const params = [req.user.id];
    if (type) { q += ' AND type = $2'; params.push(type); }
    q += ' ORDER BY type, name';
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories
router.post('/',
  auth,
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['income', 'expense']),
    body('color').optional().isHexColor(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, icon = 'circle', color = '#7C3AED', type, monthly_limit } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO categories (user_id, name, icon, color, type, monthly_limit)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.user.id, name, icon, color, type, monthly_limit || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
);

// PUT /api/categories/:id
router.put('/:id', auth, async (req, res) => {
  const { name, icon, color, monthly_limit } = req.body;
  try {
    const result = await db.query(
      `UPDATE categories SET
         name = COALESCE($1, name),
         icon = COALESCE($2, icon),
         color = COALESCE($3, color),
         monthly_limit = COALESCE($4, monthly_limit)
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name, icon, color, monthly_limit, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
