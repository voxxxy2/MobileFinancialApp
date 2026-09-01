import db from '../database';
import { generateUUID } from '../../utils/uuid';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  amount_in_base: number;
  category_id: string | null;
  notes: string | null;
  date: string;
  created_at: string;
  // Joined fields from categories
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function getTransactions(filters: TransactionFilters = {}): Transaction[] {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];

  if (filters.type) { conditions.push('t.type = ?'); params.push(filters.type); }
  if (filters.category_id) { conditions.push('t.category_id = ?'); params.push(filters.category_id); }
  if (filters.start_date) { conditions.push('t.date >= ?'); params.push(filters.start_date); }
  if (filters.end_date) { conditions.push('t.date <= ?'); params.push(filters.end_date); }
  if (filters.search) { conditions.push('t.notes LIKE ?'); params.push(`%${filters.search}%`); }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  return db.getAllSync<Transaction>(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

export function getTransactionById(id: string): Transaction | null {
  return db.getFirstSync<Transaction>(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.id = ?`, [id]
  ) ?? null;
}

export function createTransaction(data: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_icon' | 'category_color'>): Transaction {
  const id = generateUUID();
  const amountInBase = data.amount_in_base ?? data.amount;

  db.runSync(
    `INSERT INTO transactions (id, type, amount, currency, amount_in_base, category_id, notes, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.type, data.amount, data.currency, amountInBase, data.category_id ?? null, data.notes ?? null, data.date]
  );

  return getTransactionById(id)!;
}

export function updateTransaction(id: string, data: Partial<Omit<Transaction, 'id' | 'created_at'>>): void {
  const { category_name, category_icon, category_color, ...updateData } = data as any;
  if (Object.keys(updateData).length === 0) return;
  const fields = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updateData), id] as (string | number | null)[];
  db.runSync(`UPDATE transactions SET ${fields} WHERE id = ?`, values as any);
}

export function deleteTransaction(id: string): void {
  db.runSync(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export function countTransactions(filters: TransactionFilters = {}): number {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  if (filters.type) { conditions.push('type = ?'); params.push(filters.type); }
  if (filters.start_date) { conditions.push('date >= ?'); params.push(filters.start_date); }
  if (filters.end_date) { conditions.push('date <= ?'); params.push(filters.end_date); }
  const row = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM transactions WHERE ${conditions.join(' AND ')}`,
    params as any
  );
  return row?.cnt ?? 0;
}

/** Get all transactions as CSV string for export */
export function getTransactionsCSV(): string {
  const rows = db.getAllSync<any>(
    `SELECT t.date, t.type, t.amount, t.currency, t.amount_in_base, c.name AS category, t.notes, t.created_at
     FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC`
  );
  const header = 'date,type,amount,currency,amount_in_base,category,notes,created_at\n';
  const body = rows.map(r =>
    [r.date, r.type, r.amount, r.currency, r.amount_in_base, `"${r.category || ''}"`, `"${r.notes || ''}"`, r.created_at].join(',')
  ).join('\n');
  return header + body;
}
