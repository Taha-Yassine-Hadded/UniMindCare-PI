// middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('authMiddleware - Token reçu:', token);
    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log('authMiddleware - Token décodé:', decodedToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('authMiddleware - Erreur:', error.message);
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = authMiddleware;