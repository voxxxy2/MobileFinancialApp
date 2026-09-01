const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/investments
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM investments WHERE user_id = $1 ORDER BY asset_type, name',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

// POST /api/investments
router.post('/',
  auth,
  [
    body('ticker').trim().notEmpty(),
    body('name').trim().notEmpty(),
    body('asset_type').isIn(['stock', 'crypto', 'etf', 'other']),
    body('quantity').isFloat({ gt: 0 }),
    body('buy_price').isFloat({ gt: 0 }),
    body('currency').isLength({ min: 3, max: 10 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { ticker, name, asset_type, quantity, buy_price, currency, notes } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO investments (user_id, ticker, name, asset_type, quantity, buy_price, currency, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, ticker.toUpperCase(), name, asset_type, quantity, buy_price, currency, notes || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add investment' });
    }
  }
);

// PUT /api/investments/:id
router.put('/:id', auth, async (req, res) => {
  const { ticker, name, asset_type, quantity, buy_price, currency, notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE investments SET
         ticker = COALESCE($1, ticker),
         name = COALESCE($2, name),
         asset_type = COALESCE($3, asset_type),
         quantity = COALESCE($4, quantity),
         buy_price = COALESCE($5, buy_price),
         currency = COALESCE($6, currency),
         notes = COALESCE($7, notes)
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [ticker?.toUpperCase(), name, asset_type, quantity, buy_price, currency, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Investment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

// DELETE /api/investments/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Investment not found' });
    res.json({ message: 'Investment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

module.exports = router;
