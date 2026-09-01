import db from '../database';
import { getTransactions } from './transactions';

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
}

export interface NetWorthPoint {
  month: string;
  net_change: number;
  cumulative: number;
}

export interface DashboardData {
  net_worth: number;
  monthly: { income: number; expense: number; balance: number };
  recent_transactions: any[];
}

export function getDashboardData(currency: string): DashboardData {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  // Net worth (cumulative all time)
  const nwRow = db.getFirstSync<{ net: number }>(
    `SELECT SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE -amount_in_base END) AS net
     FROM transactions`
  );

  // Monthly totals
  const monthlyRows = db.getAllSync<{ type: string; total: number }>(
    `SELECT type, SUM(amount_in_base) AS total FROM transactions
     WHERE date >= ? AND date <= ? GROUP BY type`,
    [startDate, endDate]
  );
  const monthly = { income: 0, expense: 0, balance: 0 };
  monthlyRows.forEach(r => { (monthly as any)[r.type] = r.total ?? 0; });
  monthly.balance = monthly.income - monthly.expense;

  // Recent transactions (last 5)
  const recent = db.getAllSync<any>(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC, t.created_at DESC LIMIT 5`
  );

  return {
    net_worth: nwRow?.net ?? 0,
    monthly,
    recent_transactions: recent,
  };
}

export function getMonthlySummary(months: number = 6): MonthlyPoint[] {
  const rows = db.getAllSync<{ month: string; type: string; total: number }>(
    `SELECT strftime('%Y-%m', date) AS month, type, SUM(amount_in_base) AS total
     FROM transactions
     WHERE date >= date('now', ?)
     GROUP BY month, type
     ORDER BY month ASC`,
    [`-${months} months`]
  );

  const map: Record<string, MonthlyPoint> = {};
  rows.forEach(r => {
    if (!map[r.month]) map[r.month] = { month: r.month, income: 0, expense: 0 };
    (map[r.month] as any)[r.type] = r.total ?? 0;
  });
  return Object.values(map);
}

export function getCategoryBreakdown(month: number, year: number): CategoryBreakdown[] {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  return db.getAllSync<CategoryBreakdown>(
    `SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount_in_base), 0) AS total
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id AND t.date >= ? AND t.date <= ? AND t.type = 'expense'
     WHERE c.type = 'expense'
     GROUP BY c.id
     HAVING total > 0
     ORDER BY total DESC`,
    [startDate, endDate]
  );
}

export function getNetWorthHistory(months: number = 12): NetWorthPoint[] {
  const rows = db.getAllSync<{ month: string; net: number }>(
    `SELECT strftime('%Y-%m', date) AS month,
       SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE -amount_in_base END) AS net
     FROM transactions
     WHERE date >= date('now', ?)
     GROUP BY month
     ORDER BY month ASC`,
    [`-${months} months`]
  );

  let running = 0;
  return rows.map(r => {
    running += r.net ?? 0;
    return { month: r.month, net_change: r.net ?? 0, cumulative: Math.round(running * 100) / 100 };
  });
}
