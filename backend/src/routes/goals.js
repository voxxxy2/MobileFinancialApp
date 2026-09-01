const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/goals
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// POST /api/goals
router.post('/',
  auth,
  [
    body('name').trim().notEmpty(),
    body('target_amount').isFloat({ gt: 0 }),
    body('currency').isLength({ min: 3, max: 10 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, target_amount, currency, target_date, icon = 'target', color = '#10B981' } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO savings_goals (user_id, name, description, target_amount, currency, target_date, icon, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, name, description || null, target_amount, currency, target_date || null, icon, color]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create goal' });
    }
  }
);

// PUT /api/goals/:id — update goal or add contribution
router.put('/:id', auth, async (req, res) => {
  const { name, description, target_amount, currency, target_date, icon, color, add_amount } = req.body;
  try {
    let result;
    if (add_amount !== undefined) {
      // Add contribution
      result = await db.query(
        `UPDATE savings_goals
         SET current_amount = LEAST(current_amount + $1, target_amount)
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [parseFloat(add_amount), req.params.id, req.user.id]
      );
    } else {
      result = await db.query(
        `UPDATE savings_goals SET
           name = COALESCE($1, name),
           description = COALESCE($2, description),
           target_amount = COALESCE($3, target_amount),
           currency = COALESCE($4, currency),
           target_date = COALESCE($5, target_date),
           icon = COALESCE($6, icon),
           color = COALESCE($7, color)
         WHERE id = $8 AND user_id = $9
         RETURNING *`,
        [name, description, target_amount, currency, target_date, icon, color, req.params.id, req.user.id]
      );
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

module.exports = router;
