const jwt = require('jsonwebtoken');

// Auth middleware
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
}

// Role authorization middleware
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasAccess = allowedRoles.some(role => userRoles.includes(role));
    if (!hasAccess) {
      return res.status(403).json({ message: 'Accès refusé: rôle non autorisé' });
    }
    next();
  };
}

module.exports = {
    validateToken,
    authorizeRoles
};
