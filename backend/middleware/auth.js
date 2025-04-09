const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Récupérer le token du header Authorization
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    // Vérifier le token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = authMiddleware;