const Restaurant = require('../models/Restaurant');

/**
 * Récupère tous les restaurants avec filtres optionnels
 * Filtres : search, city, category, minRating
 */
exports.getAllRestaurants = async (req, res) => {
    try {
        const { search, city, category, minRating } = req.query;

        let query = { isActive: true };

        // Filtre par recherche (nom, type de cuisine, description)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { cuisineType: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Filtre par ville
        if (city && city !== 'all') {
            query.city = city;
        }

        // Filtre par catégorie
        if (category && category !== 'all') {
            query.category = category;
        }

        // Filtre par note minimale
        if (minRating) {
            query.rating = { $gte: parseFloat(minRating) };
        }

        const restaurants = await Restaurant.find(query)
            .sort({ rating: -1, reviewCount: -1 })
            .select('-menuItems');

        res.json({
            success: true,
            count: restaurants.length,
            restaurants
        });

    } catch (error) {
        console.error('Error in getAllRestaurants:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des restaurants',
            error: error.message
        });
    }
};

/**
 * Récupère les restaurants vedettes/populaires
 */
exports.getFeaturedRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find({
            isActive: true,
            $or: [
                { isFeatured: true },
                { isPopular: true },
                { rating: { $gte: 4.5 } }
            ]
        })
        .sort({ rating: -1 })
        .limit(6)
        .select('-menuItems');

        res.json({
            success: true,
            count: restaurants.length,
            restaurants
        });

    } catch (error) {
        console.error('Error in getFeaturedRestaurants:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des restaurants vedettes',
            error: error.message
        });
    }
};

/**
 * Récupère un restaurant par ID avec son menu complet
 */
exports.getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params;

        const restaurant = await Restaurant.findById(id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        if (!restaurant.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Ce restaurant n\'est plus actif'
            });
        }

        res.json({
            success: true,
            restaurant
        });

    } catch (error) {
        console.error('Error in getRestaurantById:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du restaurant',
            error: error.message
        });
    }
};

/**
 * Recherche de restaurants par texte
 */
exports.searchRestaurants = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.json({
                success: true,
                count: 0,
                restaurants: []
            });
        }

        const restaurants = await Restaurant.find({
            isActive: true,
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { cuisineType: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } }
            ]
        })
        .sort({ rating: -1 })
        .select('-menuItems');

        res.json({
            success: true,
            count: restaurants.length,
            restaurants
        });

    } catch (error) {
        console.error('Error in searchRestaurants:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche',
            error: error.message
        });
    }
};

/**
 * Récupère les restaurants par catégorie
 */
exports.getRestaurantsByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        const restaurants = await Restaurant.find({
            isActive: true,
            category: category
        })
        .sort({ rating: -1 })
        .select('-menuItems');

        res.json({
            success: true,
            category,
            count: restaurants.length,
            restaurants
        });

    } catch (error) {
        console.error('Error in getRestaurantsByCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des restaurants par catégorie',
            error: error.message
        });
    }
};

/**
 * Récupère le menu d'un restaurant
 */
exports.getRestaurantMenu = async (req, res) => {
    try {
        const { id } = req.params;

        const restaurant = await Restaurant.findById(id)
            .select('name cuisineType menuItems');

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        res.json({
            success: true,
            restaurantName: restaurant.name,
            cuisineType: restaurant.cuisineType,
            menuItems: restaurant.menuItems || []
        });

    } catch (error) {
        console.error('Error in getRestaurantMenu:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du menu',
            error: error.message
        });
    }
};

/**
 * Récupère les villes disponibles
 */
exports.getAvailableCities = async (req, res) => {
    try {
        const cities = await Restaurant.distinct('city', { isActive: true });

        res.json({
            success: true,
            cities: cities.sort()
        });

    } catch (error) {
        console.error('Error in getAvailableCities:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des villes',
            error: error.message
        });
    }
};

/**
 * Récupère les statistiques par catégorie
 */
exports.getCategoryStats = async (req, res) => {
    try {
        const stats = await Restaurant.aggregate([
            { $match: { isActive: true } },
            { $group: {
                _id: '$category',
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error in getCategoryStats:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: error.message
        });
    }
};
