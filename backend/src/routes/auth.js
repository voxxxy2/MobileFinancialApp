const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, base_currency = 'USD' } = req.body;

    try {
      // Check if user exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const result = await db.query(
        `INSERT INTO users (email, password_hash, full_name, base_currency)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, base_currency, theme, created_at`,
        [email, password_hash, full_name, base_currency]
      );

      const user = result.rows[0];

      // Seed default categories
      await seedDefaultCategories(user.id);

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const result = await db.query(
        'SELECT id, email, full_name, password_hash, base_currency, theme FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const { password_hash, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, full_name, base_currency, theme, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  const { full_name, base_currency, theme } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        base_currency = COALESCE($2, base_currency),
        theme = COALESCE($3, theme)
       WHERE id = $4
       RETURNING id, email, full_name, base_currency, theme, created_at`,
      [full_name, base_currency, theme, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Seed default categories for a new user
async function seedDefaultCategories(userId) {
  const defaults = [
    { name: 'Salary', icon: 'briefcase', color: '#10B981', type: 'income' },
    { name: 'Freelance', icon: 'laptop', color: '#34D399', type: 'income' },
    { name: 'Investment', icon: 'trending-up', color: '#6EE7B7', type: 'income' },
    { name: 'Food & Dining', icon: 'coffee', color: '#F59E0B', type: 'expense', monthly_limit: 500 },
    { name: 'Transport', icon: 'car', color: '#3B82F6', type: 'expense', monthly_limit: 200 },
    { name: 'Housing', icon: 'home', color: '#8B5CF6', type: 'expense', monthly_limit: 1500 },
    { name: 'Entertainment', icon: 'film', color: '#EC4899', type: 'expense', monthly_limit: 200 },
    { name: 'Health', icon: 'heart', color: '#F43F5E', type: 'expense', monthly_limit: 300 },
    { name: 'Shopping', icon: 'shopping-bag', color: '#F97316', type: 'expense', monthly_limit: 400 },
    { name: 'Education', icon: 'book', color: '#14B8A6', type: 'expense', monthly_limit: 300 },
    { name: 'Utilities', icon: 'zap', color: '#A78BFA', type: 'expense', monthly_limit: 200 },
    { name: 'Other', icon: 'more-horizontal', color: '#9CA3AF', type: 'expense' },
  ];

  for (const cat of defaults) {
    await db.query(
      `INSERT INTO categories (user_id, name, icon, color, type, monthly_limit)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, cat.name, cat.icon, cat.color, cat.type, cat.monthly_limit || null]
    );
  }
}

module.exports = router;
