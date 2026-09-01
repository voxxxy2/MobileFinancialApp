import db from '../database';
import { generateUUID } from '../../utils/uuid';

export interface Investment {
  id: string;
  ticker: string;
  name: string;
  asset_type: 'stock' | 'crypto' | 'etf' | 'other';
  quantity: number;
  buy_price: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

export function getInvestments(): Investment[] {
  return db.getAllSync<Investment>(`SELECT * FROM investments ORDER BY asset_type, name`);
}

export function getInvestmentById(id: string): Investment | null {
  return db.getFirstSync<Investment>(`SELECT * FROM investments WHERE id = ?`, [id]) ?? null;
}

export function createInvestment(data: Omit<Investment, 'id' | 'created_at'>): Investment {
  const id = generateUUID();
  db.runSync(
    `INSERT INTO investments (id, ticker, name, asset_type, quantity, buy_price, currency, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.ticker.toUpperCase(), data.name, data.asset_type, data.quantity, data.buy_price, data.currency, data.notes ?? null]
  );
  return getInvestmentById(id)!;
}

export function updateInvestment(id: string, data: Partial<Omit<Investment, 'id' | 'created_at'>>): void {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  db.runSync(`UPDATE investments SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
}

export function deleteInvestment(id: string): void {
  db.runSync(`DELETE FROM investments WHERE id = ?`, [id]);
}

export function getTotalInvested(): number {
  const row = db.getFirstSync<{ total: number }>(
    `SELECT SUM(quantity * buy_price) AS total FROM investments`
  );
  return row?.total ?? 0;
}
