/**
 * Admin Middleware - DashFood
 * Verification du role administrateur
 */

/**
 * Middleware pour verifier que l'utilisateur est un admin
 */
exports.checkAdmin = (req, res, next) => {
    try {
        // L'utilisateur doit etre deja authentifie (via authMiddleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        // Verifier le role admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès réservé aux administrateurs uniquement'
            });
        }

        // L'utilisateur est admin, continuer
        next();

    } catch (error) {
        console.error('Erreur verification admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la vérification des droits'
        });
    }
};

/**
 * Middleware pour rediriger les non-admins (pour les pages HTML)
 */
exports.redirectIfNotAdmin = (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.redirect('/admin-login.html');
        }
        next();
    } catch (error) {
        console.error('Erreur redirection admin:', error);
        res.redirect('/admin-login.html');
    }
};
