# 💰 FinTrack — Offline Personal Finance App

A 100% **offline, on-device personal finance app** built with **React Native + Expo (TypeScript)** and **SQLite (`expo-sqlite`)**. No servers, no cloud setup, no internet required. Your financial data stays privately on your device.

---
<img width="1280" height="709" alt="image" src="https://github.com/user-attachments/assets/21a578d0-be26-4476-b645-cd38d362b562" />
<img width="1280" height="711" alt="image" src="https://github.com/user-attachments/assets/4d9a196f-6940-42f2-ae3d-e3f2acb9e8e3" />

## 🌟 Features

| Feature | Description |
|---|---|
| 📴 100% Offline | All data stored in on-device SQLite database (`fintrack.db`) |
| 🏠 Dashboard | Total net worth, monthly income & expense overview, quick actions |
| 💸 Transactions | Record income & expenses, category picker, date picker, search/filter |
| 📊 Budgeting | Monthly spending limits per category with visual progress indicators |
| 🎯 Savings Goals | Create goals, track progress rings, add contributions |
| 📈 Portfolio | Track stock, crypto, ETF, and custom asset holdings |
| 📉 Analytics | Visual charts (Income vs Expense bar chart, category pie chart, net worth trend) |
| 💱 Multi-Currency | Support for 18+ currencies with instant base currency switching |
| 📄 CSV Export | Export transactions to CSV and share directly via Android system share |
| 🌙 Dark & Light Mode | Sleek cyberpunk/neon dark mode & clean light mode |

---

## 📁 Project Architecture

```
Financial App/
└── app/                         # React Native + Expo App (100% Offline)
    ├── App.tsx                  # SQLite database initializer & Root component
    ├── src/
    │   ├── db/
    │   │   ├── database.ts      # SQLite connection & schema initialization
    │   │   └── queries/         # Pure SQLite CRUD queries
    │   │       ├── transactions.ts
    │   │       ├── categories.ts
    │   │       ├── budgets.ts
    │   │       ├── goals.ts
    │   │       ├── investments.ts
    │   │       ├── analytics.ts
    │   │       └── settings.ts
    │   ├── store/
    │   │   ├── settingsStore.ts # Preferences (currency, theme) backed by SQLite
    │   │   └── themeStore.ts
    │   ├── theme/
    │   │   └── tokens.ts        # Typography, spacing, colors
    │   ├── navigation/
    │   │   └── AppNavigator.tsx # Bottom tabs navigation (5 tabs + screens)
    │   └── screens/
    │       ├── dashboard/       # DashboardScreen
    │       ├── transactions/    # TransactionsScreen
    │       ├── budget/          # BudgetScreen
    │       ├── goals/           # GoalsScreen
    │       ├── investments/     # InvestmentsScreen
    │       ├── analytics/       # AnalyticsScreen
    │       └── settings/        # SettingsScreen (CSV export, theme, currency)
    └── package.json
```

---

## 🚀 How to Run on Android

### Option A: Physical Android Phone (Expo Go)
1. Install **Expo Go** from Google Play Store.
2. In your terminal, run:
   ```bash
   cd app
   npx expo start
   ```
3. Scan the QR code shown in terminal using the Expo Go app.

### Option B: Android Emulator
1. Start your Android Emulator in Android Studio.
2. Run:
   ```bash
   cd app
   npx expo start --android
   ```

---

## 🪟 How to Run on Windows (Web Preview)

You can also run and test the app in your desktop browser:
```bash
cd app
npx expo start --web
```
Press `w` in the terminal to open the app at `http://localhost:8081`.

---

## 🗄️ SQLite Database Schema

The SQLite database is initialized automatically on first launch at `fintrack.db`:

- `settings`: Key-value store for app configuration (base currency, theme)
- `categories`: 12 default pre-seeded categories with custom colors & icons
- `transactions`: Income/expense records with amounts, dates, category references
- `savings_goals`: Goal tracking with current/target amounts and dates
- `investments`: Portfolio asset holdings, buy prices, and quantities
