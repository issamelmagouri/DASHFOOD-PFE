/**
 * ====================================
 * DASHPOINTS CONTROLLER
 * Gestion du programme de fidélité DashFood
 * ====================================
 */

const User = require('../models/User');

 
exports.getUserDashPoints = async (req, res) => {
    try {
        // L'utilisateur connecté est disponible via req.user (ajouté par authMiddleware)
        const userId = req.user.id;

        // Récupérer l'utilisateur avec toutes ses données
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier que c'est bien un client
        if (user.role !== 'client') {
            return res.status(403).json({
                success: false,
                message: 'Cette fonctionnalité est réservée aux clients'
            });
        }

        // ===== CALCUL DU NIVEAU DYNAMIQUE BASÉ SUR LES POINTS =====
        // IMPORTANT : Le niveau est calculé en temps réel depuis totalPointsEarned
        // et non pas depuis user.loyaltyLevel qui peut être obsolète
        const calculatedLevel = calculateLevelFromPoints(user.totalPointsEarned || 0);

        // ===== CALCUL DE LA PROGRESSION VERS LE NIVEAU SUIVANT =====
        const progressData = calculateProgressToNextLevel(user.totalPointsEarned, calculatedLevel);

        // ===== CALCUL DES STATISTIQUES =====
        // TODO: Ajouter la logique pour récupérer le nombre de commandes et le montant total
        // depuis le modèle Order (à implémenter plus tard)
        const stats = {
            totalOrders: 0, // Nombre de commandes effectuées
            totalSpent: 0   // Montant total dépensé en MAD
        };

        // ===== CONSTRUCTION DE LA RÉPONSE =====
        const responseData = {
            // Informations utilisateur
            fullName: user.fullName,
            email: user.email,
            createdAt: user.createdAt,

            // Points et niveau (NIVEAU CALCULÉ DYNAMIQUEMENT)
            dashPoints: user.dashPoints || 0,
            totalPointsEarned: user.totalPointsEarned || 0,
            loyaltyLevel: calculatedLevel, // ✅ Niveau calculé en temps réel

            // Progression
            progressToNextLevel: progressData.percentage,
            nextLevelText: progressData.text,
            pointsNeededForNextLevel: progressData.pointsNeeded,

            // Historique
            pointsHistory: user.pointsHistory || [],

            // Statistiques
            totalOrders: stats.totalOrders,
            totalSpent: stats.totalSpent
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Erreur getUserDashPoints:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des DashPoints'
        });
    }
};


exports.redeemDashPoints = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pointsCost, rewardDescription } = req.body;

        // ===== VALIDATION =====
        if (!pointsCost || !rewardDescription) {
            return res.status(400).json({
                success: false,
                message: 'Le coût en points et la description sont requis'
            });
        }

        if (pointsCost <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Le coût doit être supérieur à 0'
            });
        }

        // ===== RÉCUPÉRER L'UTILISATEUR =====
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier que c'est un client
        if (user.role !== 'client') {
            return res.status(403).json({
                success: false,
                message: 'Cette fonctionnalité est réservée aux clients'
            });
        }

        // ===== VÉRIFIER LES POINTS DISPONIBLES =====
        if (user.dashPoints < pointsCost) {
            return res.status(400).json({
                success: false,
                message: `Vous n'avez pas assez de points. Disponibles: ${user.dashPoints}, Requis: ${pointsCost}`
            });
        }

        // ===== ÉCHANGER LES POINTS =====
        try {
            user.redeemDashPoints(pointsCost, rewardDescription);

            // Sauvegarder les modifications
            await user.save();

            // ===== RÉPONSE SUCCÈS =====
            res.status(200).json({
                success: true,
                message: 'Récompense échangée avec succès',
                data: {
                    remainingPoints: user.dashPoints,
                    rewardDescription: rewardDescription
                }
            });

        } catch (redeemError) {
            // Erreur lors de l'échange (ex: points insuffisants détecté par la méthode)
            return res.status(400).json({
                success: false,
                message: redeemError.message
            });
        }

    } catch (error) {
        console.error('Erreur redeemDashPoints:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'échange des points'
        });
    }
};

/**
 * ====================================
 * FONCTIONS UTILITAIRES
 * ====================================
 */


function calculateLevelFromPoints(totalPointsEarned) {
    if (totalPointsEarned >= 15000) {
        return 'Platinum';
    } else if (totalPointsEarned >= 6000) {
        return 'Gold';
    } else if (totalPointsEarned >= 2000) {
        return 'Silver';
    } else {
        return 'Bronze';
    }
}


function calculateProgressToNextLevel(totalPointsEarned, currentLevel) {
    // Définition des seuils de niveaux
    const levels = {
        'Bronze': { min: 0, max: 1999, next: 'Silver', nextThreshold: 2000 },
        'Silver': { min: 2000, max: 5999, next: 'Gold', nextThreshold: 6000 },
        'Gold': { min: 6000, max: 14999, next: 'Platinum', nextThreshold: 15000 },
        'Platinum': { min: 15000, max: Infinity, next: null, nextThreshold: null }
    };

    const levelInfo = levels[currentLevel];

    // Si Platinum (niveau maximum), progression = 100%
    if (currentLevel === 'Platinum' || !levelInfo.next) {
        return {
            percentage: 100,
            text: 'Niveau maximum atteint',
            pointsNeeded: 0
        };
    }

    // Calcul de la progression
    const pointsInCurrentLevel = totalPointsEarned - levelInfo.min;
    const pointsNeededForLevel = levelInfo.nextThreshold - levelInfo.min;
    const percentage = Math.floor((pointsInCurrentLevel / pointsNeededForLevel) * 100);

    // Points restants pour atteindre le niveau suivant
    const pointsNeeded = levelInfo.nextThreshold - totalPointsEarned;

    return {
        percentage: Math.min(percentage, 100),
        text: `Prochain niveau : ${levelInfo.next}`,
        pointsNeeded: pointsNeeded
    };
}


exports.addPointsForOrder = async (userId, amount, orderId) => {
    try {
        const user = await User.findById(userId);

        if (!user || user.role !== 'client') {
            console.error('Utilisateur non trouvé ou n\'est pas un client');
            return;
        }

        // Règle : 1 MAD dépensé = 1 DashPoint
        const points = Math.floor(amount);

        // Ajouter les points avec la méthode du modèle
        user.addDashPoints(
            points,
            `Commande de ${amount} MAD`,
            orderId
        );

        // Sauvegarder
        await user.save();

        console.log(`✅ ${points} DashPoints ajoutés pour l'utilisateur ${userId}`);

    } catch (error) {
        console.error('Erreur lors de l\'ajout de points:', error);
    }
};
