const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware pour vérifier le rôle de l'utilisateur
 * Vérifie que l'utilisateur a un rôle spécifique
 * @param {Array} allowedRoles - Liste des rôles autorisés
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Vérifier le token
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Accès non autorisé - Token manquant'
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Récupérer l'utilisateur
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Vérifier le rôle
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Accès interdit - Permissions insuffisantes'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
  };
};

module.exports = { checkRole };
