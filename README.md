# Zero-Based Budget

A full-featured zero-based budgeting web app inspired by YNAB (You Need A Budget).

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Zustand + Chart.js
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Monorepo:** npm workspaces

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
# Start both backend (port 3001) and frontend (port 5173) concurrently
npm run dev
```

Or individually:

```bash
# Backend only
npm run dev --workspace=backend

# Frontend only
npm run dev --workspace=frontend
```

### API

The backend API runs on **port 3001**. In development, the Vite proxy forwards `/api/*` requests to the backend automatically.

**Health check:**
```
GET http://localhost:3001/api/health
```

## API Endpoints

### Accounts
- `GET /api/accounts` — List all accounts
- `POST /api/accounts` — Create account
- `PUT /api/accounts/:id` — Update account
- `DELETE /api/accounts/:id` — Close account

### Categories
- `GET /api/category-groups` — List groups with categories
- `POST /api/category-groups` — Create group
- `PUT /api/category-groups/:id` — Update group
- `DELETE /api/category-groups/:id` — Delete group
- `POST /api/categories` — Create category
- `PUT /api/categories/:id` — Update category
- `DELETE /api/categories/:id` — Delete category
- `PUT /api/categories/reorder` — Batch reorder

### Budget
- `GET /api/budget/:month` — Full budget for a month (YYYY-MM)
- `PUT /api/budget/:month/:categoryId` — Set assigned amount

### Transactions
- `GET /api/accounts/:id/transactions` — List transactions (paginated)
- `POST /api/transactions` — Create transaction or transfer
- `PUT /api/transactions/:id` — Update transaction
- `DELETE /api/transactions/:id` — Delete transaction
- `PUT /api/transactions/:id/clear` — Toggle cleared status

### Reports
- `GET /api/reports/spending-by-category?start=YYYY-MM&end=YYYY-MM`
- `GET /api/reports/income-vs-expense?months=12`
- `GET /api/reports/net-worth?months=12`
- `GET /api/reports/age-of-money`

### Reconciliations
- `POST /api/reconciliations` — Create reconciliation record

## Database

SQLite database stored at `backend/budget.db`. Created automatically on first run with default category groups:

- **Fixed Expenses:** Rent/Mortgage, Electric, Water, Internet, Phone, Insurance
- **Variable Spending:** Groceries, Dining Out, Gas, Entertainment, Clothing, Personal Care
- **Savings Goals:** Emergency Fund, Vacation, New Car, Home Repair

All monetary values stored as integer cents (e.g., $12.50 = 1250).

## Architecture

```
zero-based-budget/
├── backend/
│   └── src/
│       ├── db/           # Schema, seed, singleton
│       ├── routes/       # Express route handlers
│       ├── middleware/   # Error handler
│       └── index.js      # Express entry point (port 3001)
└── frontend/
    └── src/              # React 18 + Vite app (port 5173)
```
