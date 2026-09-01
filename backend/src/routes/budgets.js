const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/budgets — monthly budget summary for current (or specified) month
router.get('/', auth, async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  try {
    const result = await db.query(
      `SELECT
         c.id, c.name, c.icon, c.color, c.monthly_limit,
         COALESCE(bp.spent_amount, 0) AS spent_amount,
         CASE
           WHEN c.monthly_limit IS NOT NULL AND c.monthly_limit > 0
           THEN ROUND((COALESCE(bp.spent_amount, 0) / c.monthly_limit) * 100, 2)
           ELSE NULL
         END AS percent_used
       FROM categories c
       LEFT JOIN budget_periods bp
         ON bp.category_id = c.id
         AND bp.user_id = $1
         AND bp.month = $2
         AND bp.year = $3
       WHERE c.user_id = $1
         AND c.type = 'expense'
       ORDER BY c.name`,
      [req.user.id, month, year]
    );

    // Total income and expenses for the month
    const summaryResult = await db.query(
      `SELECT
         type,
         SUM(amount_in_base) AS total
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       GROUP BY type`,
      [req.user.id, month, year]
    );

    const summary = { income: 0, expense: 0 };
    summaryResult.rows.forEach(r => { summary[r.type] = parseFloat(r.total) || 0; });
    summary.balance = summary.income - summary.expense;

    res.json({ month, year, summary, categories: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

module.exports = router;
