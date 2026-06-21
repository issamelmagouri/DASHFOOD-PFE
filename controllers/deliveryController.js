const User = require('../models/User');
const Delivery = require('../models/Delivery');

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

// ========== GESTION DES LIVRAISONS ==========

/**
 * Récupère les livraisons disponibles (non assignées)
 */
exports.getAvailableDeliveries = async (req, res) => {
  try {
    // recupere toutes les livraisons disponibles
    const deliveries = await Delivery.find({
      status: 'available',
      assignedDriver: null
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      count: deliveries.length,
      deliveries
    });

  } catch (error) {
    console.error('Error fetching available deliveries:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livraisons disponibles'
    });
  }
};

/**
 * Récupère la livraison en cours du livreur connecté
 */
exports.getMyCurrentDelivery = async (req, res) => {
  try {
    const driverId = req.user.id;

    // cherche une livraison active pour ce livreur
    const delivery = await Delivery.findOne({
      assignedDriver: driverId,
      status: { $in: ['accepted', 'picked_up', 'on_the_way'] }
    });

    res.json({
      success: true,
      delivery: delivery || null
    });

  } catch (error) {
    console.error('Error fetching current delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la livraison en cours'
    });
  }
};

/**
 * Accepte une livraison disponible
 */
exports.acceptDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const driverId = req.user.id;

    // verifie si le livreur a deja une livraison en cours
    const existingDelivery = await Delivery.findOne({
      assignedDriver: driverId,
      status: { $in: ['accepted', 'picked_up', 'on_the_way'] }
    });

    if (existingDelivery) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà une livraison en cours'
      });
    }

    // recupere la livraison
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Livraison non trouvée'
      });
    }

    // verifie que la livraison est disponible
    if (delivery.status !== 'available' || delivery.assignedDriver) {
      return res.status(400).json({
        success: false,
        message: 'Cette livraison n\'est plus disponible'
      });
    }

    // assigne la livraison au livreur
    delivery.assignedDriver = driverId;
    await delivery.updateStatus('accepted');

    res.json({
      success: true,
      message: 'Livraison acceptée avec succès',
      delivery
    });

  } catch (error) {
    console.error('Error accepting delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'acceptation de la livraison'
    });
  }
};

/**
 * Change le statut d'une livraison
 */
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.body;
    const driverId = req.user.id;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Livraison non trouvée'
      });
    }

    // verifie que c'est bien le livreur assigné
    if (delivery.assignedDriver.toString() !== driverId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas assigné à cette livraison'
      });
    }

    // met a jour le statut
    await delivery.updateStatus(status);

    res.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      delivery
    });

  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
};

/**
 * Récupère les statistiques du livreur
 */
exports.getMyStats = async (req, res) => {
  try {
    const driverId = req.user.id;

    // recupere toutes les livraisons du livreur
    const allDeliveries = await Delivery.find({
      assignedDriver: driverId
    });

    // calcule les stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deliveriesToday = allDeliveries.filter(d =>
      d.deliveredAt && d.deliveredAt >= today
    );

    const deliveredDeliveries = allDeliveries.filter(d =>
      d.status === 'delivered'
    );

    // calcule les gains
    const earningsToday = deliveriesToday.reduce((sum, d) =>
      sum + (d.driverEarning || 0), 0
    );

    const totalEarnings = deliveredDeliveries.reduce((sum, d) =>
      sum + (d.driverEarning || 0), 0
    );

    // calcule la note moyenne (pour l'instant 4.8 par defaut)
    const averageRating = 4.8;

    res.json({
      success: true,
      stats: {
        deliveriesToday: deliveriesToday.length,
        totalDeliveries: deliveredDeliveries.length,
        earningsToday,
        totalEarnings,
        averageRating
      }
    });

  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

/**
 * Récupère l'historique des livraisons du livreur
 */
exports.getMyHistory = async (req, res) => {
  try {
    const driverId = req.user.id;

    const deliveries = await Delivery.find({
      assignedDriver: driverId,
      status: { $in: ['delivered', 'cancelled'] }
    })
    .sort({ deliveredAt: -1 })
    .limit(50);

    res.json({
      success: true,
      count: deliveries.length,
      deliveries
    });

  } catch (error) {
    console.error('Error fetching delivery history:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
};
