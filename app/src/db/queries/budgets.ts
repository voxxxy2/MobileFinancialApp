import db from '../database';

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthly_limit: number | null;
  spent_amount: number;
  percent_used: number | null;
}

export interface MonthlySummary {
  income: number;
  expense: number;
  balance: number;
}

export function getBudgetSummary(month: number, year: number): { summary: MonthlySummary; categories: BudgetCategory[] } {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  // Monthly income/expense totals
  const totals = db.getAllSync<{ type: string; total: number }>(
    `SELECT type, SUM(amount_in_base) AS total
     FROM transactions
     WHERE date >= ? AND date <= ?
     GROUP BY type`,
    [startDate, endDate]
  );
  const summary: MonthlySummary = { income: 0, expense: 0, balance: 0 };
  totals.forEach(r => { (summary as any)[r.type] = r.total ?? 0; });
  summary.balance = summary.income - summary.expense;

  // Per-category spending vs limit (expense categories only)
  const categories = db.getAllSync<BudgetCategory>(
    `SELECT
       c.id, c.name, c.icon, c.color, c.monthly_limit,
       COALESCE(SUM(t.amount_in_base), 0) AS spent_amount,
       CASE WHEN c.monthly_limit > 0
         THEN ROUND((COALESCE(SUM(t.amount_in_base), 0) / c.monthly_limit) * 100, 1)
         ELSE NULL END AS percent_used
     FROM categories c
     LEFT JOIN transactions t
       ON t.category_id = c.id
       AND t.date >= ? AND t.date <= ?
       AND t.type = 'expense'
     WHERE c.type = 'expense'
     GROUP BY c.id
     ORDER BY spent_amount DESC`,
    [startDate, endDate]
  );

  return { summary, categories };
}
