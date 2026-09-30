const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { findUserByEmail, findUserById, createUser } = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'legalmetriscan_secure_jwt_secret_sih2026';
const TOKEN_EXPIRY = '30d'; // 30 days for mobile field persistence

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'inspector',
      badgeId: user.badge_id || user.badgeId,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth Middleware for protected API endpoints
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No valid authorization token provided.' });
  }

  const token = authHeader.substring(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }

  const user = findUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = user;
  next();
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match. Please re-enter.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An inspector account with this email is already registered. Please log in.' });
    }

    const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const badgeId = 'LMS-INSP-' + Math.floor(1000 + Math.random() * 9000);
    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser = createUser({
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'Legal Metrology Inspector',
      badgeId,
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        badgeId: newUser.badgeId,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid official credentials. Please check your email and password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid official credentials. Please check your email and password.' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        badgeId: user.badge_id,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      badgeId: req.user.badge_id,
      createdAt: req.user.created_at,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = {
  authRouter: router,
  requireAuth,
  verifyToken,
  generateToken,
};
