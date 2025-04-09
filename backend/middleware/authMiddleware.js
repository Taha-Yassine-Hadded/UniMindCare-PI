const jwt = require('jsonwebtoken');
const User = require('../Models/User');

// Middleware pour vérifier les tokens JWT
exports.authenticateToken = async (req, res, next) => {
  try {
    // Récupérer l'en-tête d'autorisation
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Accès non autorisé: Aucun token fourni' });
    }
    
    // Extraire le token
    const token = authHeader.split(' ')[1];
    
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Trouver l'utilisateur associé
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Accès non autorisé: Utilisateur non trouvé' });
    }
    
    // Ajouter les informations de l'utilisateur à l'objet req
    req.user = {
      userId: user._id,
      email: user.Email,
      identifiant: user.Identifiant,
      Role: user.Role || ['student'], // Valeur par défaut si le rôle n'est pas défini
      name: user.Name
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'authentification' });
  }
};

// Middleware pour vérifier le rôle d'admin
exports.isAdmin = (req, res, next) => {
  if (!req.user || !req.user.Role || !req.user.Role.includes('admin')) {
    return res.status(403).json({ message: 'Accès refusé: Droits administrateur requis' });
  }
  next();
};

// Middleware pour vérifier que l'utilisateur accède à ses propres données
exports.isSameUser = (req, res, next) => {
  const requestedId = req.params.identifiant || req.params.id;
  
  if (!req.user || (req.user.identifiant !== requestedId && !req.user.Role.includes('admin'))) {
    return res.status(403).json({ message: 'Accès refusé: Vous ne pouvez accéder qu\'à vos propres données' });
  }
  next();
};