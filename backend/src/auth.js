import jwt from 'jsonwebtoken';
export const requireAdmin = (req, res, next) => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    return res.status(503).json({ message: 'Admin sign-in is not configured yet. Please contact the store owner.' });
  }
  const token = req.headers.authorization?.split(' ')[1];
  try { req.admin = jwt.verify(token, secret); next(); }
  catch { res.status(401).json({ message: 'Admin login required.' }); }
};
