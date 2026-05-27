const User = require('../models/User');

/**
 * Soumettre une candidature pour devenir livreur
 * Un client peut soumettre une demande pour devenir livreur
 */
exports.submitDeliveryApplication = async (req, res) => {
  try {
    const { city, age, transportType, experience, availability } = req.body;
    const userId = req.user.id;

    // Validation des champs
    if (!city || !age || !transportType || !experience || !availability) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
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
        message: 'Seuls les clients peuvent devenir livreurs'
      });
    }

    // Vérifier si une demande est déjà en attente
    if (user.deliveryRequest && user.deliveryRequestStatus === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà une demande en attente'
      });
    }

    // Vérifier si l'utilisateur est déjà livreur
    if (user.role === 'livreur') {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà livreur'
      });
    }

    // Enregistrer la demande
    user.deliveryRequest = true;
    user.deliveryRequestStatus = 'pending';
    user.deliveryInfo = {
      city,
      age: parseInt(age),
      transportType,
      experience,
      availability,
      requestDate: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'Votre candidature a été envoyée avec succès'
    });

  } catch (error) {
    console.error('Error submitting delivery application:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la candidature'
    });
  }
};

/**
 * Récupérer toutes les demandes de livreur (Admin uniquement)
 */
exports.getAllDeliveryRequests = async (req, res) => {
  try {
    // Récupérer tous les utilisateurs avec une demande de livreur
    const requests = await User.find({
      deliveryRequest: true
    }).select('-password').sort({ 'deliveryInfo.requestDate': -1 });

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Error fetching delivery requests:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes'
    });
  }
};

/**
 * Accepter une demande de livreur (Admin uniquement)
 * Change le rôle de l'utilisateur en "livreur"
 */
exports.acceptDeliveryRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!user.deliveryRequest) {
      return res.status(400).json({
        success: false,
        message: 'Aucune demande trouvée pour cet utilisateur'
      });
    }

    // Accepter la demande
    user.role = 'livreur';
    user.deliveryRequestStatus = 'accepted';

    await user.save();

    res.json({
      success: true,
      message: 'Demande acceptée avec succès'
    });

  } catch (error) {
    console.error('Error accepting delivery request:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'acceptation de la demande'
    });
  }
};

/**
 * Refuser une demande de livreur (Admin uniquement)
 */
exports.rejectDeliveryRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!user.deliveryRequest) {
      return res.status(400).json({
        success: false,
        message: 'Aucune demande trouvée pour cet utilisateur'
      });
    }

    // Refuser la demande
    user.deliveryRequestStatus = 'rejected';

    await user.save();

    res.json({
      success: true,
      message: 'Demande refusée'
    });

  } catch (error) {
    console.error('Error rejecting delivery request:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du refus de la demande'
    });
  }
};
