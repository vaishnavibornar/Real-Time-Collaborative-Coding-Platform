const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { users } = require('../services/memoryStore');
const authMiddleware = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-it-in-production';
const JWT_EXPIRES_IN = '7d';

// POST /register - User Sign Up
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields (name, email, password) are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    let userExists = false;
    if (global.useInMemoryDb) {
      userExists = users.has(normalizedEmail);
    } else {
      const existingUser = await User.findOne({ email: normalizedEmail });
      userExists = !!existingUser;
    }

    if (userExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let newUser = null;

    if (global.useInMemoryDb) {
      const userId = crypto.randomBytes(12).toString('hex'); // Mock ObjectId
      newUser = {
        id: userId,
        _id: userId,
        name,
        email: normalizedEmail,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.set(normalizedEmail, newUser);
    } else {
      const dbUser = new User({
        name,
        email: normalizedEmail,
        password: hashedPassword
      });
      await dbUser.save();
      newUser = {
        id: dbUser._id.toString(),
        _id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
        createdAt: dbUser.createdAt
      };
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser.id, name: newUser.name, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /login - User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (global.useInMemoryDb) {
      user = users.get(normalizedEmail);
    } else {
      const dbUser = await User.findOne({ email: normalizedEmail });
      if (dbUser) {
        user = {
          id: dbUser._id.toString(),
          _id: dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          password: dbUser.password
        };
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /me - Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
