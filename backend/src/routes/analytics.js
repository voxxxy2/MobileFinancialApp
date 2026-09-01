const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/analytics/summary — monthly income vs expense for last N months
router.get('/summary', auth, async (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 6, 24);
  try {
    const result = await db.query(
      `SELECT
         TO_CHAR(date, 'YYYY-MM') AS month,
         type,
         SUM(amount_in_base) AS total
       FROM transactions
       WHERE user_id = $1
         AND date >= NOW() - INTERVAL '${months} months'
       GROUP BY month, type
       ORDER BY month ASC`,
      [req.user.id]
    );

    // Pivot into { month, income, expense } format
    const monthMap = {};
    result.rows.forEach(r => {
      if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, income: 0, expense: 0 };
      monthMap[r.month][r.type] = parseFloat(r.total) || 0;
    });

    res.json(Object.values(monthMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/analytics/categories — spending by category for a given month
router.get('/categories', auth, async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  try {
    const result = await db.query(
      `SELECT
         c.id, c.name, c.icon, c.color,
         COALESCE(SUM(t.amount_in_base), 0) AS total
       FROM categories c
       LEFT JOIN transactions t
         ON t.category_id = c.id
         AND t.user_id = $1
         AND EXTRACT(MONTH FROM t.date) = $2
         AND EXTRACT(YEAR FROM t.date) = $3
       WHERE c.user_id = $1 AND c.type = 'expense'
       GROUP BY c.id, c.name, c.icon, c.color
       HAVING COALESCE(SUM(t.amount_in_base), 0) > 0
       ORDER BY total DESC`,
      [req.user.id, month, year]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch category breakdown' });
  }
});

// GET /api/analytics/net-worth — rolling net worth (income - expense) over time
router.get('/net-worth', auth, async (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 12, 36);
  try {
    const result = await db.query(
      `SELECT
         TO_CHAR(date, 'YYYY-MM') AS month,
         SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE -amount_in_base END) AS net
       FROM transactions
       WHERE user_id = $1
         AND date >= NOW() - INTERVAL '${months} months'
       GROUP BY month
       ORDER BY month ASC`,
      [req.user.id]
    );

    // Compute cumulative net worth
    let running = 0;
    const data = result.rows.map(r => {
      running += parseFloat(r.net) || 0;
      return { month: r.month, net_change: parseFloat(r.net) || 0, cumulative: Math.round(running * 100) / 100 };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch net worth' });
  }
});

// GET /api/analytics/dashboard — dashboard summary stats
router.get('/dashboard', auth, async (req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    const [monthlyResult, netWorthResult, recentResult] = await Promise.all([
      db.query(
        `SELECT type, SUM(amount_in_base) AS total
         FROM transactions
         WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
         GROUP BY type`,
        [req.user.id, month, year]
      ),
      db.query(
        `SELECT SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE -amount_in_base END) AS net_worth
         FROM transactions WHERE user_id = $1`,
        [req.user.id]
      ),
      db.query(
        `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1
         ORDER BY t.date DESC, t.created_at DESC LIMIT 5`,
        [req.user.id]
      ),
    ]);

    const monthly = { income: 0, expense: 0 };
    monthlyResult.rows.forEach(r => { monthly[r.type] = parseFloat(r.total) || 0; });
    monthly.balance = monthly.income - monthly.expense;

    res.json({
      net_worth: parseFloat(netWorthResult.rows[0]?.net_worth) || 0,
      monthly,
      recent_transactions: recentResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
