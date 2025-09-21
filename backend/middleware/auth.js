import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const [, token] = bearer.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your_default_jwt_secret');
    req.user = user;
    next();
  } catch (e) {
    console.error(e);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
