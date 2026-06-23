const express = require('express');
const router = express.Router();
// import du middleware d'authentification
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

// GET /api/users/profile - recupere le profil utilisateur
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // separe prenom et nom si fullName existe mais pas firstName/lastName
    let firstName = user.firstName;
    let lastName = user.lastName;

    if (!firstName && !lastName && user.fullName) {
      const parts = user.fullName.split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        firstName: firstName || '',
        lastName: lastName || ''
      }
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/users/profile - mise a jour du profil
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, dateOfBirth, city } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // SECURITE: la date de naissance ne peut pas etre modifiee apres enregistrement
    // raison: bonus anniversaire DashPoints - eviter les abus
    if (dateOfBirth && user.dateOfBirth) {
      // si user a deja une date de naissance, on refuse la modification
      return res.status(400).json({
        success: false,
        message: 'La date de naissance ne peut pas être modifiée après enregistrement (utilisée pour le bonus anniversaire).',
        locked: true
      });
    }

    // update des champs
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (firstName && lastName) {
      user.fullName = `${firstName} ${lastName}`;
    }
    if (email) user.email = email;
    if (phone) user.phone = phone;
    // dateOfBirth: autoriser seulement si pas encore definie
    if (dateOfBirth && !user.dateOfBirth) {
      user.dateOfBirth = dateOfBirth;
    }
    if (city) user.city = city;

    await user.save();

    // retourne le user sans le password
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: userObj
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/users/address - mise a jour adresse
router.put('/address', auth, async (req, res) => {
  try {
    const { address, city } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    if (address) user.address = address;
    if (city) user.city = city;

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Adresse mise à jour avec succès',
      user: userObj
    });
  } catch (error) {
    console.error('Erreur mise à jour adresse:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/users/preferences - update preferences notif
router.put('/preferences', auth, async (req, res) => {
  try {
    const { notifications, promotions, newsletter, analytics } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // update des preferences
    if (!user.preferences) {
      user.preferences = {};
    }

    if (typeof notifications !== 'undefined') user.preferences.notifications = notifications;
    if (typeof promotions !== 'undefined') user.preferences.promotions = promotions;
    if (typeof newsletter !== 'undefined') user.preferences.newsletter = newsletter;
    if (typeof analytics !== 'undefined') user.preferences.analytics = analytics;

    await user.save();

    res.json({
      success: true,
      message: 'Préférences mises à jour',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Erreur mise à jour préférences:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/users/me - recupere le profil utilisateur (alias de /profile)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // separe prenom et nom si fullName existe mais pas firstName/lastName
    let firstName = user.firstName;
    let lastName = user.lastName;

    if (!firstName && !lastName && user.fullName) {
      const parts = user.fullName.split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        firstName: firstName || '',
        lastName: lastName || ''
      }
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/users/me/address - mise a jour adresse de livraison avec geolocalisation
router.put('/me/address', auth, async (req, res) => {
  try {
    const { label, address, latitude, longitude } = req.body;

    // Verification que l'utilisateur est connecte
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Initialiser deliveryAddress si pas existant
    if (!user.deliveryAddress) {
      user.deliveryAddress = {};
    }

    // Mise a jour des champs de l'adresse de livraison
    if (label) user.deliveryAddress.label = label;
    if (address) user.deliveryAddress.address = address;
    if (typeof latitude !== 'undefined') user.deliveryAddress.latitude = latitude;
    if (typeof longitude !== 'undefined') user.deliveryAddress.longitude = longitude;

    await user.save();

    // Retourne l'utilisateur mis a jour sans password
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Adresse de livraison mise à jour avec succès',
      user: userObj
    });
  } catch (error) {
    console.error('Erreur mise à jour adresse de livraison:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour de l\'adresse'
    });
  }
});

module.exports = router;
