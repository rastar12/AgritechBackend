import db from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  const { full_name, email, phone_number, password, role } = req.body;

  try {
    // 1. Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM USERS WHERE email = ? OR phone_number = ?',
      [email, phone_number]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email or phone number already exists' });
    }

    // 2. Get the type_id for the role
    const [roles] = await db.query('SELECT id FROM USER_TYPES WHERE role_name = ?', [role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Invalid role provided' });
    }
    const type_id = roles[0].id;

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 4. Insert user into USERS table
    const [result] = await db.query(
      'INSERT INTO USERS (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
      [type_id, full_name, email, phone_number, password_hash]
    );

    const userId = result.insertId;

    // 5. Generate JWT token
    const token = jwt.sign(
      { id: userId, role: role },
      process.env.JWT_SECRET || 'your_secret_key_here',
      { expiresIn: '24h' }
    );

    // 6. Return response (excluding password hash)
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        full_name,
        email,
        phone_number,
        role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email and join with user_types to get role
    const [users] = await db.query(
      `SELECT u.*, ut.role_name 
       FROM USERS u 
       JOIN USER_TYPES ut ON u.type_id = ut.id 
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];

    // 2. Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Update last login
    await db.query('UPDATE USERS SET last_login = NOW() WHERE id = ?', [user.id]);

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role_name },
      process.env.JWT_SECRET || 'your_secret_key_here',
      { expiresIn: '24h' }
    );

    // 5. Return user info and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
};

