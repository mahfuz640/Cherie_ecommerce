import jwt from 'jsonwebtoken';
export const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try { req.admin = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Admin login required.' }); }
};
