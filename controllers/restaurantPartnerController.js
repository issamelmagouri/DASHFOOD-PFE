const User = require('../models/User');

/**
 * Soumettre une candidature pour devenir restaurant partenaire
 * Un client peut soumettre une demande pour rejoindre le réseau DashFood
 */
exports.submitRestaurantApplication = async (req, res) => {
  try {
    const { restaurantName, cuisineType, city, address, phone, email, openingHours, description } = req.body;
    const userId = req.user.id;

    // Validation des champs
    if (!restaurantName || !cuisineType || !city || !address || !phone || !email || !openingHours || !description) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    // Validation email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Adresse e-mail invalide'
      });
    }

    // Récupérer l'utilisateur
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que l'utilisateur est un client
    if (user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les clients peuvent devenir restaurants partenaires'
      });
    }

    // Vérifier si une demande est déjà en attente
    if (user.restaurantRequest && user.restaurantRequestStatus === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Votre demande est en cours d\'étude. Notre équipe vous contactera prochainement.'
      });
    }

    // Vérifier si l'utilisateur est déjà restaurant
    if (user.role === 'restaurant') {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà un restaurant partenaire'
      });
    }

    // Enregistrer la demande
    user.restaurantRequest = true;
    user.restaurantRequestStatus = 'pending';
    user.restaurantInfo = {
      restaurantName,
      cuisineType,
      city,
      address,
      phone,
      email,
      openingHours,
      description,
      requestDate: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'Votre candidature a été envoyée avec succès !'
    });

  } catch (error) {
    console.error('Error submitting restaurant application:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la candidature'
    });
  }
};

/**
 * Récupérer toutes les demandes de restaurant partenaire (Admin uniquement)
 */
exports.getAllRestaurantRequests = async (req, res) => {
  try {
    // Récupérer tous les utilisateurs avec une demande de restaurant
    const requests = await User.find({
      restaurantRequest: true
    }).select('-password').sort({ 'restaurantInfo.requestDate': -1 });

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Error fetching restaurant requests:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes'
    });
  }
};

/**
 * Accepter une demande de restaurant partenaire (Admin uniquement)
 * Change le rôle de l'utilisateur en "restaurant"
 */
exports.acceptRestaurantRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!user.restaurantRequest) {
      return res.status(400).json({
        success: false,
        message: 'Aucune demande trouvée pour cet utilisateur'
      });
    }

    // Accepter la demande
    user.role = 'restaurant';
    user.restaurantRequestStatus = 'accepted';

    await user.save();

    res.json({
      success: true,
      message: 'Demande acceptée avec succès. L\'utilisateur est maintenant un restaurant partenaire.'
    });

  } catch (error) {
    console.error('Error accepting restaurant request:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'acceptation de la demande'
    });
  }
};

/**
 * Refuser une demande de restaurant partenaire (Admin uniquement)
 */
exports.rejectRestaurantRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!user.restaurantRequest) {
      return res.status(400).json({
        success: false,
        message: 'Aucune demande trouvée pour cet utilisateur'
      });
    }

    // Refuser la demande
    user.restaurantRequestStatus = 'rejected';

    await user.save();

    res.json({
      success: true,
      message: 'Demande refusée'
    });

  } catch (error) {
    console.error('Error rejecting restaurant request:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du refus de la demande'
    });
  }
};
