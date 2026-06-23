/**
 * Admin Dashboard Controller - DashFood
 * Gestion complète de l'espace administrateur
 */

const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

// ==================== DASHBOARD ====================

// Récupère les statistiques principales pour le dashboard admin
exports.getDashboardStats = async (req, res) => {
    try {
        // Compte total des utilisateurs
        const totalUsers = await User.countDocuments();
        const totalClients = await User.countDocuments({ role: 'client' });
        const totalLivreurs = await User.countDocuments({ role: 'livreur' });
        const totalRestaurants = await User.countDocuments({ role: 'restaurant' });

        // Commandes aujourd'hui
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ordersToday = await Order.countDocuments({
            createdAt: { $gte: today }
        });

        // Commandes par statut
        const ordersByStatus = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Candidatures en attente
        const pendingDeliveryRequests = await User.countDocuments({
            deliveryRequest: true,
            deliveryRequestStatus: 'pending'
        });

        const pendingRestaurantRequests = await User.countDocuments({
            restaurantRequest: true,
            restaurantRequestStatus: 'pending'
        });

        // Activité récente (dernières 10 actions)
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('fullName email role createdAt');

        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'fullName')
            .select('orderId totalAmount status createdAt');

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalClients,
                totalLivreurs,
                totalRestaurants,
                ordersToday,
                ordersByStatus,
                pendingDeliveryRequests,
                pendingRestaurantRequests
            },
            recentActivity: {
                users: recentUsers,
                orders: recentOrders
            }
        });

    } catch (error) {
        console.error('Erreur dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des statistiques'
        });
    }
};

// ==================== USERS ====================

// Récupère tous les utilisateurs
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            users
        });

    } catch (error) {
        console.error('Erreur get users:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des utilisateurs'
        });
    }
};

// Récupère un utilisateur par ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Erreur get user:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Bloque un utilisateur
exports.blockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'blocked' },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Utilisateur bloqué avec succès',
            user
        });

    } catch (error) {
        console.error('Erreur block user:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Débloque un utilisateur
exports.unblockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Utilisateur débloqué avec succès',
            user
        });

    } catch (error) {
        console.error('Erreur unblock user:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Supprime un utilisateur
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Utilisateur supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur delete user:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// ==================== RESTAURANTS ====================

// Récupère toutes les candidatures restaurant
exports.getRestaurantRequests = async (req, res) => {
    try {
        const requests = await User.find({
            restaurantRequest: true,
            restaurantRequestStatus: 'pending'
        }).select('fullName email phone restaurantInfo createdAt');

        res.json({
            success: true,
            requests
        });

    } catch (error) {
        console.error('Erreur get restaurant requests:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Accepte une candidature restaurant
exports.acceptRestaurantRequest = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                role: 'restaurant',
                restaurantRequestStatus: 'accepted'
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Candidature non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Candidature acceptée avec succès',
            user
        });

    } catch (error) {
        console.error('Erreur accept restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Refuse une candidature restaurant
exports.rejectRestaurantRequest = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { restaurantRequestStatus: 'rejected' },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Candidature non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Candidature refusée',
            user
        });

    } catch (error) {
        console.error('Erreur reject restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Récupère tous les restaurants partenaires
exports.getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await User.find({ role: 'restaurant' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            restaurants
        });

    } catch (error) {
        console.error('Erreur get restaurants:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Récupère un restaurant par ID
exports.getRestaurantById = async (req, res) => {
    try {
        const restaurant = await User.findById(req.params.id).select('-password');

        if (!restaurant || restaurant.role !== 'restaurant') {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        res.json({
            success: true,
            restaurant
        });

    } catch (error) {
        console.error('Erreur get restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Suspend un restaurant
exports.suspendRestaurant = async (req, res) => {
    try {
        const restaurant = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'suspended' },
            { new: true }
        ).select('-password');

        if (!restaurant || restaurant.role !== 'restaurant') {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Restaurant suspendu avec succès',
            restaurant
        });

    } catch (error) {
        console.error('Erreur suspend restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Active un restaurant
exports.activateRestaurant = async (req, res) => {
    try {
        const restaurant = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        ).select('-password');

        if (!restaurant || restaurant.role !== 'restaurant') {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Restaurant activé avec succès',
            restaurant
        });

    } catch (error) {
        console.error('Erreur activate restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Supprime un restaurant
exports.deleteRestaurant = async (req, res) => {
    try {
        const restaurant = await User.findById(req.params.id);

        if (!restaurant || restaurant.role !== 'restaurant') {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Restaurant supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur delete restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// ==================== LIVREURS ====================

// Récupère toutes les candidatures livreur
exports.getDeliveryRequests = async (req, res) => {
    try {
        const requests = await User.find({
            deliveryRequest: true,
            deliveryRequestStatus: 'pending'
        }).select('fullName email phone deliveryInfo createdAt');

        res.json({
            success: true,
            requests
        });

    } catch (error) {
        console.error('Erreur get delivery requests:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Accepte une candidature livreur
exports.acceptDeliveryRequest = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                role: 'livreur',
                deliveryRequestStatus: 'accepted'
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Candidature non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Candidature acceptée avec succès',
            user
        });

    } catch (error) {
        console.error('Erreur accept delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Refuse une candidature livreur
exports.rejectDeliveryRequest = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { deliveryRequestStatus: 'rejected' },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Candidature non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Candidature refusée',
            user
        });

    } catch (error) {
        console.error('Erreur reject delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Récupère tous les livreurs actifs
exports.getAllLivreurs = async (req, res) => {
    try {
        const livreurs = await User.find({ role: 'livreur' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            livreurs
        });

    } catch (error) {
        console.error('Erreur get livreurs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Récupère un livreur par ID
exports.getLivreurById = async (req, res) => {
    try {
        const livreur = await User.findById(req.params.id).select('-password');

        if (!livreur || livreur.role !== 'livreur') {
            return res.status(404).json({
                success: false,
                message: 'Livreur non trouvé'
            });
        }

        res.json({
            success: true,
            livreur
        });

    } catch (error) {
        console.error('Erreur get livreur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Suspend un livreur
exports.suspendLivreur = async (req, res) => {
    try {
        const livreur = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'suspended' },
            { new: true }
        ).select('-password');

        if (!livreur || livreur.role !== 'livreur') {
            return res.status(404).json({
                success: false,
                message: 'Livreur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Livreur suspendu avec succès',
            livreur
        });

    } catch (error) {
        console.error('Erreur suspend livreur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Active un livreur
exports.activateLivreur = async (req, res) => {
    try {
        const livreur = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        ).select('-password');

        if (!livreur || livreur.role !== 'livreur') {
            return res.status(404).json({
                success: false,
                message: 'Livreur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Livreur activé avec succès',
            livreur
        });

    } catch (error) {
        console.error('Erreur activate livreur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Supprime un livreur
exports.deleteLivreur = async (req, res) => {
    try {
        const livreur = await User.findById(req.params.id);

        if (!livreur || livreur.role !== 'livreur') {
            return res.status(404).json({
                success: false,
                message: 'Livreur non trouvé'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Livreur supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur delete livreur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// ==================== COMMANDES ====================

// Récupère toutes les commandes
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'fullName email')
            .populate('restaurantId', 'name')
            .populate('driverId', 'fullName')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('Erreur get orders:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Récupère une commande par ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'fullName email phone')
            .populate('restaurantId', 'name address')
            .populate('driverId', 'fullName phone');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée'
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Erreur get order:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// ==================== STATISTIQUES ====================

// Récupère les statistiques avancées
exports.getStatistics = async (req, res) => {
    try {
        // Total revenus
        const revenueStats = await Order.aggregate([
            { $match: { status: 'delivered' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueStats[0]?.total || 0;

        // Nombre total commandes
        const totalOrders = await Order.countDocuments();

        // Nombre total utilisateurs
        const totalUsers = await User.countDocuments();

        // Nombre total restaurants
        const totalRestaurants = await User.countDocuments({ role: 'restaurant' });

        // Répartition commandes par statut
        const ordersByStatus = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Top 10 restaurants performants
        const topRestaurantsRaw = await Order.aggregate([
            { $match: { status: 'delivered' } },
            {
                $group: {
                    _id: '$restaurantId',
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'restaurantData'
                }
            }
        ]);

        // Format topRestaurants
        const topRestaurants = topRestaurantsRaw.map(item => ({
            restaurantName: item.restaurantData[0]?.restaurantName || item.restaurantData[0]?.fullName || 'Restaurant inconnu',
            name: item.restaurantData[0]?.restaurantName || item.restaurantData[0]?.fullName || 'Restaurant inconnu',
            orderCount: item.orderCount,
            totalRevenue: item.totalRevenue
        }));

        // Top 10 livreurs actifs
        const topLivreursRaw = await Order.aggregate([
            { $match: { status: 'delivered', driverId: { $exists: true } } },
            {
                $group: {
                    _id: '$driverId',
                    deliveryCount: { $sum: 1 },
                    totalEarnings: { $sum: '$driverEarning' }
                }
            },
            { $sort: { totalEarnings: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'livreurData'
                }
            }
        ]);

        // Format topLivreurs
        const topLivreurs = topLivreursRaw.map(item => ({
            fullName: item.livreurData[0]?.fullName || 'Livreur inconnu',
            name: item.livreurData[0]?.fullName || 'Livreur inconnu',
            deliveryCount: item.deliveryCount,
            totalEarnings: item.totalEarnings
        }));

        res.json({
            success: true,
            stats: {
                totalRevenue,
                totalOrders,
                totalUsers,
                totalRestaurants,
                ordersByStatus,
                topRestaurants,
                topLivreurs
            }
        });

    } catch (error) {
        console.error('Erreur statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
