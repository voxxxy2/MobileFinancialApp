import db from '../database';
import { generateUUID } from '../../utils/uuid';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  monthly_limit: number | null;
  created_at: string;
}

export function getCategories(type?: 'income' | 'expense'): Category[] {
  if (type) {
    return db.getAllSync<Category>(
      `SELECT * FROM categories WHERE type = ? ORDER BY name`, [type]
    );
  }
  return db.getAllSync<Category>(`SELECT * FROM categories ORDER BY type, name`);
}

export function getCategoryById(id: string): Category | null {
  return db.getFirstSync<Category>(`SELECT * FROM categories WHERE id = ?`, [id]) ?? null;
}

export function createCategory(data: Omit<Category, 'id' | 'created_at'>): Category {
  const id = generateUUID();
  db.runSync(
    `INSERT INTO categories (id, name, icon, color, type, monthly_limit) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.icon, data.color, data.type, data.monthly_limit ?? null]
  );
  return getCategoryById(id)!;
}

export function updateCategory(id: string, data: Partial<Omit<Category, 'id' | 'created_at'>>): void {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  db.runSync(`UPDATE categories SET ${fields} WHERE id = ?`, values);
}

export function deleteCategory(id: string): void {
  db.runSync(`DELETE FROM categories WHERE id = ?`, [id]);
}
