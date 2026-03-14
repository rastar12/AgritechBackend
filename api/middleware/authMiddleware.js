import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains id and role
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const isFarmer = (req, res, next) => {
  if (req.user.role !== 'Farmer') {
    return res.status(403).json({ message: 'Access denied. Farmers only.' });
  }
  next();
};

export default { verifyToken, isFarmer };
