import db from '../database';
import { generateUUID } from '../../utils/uuid';

export interface SavingsGoal {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  icon: string;
  color: string;
  created_at: string;
}

export function getGoals(): SavingsGoal[] {
  return db.getAllSync<SavingsGoal>(`SELECT * FROM savings_goals ORDER BY created_at DESC`);
}

export function getGoalById(id: string): SavingsGoal | null {
  return db.getFirstSync<SavingsGoal>(`SELECT * FROM savings_goals WHERE id = ?`, [id]) ?? null;
}

export function createGoal(data: Omit<SavingsGoal, 'id' | 'current_amount' | 'created_at'>): SavingsGoal {
  const id = generateUUID();
  db.runSync(
    `INSERT INTO savings_goals (id, name, description, target_amount, currency, target_date, icon, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.description ?? null, data.target_amount, data.currency, data.target_date ?? null, data.icon, data.color]
  );
  return getGoalById(id)!;
}

export function updateGoal(id: string, data: Partial<Omit<SavingsGoal, 'id' | 'created_at'>>): void {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  db.runSync(`UPDATE savings_goals SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
}

export function addContribution(id: string, amount: number): SavingsGoal | null {
  db.runSync(
    `UPDATE savings_goals
     SET current_amount = MIN(current_amount + ?, target_amount)
     WHERE id = ?`,
    [amount, id]
  );
  return getGoalById(id);
}

export function deleteGoal(id: string): void {
  db.runSync(`DELETE FROM savings_goals WHERE id = ?`, [id]);
}
