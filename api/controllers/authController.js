import db from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const register = async (req, res) => {
  const { full_name, email, phone_number, password, role } = req.body;

  try {
    const [existingUsers] = await db.query(
      'SELECT id FROM USERS WHERE email = ? OR phone_number = ?',
      [email, phone_number]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email or phone number already exists' });
    }

    const [roles] = await db.query('SELECT id FROM USER_TYPES WHERE role_name = ?', [role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Invalid role provided' });
    }
    const type_id = roles[0].id;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO USERS (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
      [type_id, full_name, email, phone_number, password_hash]
    );

    const userId = result.insertId;
    const token = jwt.sign(
      { id: userId, role: role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, full_name, email, phone_number, role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
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
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await db.query('UPDATE USERS SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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

const GoogleOAuth = async (req, res) => {
  const { email, full_name, role } = req.body;

  try {
    // 1. Check if user already exists
    let [users] = await db.query(
      `SELECT u.*, ut.role_name 
       FROM USERS u 
       JOIN USER_TYPES ut ON u.type_id = ut.id 
       WHERE u.email = ?`,
      [email]
    );

    let user;
    if (users.length === 0) {
      // 2. Register new user with placeholders
      const [roles] = await db.query('SELECT id FROM USER_TYPES WHERE role_name = ?', [role || 'Buyer']);
      if (roles.length === 0) {
        return res.status(400).json({ message: 'Invalid role provided' });
      }
      const type_id = roles[0].id;

      // Placeholders to satisfy NOT NULL constraints
      const placeholder_phone = `G-${Date.now()}`; 
      const placeholder_pass = 'GOOGLE_AUTH_ACCOUNT';

      const [result] = await db.query(
        'INSERT INTO USERS (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
        [type_id, full_name, email, placeholder_phone, placeholder_pass]
      );
      
      const userId = result.insertId;
      user = { 
        id: userId, 
        full_name, 
        email, 
        phone_number: placeholder_phone, 
        role_name: role || 'Buyer' 
      };
    } else {
      user = users[0];
    }

    // 3. Update last login and generate token
    await db.query('UPDATE USERS SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Google authentication successful',
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
    console.error('Google OAuth error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

export default {
  register,
  login,
  GoogleOAuth
};
