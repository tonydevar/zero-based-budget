'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const { createSchema } = require('./schema');
const { seedDatabase } = require('./seed');

const DB_PATH = path.join(__dirname, '..', '..', 'budget.db');

let _db = null;

/**
 * Returns the singleton better-sqlite3 database instance.
 * Creates schema and seeds data on first call.
 */
function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Enable foreign keys and WAL mode for every connection
  _db.pragma('foreign_keys = ON');
  _db.pragma('journal_mode = WAL');

  createSchema(_db);
  seedDatabase(_db);

  return _db;
}

module.exports = { getDb };
