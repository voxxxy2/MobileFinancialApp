const express = require('express');
const router = express.Router();
const { body, query: qv, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/transactions
router.get('/', auth, async (req, res) => {
  const {
    page = 1, limit = 20, type, category_id,
    start_date, end_date, search
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let conditions = ['t.user_id = $1'];
  let params = [req.user.id];
  let idx = 2;

  if (type) { conditions.push(`t.type = $${idx++}`); params.push(type); }
  if (category_id) { conditions.push(`t.category_id = $${idx++}`); params.push(category_id); }
  if (start_date) { conditions.push(`t.date >= $${idx++}`); params.push(start_date); }
  if (end_date) { conditions.push(`t.date <= $${idx++}`); params.push(end_date); }
  if (search) { conditions.push(`t.notes ILIKE $${idx++}`); params.push(`%${search}%`); }

  const where = conditions.join(' AND ');

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM transactions t WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE ${where}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// POST /api/transactions
router.post('/',
  auth,
  [
    body('type').isIn(['income', 'expense']),
    body('amount').isFloat({ gt: 0 }),
    body('currency').isLength({ min: 3, max: 10 }),
    body('date').isDate(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { type, amount, currency, category_id, notes, date, amount_in_base } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO transactions (user_id, type, amount, currency, category_id, notes, date, amount_in_base)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [req.user.id, type, amount, currency, category_id || null, notes || null, date, amount_in_base || amount]
      );

      // Update budget period spending
      if (type === 'expense' && category_id) {
        const d = new Date(date);
        await db.query(
          `INSERT INTO budget_periods (user_id, category_id, month, year, spent_amount)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, category_id, month, year)
           DO UPDATE SET spent_amount = budget_periods.spent_amount + $5`,
          [req.user.id, category_id, d.getMonth() + 1, d.getFullYear(), amount_in_base || amount]
        );
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }
);

// PUT /api/transactions/:id
router.put('/:id', auth, async (req, res) => {
  const { type, amount, currency, category_id, notes, date, amount_in_base } = req.body;
  try {
    const result = await db.query(
      `UPDATE transactions SET
         type = COALESCE($1, type),
         amount = COALESCE($2, amount),
         currency = COALESCE($3, currency),
         category_id = COALESCE($4, category_id),
         notes = COALESCE($5, notes),
         date = COALESCE($6, date),
         amount_in_base = COALESCE($7, amount_in_base)
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [type, amount, currency, category_id, notes, date, amount_in_base, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ message: 'Transaction deleted', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
