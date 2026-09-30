const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'legalmetriscan.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'inspector',
    badge_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    device_info TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Pre-seed default official inspector account for hackathon evaluation/demo
try {
  const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
  const existing = checkStmt.get('inspector@legalmetri.gov.in');
  if (!existing) {
    const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, badge_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      'usr_official_inspector_01',
      'Officer R. Sharma',
      'inspector@legalmetri.gov.in',
      defaultPasswordHash,
      'Legal Metrology Inspector',
      'LMS-GOV-2026-088',
      now,
      now
    );
    console.log('[Database] Pre-seeded official inspector account: inspector@legalmetri.gov.in');
  }
} catch (err) {
  console.warn('[Database] Seeding notice:', err.message);
}

module.exports = {
  db,
  findUserByEmail: (email) => {
    if (!email) return null;
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
    return stmt.get(email.trim());
  },
  findUserById: (id) => {
    if (!id) return null;
    const stmt = db.prepare('SELECT id, name, email, role, badge_id, created_at, updated_at FROM users WHERE id = ?');
    return stmt.get(id);
  },
  createUser: ({ id, name, email, passwordHash, role = 'inspector', badgeId = null }) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, badge_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name.trim(), email.trim().toLowerCase(), passwordHash, role, badgeId, now, now);
    return {
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      badgeId,
      createdAt: now,
      updatedAt: now,
    };
  }
};
