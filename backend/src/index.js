'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

const accountsRouter = require('./routes/accounts');
const categoriesRouter = require('./routes/categories');
const budgetsRouter = require('./routes/budgets');
const transactionsRouter = require('./routes/transactions');
const reportsRouter = require('./routes/reports');
const reconciliationsRouter = require('./routes/reconciliations');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize database on startup (creates schema + seeds data)
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/accounts', accountsRouter);
app.use('/api', categoriesRouter);         // handles /api/category-groups and /api/categories
app.use('/api/budget', budgetsRouter);
app.use('/api', transactionsRouter);        // handles /api/accounts/:id/transactions and /api/transactions
app.use('/api/reports', reportsRouter);
app.use('/api/reconciliations', reconciliationsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  // Server started
  process.stdout.write(`Zero-Based Budget API running on port ${PORT}\n`);
});

module.exports = app;
