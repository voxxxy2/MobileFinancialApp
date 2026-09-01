const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/export/csv
router.get('/csv', auth, async (req, res) => {
  const { start_date, end_date, type } = req.query;

  let conditions = ['t.user_id = $1'];
  const params = [req.user.id];
  let idx = 2;

  if (type) { conditions.push(`t.type = $${idx++}`); params.push(type); }
  if (start_date) { conditions.push(`t.date >= $${idx++}`); params.push(start_date); }
  if (end_date) { conditions.push(`t.date <= $${idx++}`); params.push(end_date); }

  const where = conditions.join(' AND ');

  try {
    const result = await db.query(
      `SELECT
         t.date, t.type, t.amount, t.currency, t.amount_in_base,
         c.name AS category, t.notes, t.created_at
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE ${where}
       ORDER BY t.date DESC`,
      params
    );

    const fields = ['date', 'type', 'amount', 'currency', 'amount_in_base', 'category', 'notes', 'created_at'];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fintrack-transactions-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/export/pdf
router.get('/pdf', auth, async (req, res) => {
  const { start_date, end_date } = req.query;
  let conditions = ['t.user_id = $1'];
  const params = [req.user.id];
  let idx = 2;
  if (start_date) { conditions.push(`t.date >= $${idx++}`); params.push(start_date); }
  if (end_date) { conditions.push(`t.date <= $${idx++}`); params.push(end_date); }
  const where = conditions.join(' AND ');

  try {
    const [userResult, txResult] = await Promise.all([
      db.query('SELECT full_name, email, base_currency FROM users WHERE id = $1', [req.user.id]),
      db.query(
        `SELECT t.date, t.type, t.amount, t.currency, c.name AS category, t.notes
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE ${where}
         ORDER BY t.date DESC LIMIT 500`,
        params
      ),
    ]);

    const user = userResult.rows[0];
    const transactions = txResult.rows;

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fintrack-report-${Date.now()}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#7C3AED').text('FinTrack', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Financial Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#333');
    doc.text(`User: ${user.full_name} (${user.email})`);
    doc.text(`Currency: ${user.base_currency}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    if (start_date || end_date) {
      doc.text(`Period: ${start_date || 'Start'} — ${end_date || 'Today'}`);
    }
    doc.moveDown();

    // Summary box
    doc.fontSize(14).fillColor('#7C3AED').text('Summary');
    doc.fontSize(11).fillColor('#10B981').text(`Total Income: ${income.toFixed(2)} ${user.base_currency}`);
    doc.fontSize(11).fillColor('#F43F5E').text(`Total Expenses: ${expense.toFixed(2)} ${user.base_currency}`);
    doc.fontSize(11).fillColor('#333').text(`Net Balance: ${(income - expense).toFixed(2)} ${user.base_currency}`);
    doc.moveDown();

    // Transactions table
    doc.fontSize(14).fillColor('#7C3AED').text('Transactions');
    doc.moveDown(0.5);

    // Table header
    const colX = [50, 120, 200, 280, 360, 440];
    const headers = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Notes'];
    doc.fontSize(9).fillColor('#fff');
    doc.rect(50, doc.y, 500, 18).fill('#7C3AED');
    const headerY = doc.y - 14;
    headers.forEach((h, i) => {
      doc.fillColor('#fff').text(h, colX[i], headerY, { width: 70, lineBreak: false });
    });
    doc.moveDown(0.3);

    // Table rows
    transactions.slice(0, 200).forEach((t, i) => {
      if (doc.y > 750) { doc.addPage(); }
      const bg = i % 2 === 0 ? '#F9F7FF' : '#fff';
      doc.rect(50, doc.y, 500, 16).fill(bg);
      const rowY = doc.y + 3;
      const color = t.type === 'income' ? '#10B981' : '#F43F5E';
      doc.fillColor('#333').fontSize(8);
      doc.text(String(t.date).slice(0, 10), colX[0], rowY, { width: 70, lineBreak: false });
      doc.fillColor(color).text(t.type, colX[1], rowY, { width: 70, lineBreak: false });
      doc.fillColor('#333').text(parseFloat(t.amount).toFixed(2), colX[2], rowY, { width: 70, lineBreak: false });
      doc.text(t.currency, colX[3], rowY, { width: 70, lineBreak: false });
      doc.text(t.category || '—', colX[4], rowY, { width: 70, lineBreak: false });
      doc.text(t.notes || '', colX[5], rowY, { width: 100, lineBreak: false });
      doc.moveDown(1.1);
    });

    if (transactions.length > 200) {
      doc.moveDown().fontSize(9).fillColor('#999').text(`(Showing 200 of ${transactions.length} transactions)`);
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
