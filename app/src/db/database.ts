import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export interface DatabaseInterface {
  execSync(sql: string): void;
  runSync(sql: string, ...params: any[]): any;
  getAllSync<T = any>(sql: string, ...params: any[]): T[];
  getFirstSync<T = any>(sql: string, ...params: any[]): T | null;
  prepareSync(sql: string): any;
}

let db: DatabaseInterface;

if (Platform.OS !== 'web') {
  // Native Android / iOS SQLite
  db = SQLite.openDatabaseSync('fintrack.db');
} else {
  // Web fallback using in-memory / local storage simulation for Web Preview
  // (Prevents SharedArrayBuffer missing errors on standard web browsers)
  try {
    if (typeof SharedArrayBuffer !== 'undefined') {
      db = SQLite.openDatabaseSync('fintrack.db');
    } else {
      throw new Error('SharedArrayBuffer not available on standard web');
    }
  } catch {
    // Lightweight Web mock so web preview works without crashing
    const webStorageKey = 'fintrack_web_db';
    let mockStore: Record<string, any[]> = {
      settings: [
        { key: 'base_currency', value: 'USD' },
        { key: 'theme', value: 'dark' },
      ],
      categories: [],
      transactions: [],
      savings_goals: [],
      investments: [],
    };

    try {
      const saved = localStorage.getItem(webStorageKey);
      if (saved) mockStore = JSON.parse(saved);
    } catch {}

    const saveWeb = () => {
      try {
        localStorage.setItem(webStorageKey, JSON.stringify(mockStore));
      } catch {}
    };

    db = {
      execSync: (sql: string) => {
        saveWeb();
      },
      runSync: (sql: string, params: any[] = []) => {
        if (sql.includes('INSERT INTO transactions')) {
          const [id, type, amount, currency, amount_in_base, category_id, notes, date] = params;
          mockStore.transactions.unshift({ id, type, amount, currency, amount_in_base, category_id, notes, date, created_at: new Date().toISOString() });
        } else if (sql.includes('UPDATE transactions SET')) {
          const id = params[params.length - 1];
          const item = mockStore.transactions.find(t => t.id === id);
          if (item) Object.assign(item, { amount: params[1], date: params[6], notes: params[5], category_id: params[4] });
        } else if (sql.includes('DELETE FROM transactions WHERE id = ?')) {
          mockStore.transactions = mockStore.transactions.filter(t => t.id !== params[0]);
        } else if (sql.includes('DELETE FROM transactions')) {
          mockStore.transactions = [];
        } else if (sql.includes('INSERT INTO savings_goals')) {
          const [id, name, description, target_amount, currency, target_date, icon, color] = params;
          mockStore.savings_goals.unshift({ id, name, description, target_amount, current_amount: 0, currency, target_date, icon, color, created_at: new Date().toISOString() });
        } else if (sql.includes('UPDATE savings_goals SET current_amount = MIN(current_amount + ?')) {
          const [amt, id] = params;
          const g = mockStore.savings_goals.find(x => x.id === id);
          if (g) g.current_amount = Math.min((g.current_amount || 0) + amt, g.target_amount);
        } else if (sql.includes('DELETE FROM savings_goals WHERE id = ?')) {
          mockStore.savings_goals = mockStore.savings_goals.filter(g => g.id !== params[0]);
        } else if (sql.includes('DELETE FROM savings_goals')) {
          mockStore.savings_goals = [];
        } else if (sql.includes('INSERT INTO investments')) {
          const [id, ticker, name, asset_type, quantity, buy_price, currency, notes] = params;
          mockStore.investments.unshift({ id, ticker, name, asset_type, quantity, buy_price, currency, notes, created_at: new Date().toISOString() });
        } else if (sql.includes('DELETE FROM investments WHERE id = ?')) {
          mockStore.investments = mockStore.investments.filter(i => i.id !== params[0]);
        } else if (sql.includes('DELETE FROM investments')) {
          mockStore.investments = [];
        } else if (sql.includes('settings')) {
          const [k, v] = params;
          const s = mockStore.settings.find(x => x.key === k);
          if (s) s.value = v; else mockStore.settings.push({ key: k, value: v });
        }
        saveWeb();
        return { changes: 1, lastInsertRowId: 1 };
      },
      getAllSync: (sql: string, params: any[] = []) => {
        if (sql.includes('FROM transactions')) {
          return mockStore.transactions.map(t => {
            const cat = mockStore.categories.find(c => c.id === t.category_id);
            return { ...t, category_name: cat?.name, category_icon: cat?.icon, category_color: cat?.color };
          });
        }
        if (sql.includes('FROM categories')) return mockStore.categories;
        if (sql.includes('FROM savings_goals')) return mockStore.savings_goals;
        if (sql.includes('FROM investments')) return mockStore.investments;
        if (sql.includes('FROM settings')) return mockStore.settings;
        return [];
      },
      getFirstSync: (sql: string, params: any[] = []) => {
        if (sql.includes('FROM settings WHERE key = ?')) {
          return mockStore.settings.find(s => s.key === params[0]) || null;
        }
        if (sql.includes('FROM transactions WHERE t.id = ?') || sql.includes('FROM transactions WHERE id = ?')) {
          const t = mockStore.transactions.find(x => x.id === params[0]);
          if (!t) return null;
          const cat = mockStore.categories.find(c => c.id === t.category_id);
          return { ...t, category_name: cat?.name, category_icon: cat?.icon, category_color: cat?.color };
        }
        if (sql.includes('FROM savings_goals WHERE id = ?')) {
          return mockStore.savings_goals.find(g => g.id === params[0]) || null;
        }
        if (sql.includes('FROM investments WHERE id = ?')) {
          return mockStore.investments.find(i => i.id === params[0]) || null;
        }
        if (sql.includes('SUM(CASE WHEN type = \'income\' THEN amount_in_base')) {
          const income = mockStore.transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount_in_base || t.amount), 0);
          const expense = mockStore.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount_in_base || t.amount), 0);
          return { net: income - expense };
        }
        if (sql.includes('SUM(quantity * buy_price)')) {
          const total = mockStore.investments.reduce((s, i) => s + (i.quantity * i.buy_price), 0);
          return { total };
        }
        if (sql.includes('COUNT(*)')) return { cnt: 0 };
        return null;
      },
      prepareSync: (sql: string) => ({
        executeSync: (params: any[]) => {
          if (sql.includes('categories')) {
            const [id, name, icon, color, type, monthly_limit] = params;
            if (!mockStore.categories.find(c => c.id === id)) {
              mockStore.categories.push({ id, name, icon, color, type, monthly_limit });
            }
          }
          saveWeb();
        },
        finalizeSync: () => {},
      }),
    };
  }
}

/**
 * Initialize the database: create all tables + seed default data on first launch.
 * Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export function initDatabase(): void {
  try {
    db.execSync(`PRAGMA journal_mode = WAL;`);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        icon          TEXT DEFAULT 'circle',
        color         TEXT DEFAULT '#7C3AED',
        type          TEXT NOT NULL CHECK(type IN ('income','expense')),
        monthly_limit REAL,
        created_at    TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id              TEXT PRIMARY KEY,
        type            TEXT NOT NULL CHECK(type IN ('income','expense')),
        amount          REAL NOT NULL CHECK(amount > 0),
        currency        TEXT NOT NULL DEFAULT 'USD',
        amount_in_base  REAL,
        category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
        notes           TEXT,
        date            TEXT NOT NULL,
        created_at      TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS savings_goals (
        id             TEXT PRIMARY KEY,
        name           TEXT NOT NULL,
        description    TEXT,
        target_amount  REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        currency       TEXT NOT NULL DEFAULT 'USD',
        target_date    TEXT,
        icon           TEXT DEFAULT 'target',
        color          TEXT DEFAULT '#10B981',
        created_at     TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS investments (
        id         TEXT PRIMARY KEY,
        ticker     TEXT NOT NULL,
        name       TEXT NOT NULL,
        asset_type TEXT NOT NULL CHECK(asset_type IN ('stock','crypto','etf','other')),
        quantity   REAL NOT NULL,
        buy_price  REAL NOT NULL,
        currency   TEXT NOT NULL DEFAULT 'USD',
        notes      TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Seed default settings if first launch
    const hasSettings = db.getFirstSync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM settings WHERE key = 'base_currency'`
    );
    if (!hasSettings || hasSettings.cnt === 0) {
      db.execSync(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('base_currency', 'USD');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');
      `);
      seedDefaultCategories();
    }
  } catch (err) {
    console.warn('DB Init notice:', err);
    seedDefaultCategories();
  }
}

function seedDefaultCategories(): void {
  const defaults = [
    { id: 'cat-salary',    name: 'Salary',         icon: 'briefcase',      color: '#10B981', type: 'income',  limit: null },
    { id: 'cat-freelance', name: 'Freelance',       icon: 'laptop',         color: '#34D399', type: 'income',  limit: null },
    { id: 'cat-invest-in', name: 'Investment',      icon: 'trending-up',    color: '#6EE7B7', type: 'income',  limit: null },
    { id: 'cat-food',      name: 'Food & Dining',   icon: 'coffee',         color: '#F59E0B', type: 'expense', limit: 500  },
    { id: 'cat-transport', name: 'Transport',       icon: 'car',            color: '#3B82F6', type: 'expense', limit: 200  },
    { id: 'cat-housing',   name: 'Housing',         icon: 'home',           color: '#8B5CF6', type: 'expense', limit: 1500 },
    { id: 'cat-entertain', name: 'Entertainment',   icon: 'film',           color: '#EC4899', type: 'expense', limit: 200  },
    { id: 'cat-health',    name: 'Health',          icon: 'heart',          color: '#F43F5E', type: 'expense', limit: 300  },
    { id: 'cat-shopping',  name: 'Shopping',        icon: 'shopping-bag',   color: '#F97316', type: 'expense', limit: 400  },
    { id: 'cat-education', name: 'Education',       icon: 'book',           color: '#14B8A6', type: 'expense', limit: 300  },
    { id: 'cat-utilities', name: 'Utilities',       icon: 'zap',            color: '#A78BFA', type: 'expense', limit: 200  },
    { id: 'cat-other',     name: 'Other',           icon: 'more-horizontal',color: '#9CA3AF', type: 'expense', limit: null },
  ];

  try {
    const stmt = db.prepareSync(
      `INSERT OR IGNORE INTO categories (id, name, icon, color, type, monthly_limit) VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const c of defaults) {
      stmt.executeSync([c.id, c.name, c.icon, c.color, c.type, c.limit]);
    }
    stmt.finalizeSync();
  } catch (err) {
    console.warn('Seed categories notice:', err);
  }
}

export default db;
