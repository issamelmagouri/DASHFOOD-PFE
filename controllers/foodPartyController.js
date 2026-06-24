const mongoose = require('mongoose');
const FoodParty = require('../models/FoodParty');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Order = require('../models/Order');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FOOD_PARTY_MAD_PER_DASHPOINT = 10;

const normalizeCode = (code) => String(code || '').trim().toUpperCase();
const sameId = (left, right) => String(left) === String(right);

function createInviteCode(length = 8) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function calculateFoodPartyDashPoints(totalPrice) {
  const total = Number(totalPrice);
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.floor(total / FOOD_PARTY_MAD_PER_DASHPOINT);
}

async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = createInviteCode();
    // The unique database index remains the final protection against a collision.
    if (!(await FoodParty.exists({ inviteCode }))) return inviteCode;
  }
  throw new Error('Impossible de générer un code d\'invitation unique');
}

function populateParty(query) {
  return query
    .populate('host', 'fullName email')
    .populate('participants', 'fullName email')
    .populate('participantDeliveries.user', 'fullName email')
    .populate('items.addedBy', 'fullName email')
    .populate('restaurant', 'name cuisineType image deliveryFee freeDelivery menuItems');
}

function serializeParty(party, currentUserId) {
  if (!party) return party;
  const serialized = party.toObject ? party.toObject() : party;
  serialized.participantDeliveries = (serialized.participantDeliveries || []).map((delivery) => {
    if (sameId(delivery.user?._id || delivery.user, currentUserId)) return delivery;
    const { deliveryAddress, latitude, longitude, ...publicDelivery } = delivery;
    return publicDelivery;
  });
  return serialized;
}

function normalizeDeliveryAddress(value) {
  return String(value || '').trim();
}

async function getProfileDelivery(req, res) {
  if (req.body.addressConfirmed !== true) {
    res.status(400).json({
      success: false,
      message: 'Confirmez votre adresse de profil avant de continuer'
    });
    return null;
  }

  const user = await User.findById(req.user.id).select('deliveryAddress');
  if (!user) {
    res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    return null;
  }

  const deliveryAddress = normalizeDeliveryAddress(user.deliveryAddress?.address);
  if (deliveryAddress.length < 5 || deliveryAddress.length > 500) {
    res.status(400).json({
      success: false,
      message: 'Aucune adresse de livraison enregistrée. Ajoutez-la dans votre profil.'
    });
    return null;
  }

  return {
    deliveryAddress,
    latitude: Number.isFinite(user.deliveryAddress?.latitude) ? user.deliveryAddress.latitude : undefined,
    longitude: Number.isFinite(user.deliveryAddress?.longitude) ? user.deliveryAddress.longitude : undefined
  };
}

function sendError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);

  if (error instanceof mongoose.Error.VersionError) {
    return res.status(409).json({
      success: false,
      message: 'La Food Party vient d’être modifiée. Actualisez puis réessayez.'
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: 'Identifiant invalide' });
  }

  return res.status(500).json({ success: false, message: fallbackMessage });
}

async function findActiveParty(inviteCode) {
  return FoodParty.findOne({ inviteCode: normalizeCode(inviteCode), status: 'active' });
}

async function awardFoodPartyDashPoints(partyId, referenceOrderId) {
  const session = await mongoose.startSession();
  let result = { awarded: false, points: 0 };

  try {
    await session.withTransaction(async () => {
      const party = await FoodParty.findOneAndUpdate(
        { _id: partyId, status: 'ordered', dashPointsAwarded: { $ne: true } },
        { $set: { dashPointsAwarded: true, dashPointsAwardedAt: new Date() } },
        { new: true, session }
      );
      if (!party) return;

      // RÈGLE MÉTIER FOOD PARTY : seul l'hôte gagne des points, calculés
      // une seule fois sur le total alimentaire global (1 point / 10 MAD).
      const points = calculateFoodPartyDashPoints(party.totalPrice);
      if (points > 0) {
        const host = await User.findById(party.host).session(session);
        if (!host) throw new Error('Hôte Food Party introuvable pour l’attribution des DashPoints');
        host.addDashPoints(
          points,
          `Food Party ${party.inviteCode} – ${party.totalPrice} MAD`,
          referenceOrderId
        );
        await host.save({ session });
      }

      await FoodParty.updateOne(
        { _id: party._id },
        { $set: { dashPointsEarned: points } },
        { session }
      );
      result = { awarded: true, points };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function ensureParticipant(party, userId, res) {
  const isParticipant = party.participants.some((participantId) => sameId(participantId, userId));
  if (!isParticipant) {
    res.status(403).json({ success: false, message: 'Rejoignez cette Food Party avant de participer' });
    return false;
  }
  return true;
}

exports.createFoodParty = async (req, res) => {
  try {
    const { restaurantId } = req.body;
    const userId = req.user.id;
    const profileDelivery = await getProfileDelivery(req, res);
    if (!profileDelivery) return;

    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({ success: false, message: 'Veuillez choisir un restaurant valide' });
    }

    const [restaurant, existingParty] = await Promise.all([
      Restaurant.findOne({ _id: restaurantId, isActive: true }),
      FoodParty.findOne({ host: userId, status: 'active' })
    ]);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant indisponible ou introuvable' });
    }

    if (existingParty) {
      const party = await populateParty(FoodParty.findById(existingParty._id));
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà une Food Party active',
        party: serializeParty(party, userId)
      });
    }

    const party = await FoodParty.create({
      host: userId,
      restaurant: restaurant._id,
      inviteCode: await generateUniqueInviteCode(),
      participants: [userId],
      participantDeliveries: [{
        user: userId,
        ...profileDelivery,
        addressConfirmed: true,
        confirmedAt: new Date()
      }]
    });

    const populatedParty = await populateParty(FoodParty.findById(party._id));
    return res.status(201).json({
      success: true,
      message: 'Food Party créée avec succès',
      party: serializeParty(populatedParty, userId)
    });
  } catch (error) {
    if (error?.code === 11000) {
      const message = error.keyPattern?.host
        ? 'Vous avez déjà une Food Party active'
        : 'Collision du code d\'invitation, veuillez réessayer';
      return res.status(409).json({ success: false, message });
    }
    return sendError(res, error, 'Erreur lors de la création de la Food Party');
  }
};

exports.getMyFoodParty = async (req, res) => {
  try {
    const party = await populateParty(FoodParty.findOne({
      status: 'active',
      $or: [{ host: req.user.id }, { participants: req.user.id }]
    }).sort({ createdAt: -1 }));

    return res.json({ success: true, party: serializeParty(party, req.user.id) || null });
  } catch (error) {
    return sendError(res, error, 'Erreur lors de la récupération de la Food Party');
  }
};

exports.getFoodPartyByCode = async (req, res) => {
  try {
    const party = await populateParty(FoodParty.findOne({
      inviteCode: normalizeCode(req.params.inviteCode)
    }));

    if (!party) {
      return res.status(404).json({ success: false, message: 'Food Party introuvable' });
    }

    return res.json({ success: true, party: serializeParty(party, req.user.id) });
  } catch (error) {
    return sendError(res, error, 'Erreur lors de la récupération de la Food Party');
  }
};

exports.joinFoodParty = async (req, res) => {
  try {
    const code = normalizeCode(req.params.inviteCode);
    const existingParty = await FoodParty.findOne({ inviteCode: code });

    if (!existingParty) {
      return res.status(404).json({ success: false, message: 'Food Party introuvable' });
    }
    if (existingParty.status !== 'active') {
      return res.status(409).json({ success: false, message: 'Cette Food Party est terminée' });
    }
    const profileDelivery = await getProfileDelivery(req, res);
    if (!profileDelivery) return;

    if (!existingParty.participants.some((participant) => sameId(participant, req.user.id))) {
      existingParty.participants.push(req.user.id);
    }
    const delivery = existingParty.participantDeliveries.find((entry) => sameId(entry.user, req.user.id));
    if (delivery) {
      delivery.deliveryAddress = profileDelivery.deliveryAddress;
      delivery.latitude = profileDelivery.latitude;
      delivery.longitude = profileDelivery.longitude;
      delivery.addressConfirmed = true;
      delivery.confirmedAt = new Date();
    } else {
      existingParty.participantDeliveries.push({
        user: req.user.id,
        ...profileDelivery,
        addressConfirmed: true,
        confirmedAt: new Date()
      });
    }
    await existingParty.save();

    const party = await populateParty(FoodParty.findById(existingParty._id));
    return res.json({ success: true, message: 'Vous avez rejoint la Food Party', party: serializeParty(party, req.user.id) });
  } catch (error) {
    return sendError(res, error, 'Erreur lors de l\'ajout à la Food Party');
  }
};

exports.confirmDeliveryAddress = async (req, res) => {
  try {
    const profileDelivery = await getProfileDelivery(req, res);
    if (!profileDelivery) return;
    const party = await findActiveParty(req.params.inviteCode);
    if (!party) {
      return res.status(404).json({ success: false, message: 'Food Party active introuvable' });
    }
    if (!ensureParticipant(party, req.user.id, res)) return;

    const delivery = party.participantDeliveries.find((entry) => sameId(entry.user, req.user.id));
    if (delivery) {
      delivery.deliveryAddress = profileDelivery.deliveryAddress;
      delivery.latitude = profileDelivery.latitude;
      delivery.longitude = profileDelivery.longitude;
      delivery.addressConfirmed = true;
      delivery.confirmedAt = new Date();
    } else {
      party.participantDeliveries.push({
        user: req.user.id,
        ...profileDelivery,
        addressConfirmed: true,
        confirmedAt: new Date()
      });
    }
    await party.save();
    const populatedParty = await populateParty(FoodParty.findById(party._id));
    return res.json({
      success: true,
      message: 'Adresse de livraison confirmée',
      party: serializeParty(populatedParty, req.user.id)
    });
  } catch (error) {
    return sendError(res, error, 'Erreur lors de la confirmation de l\'adresse');
  }
};

exports.addItem = async (req, res) => {
  try {
    const { menuItemId, quantity = 1 } = req.body;
    const parsedQuantity = Number(quantity);
    const party = await findActiveParty(req.params.inviteCode);

    if (!party) {
      return res.status(404).json({ success: false, message: 'Food Party active introuvable' });
    }
    if (!ensureParticipant(party, req.user.id, res)) return;
    if (!mongoose.isValidObjectId(menuItemId) || !Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 99) {
      return res.status(400).json({ success: false, message: 'Plat ou quantité invalide' });
    }

    const restaurant = await Restaurant.findById(party.restaurant).select('menuItems isActive');
    const menuItem = restaurant?.menuItems.id(menuItemId);
    if (!restaurant?.isActive || !menuItem || menuItem.isAvailable === false) {
      return res.status(404).json({ success: false, message: 'Ce plat n\'est pas disponible dans ce restaurant' });
    }

    party.items.push({
      menuItem: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: parsedQuantity,
      addedBy: req.user.id
    });
    await party.save();

    const populatedParty = await populateParty(FoodParty.findById(party._id));
    return res.status(201).json({ success: true, message: 'Plat ajouté au panier commun', party: serializeParty(populatedParty, req.user.id) });
  } catch (error) {
    return sendError(res, error, 'Erreur lors de l\'ajout du plat');
  }
};

exports.updateItem = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ success: false, message: 'La quantité doit être comprise entre 1 et 99' });
    }

    const party = await findActiveParty(req.params.inviteCode);
    if (!party) {
      return res.status(404).json({ success: false, message: 'Food Party active introuvable' });
    }
    if (!ensureParticipant(party, req.user.id, res)) return;

    const item = party.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Plat introuvable dans le panier' });
    }
    if (!sameId(item.addedBy, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Vous pouvez modifier uniquement vos propres plats' });
    }

    item.quantity = quantity;
    await party.save();

    const populatedParty = await populateParty(FoodParty.findById(party._id));
    return res.json({ success: true, message: 'Quantité mise à jour', party: serializeParty(populatedParty, req.user.id) });
  } catch (error) {
    return sendError(res, error, 'Erreur lors de la modification du plat');
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const party = await findActiveParty(req.params.inviteCode);
    if (!party) {
      return res.status(404).json({ success: false, message: 'Food Party active introuvable' });
    }
    if (!ensureParticipant(party, req.user.id, res)) return;

    const item = party.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Plat introuvable dans le panier' });
    }
    if (!sameId(item.addedBy, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Vous pouvez supprimer uniquement vos propres plats' });
    }

    item.deleteOne();
    await party.save();

    const populatedParty = await populateParty(FoodParty.findById(party._id));
    return res.json({ success: true, message: 'Plat supprimé du panier commun', party: serializeParty(populatedParty, req.user.id) });
  } catch (error) {
    return sendError(res, error, 'Erreur lors de la suppression du plat');
  }
};

exports.checkout = async (req, res) => {
  let lockedParty;
  let ordersLinked = false;
  let createdOrders = [];
  try {
    const party = await FoodParty.findOne({ inviteCode: normalizeCode(req.params.inviteCode) })
      .populate('restaurant', 'name deliveryFee freeDelivery');

    if (!party) {
      return res.status(404).json({ success: false, message: 'Food Party introuvable' });
    }
    if (!sameId(party.host, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Seul l\'hôte peut valider la commande' });
    }
    if (party.status !== 'active') {
      return res.status(409).json({ success: false, message: 'Cette Food Party est déjà terminée' });
    }
    if (!party.items.length) {
      return res.status(400).json({ success: false, message: 'Le panier commun est vide' });
    }

    const participantUsers = await User.find({ _id: { $in: party.participants } }).select('deliveryAddress');
    const profileDeliveryByUser = new Map(participantUsers.map((user) => [String(user._id), {
      deliveryAddress: normalizeDeliveryAddress(user.deliveryAddress?.address),
      latitude: Number.isFinite(user.deliveryAddress?.latitude) ? user.deliveryAddress.latitude : undefined,
      longitude: Number.isFinite(user.deliveryAddress?.longitude) ? user.deliveryAddress.longitude : undefined
    }]));
    const confirmedDeliveryByUser = new Map(
      party.participantDeliveries.map((delivery) => [String(delivery.user), delivery])
    );
    const missingAddresses = party.participants.filter((participantId) => {
      const confirmedDelivery = confirmedDeliveryByUser.get(String(participantId));
      const profileDelivery = profileDeliveryByUser.get(String(participantId));
      return !confirmedDelivery?.addressConfirmed
        || !profileDelivery?.deliveryAddress
        || confirmedDelivery.deliveryAddress !== profileDelivery.deliveryAddress;
    });
    if (missingAddresses.length) {
      return res.status(400).json({
        success: false,
        message: `${missingAddresses.length} participant(s) doivent encore confirmer leur adresse`
      });
    }
    const deliveryByUser = profileDeliveryByUser;

    // Atomic status change prevents two simultaneous checkouts from creating two orders.
    lockedParty = await FoodParty.findOneAndUpdate(
      { _id: party._id, status: 'active' },
      { $set: { status: 'ordered' }, $inc: { __v: 1 } },
      { new: true }
    );
    if (!lockedParty) {
      return res.status(409).json({ success: false, message: 'Cette Food Party vient déjà d\'être validée' });
    }

    const deliveryFee = party.restaurant.freeDelivery ? 0 : (party.restaurant.deliveryFee || 0);
    const itemsByParticipant = new Map();
    party.items.forEach((item) => {
      const participantId = String(item.addedBy);
      if (!itemsByParticipant.has(participantId)) itemsByParticipant.set(participantId, []);
      itemsByParticipant.get(participantId).push({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      });
    });

    const orderPayloads = [...itemsByParticipant.entries()].map(([participantId, items]) => {
      const foodTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        userId: participantId,
        restaurantId: party.restaurant._id,
        restaurantName: party.restaurant.name,
        items,
        totalAmount: Math.round((foodTotal + deliveryFee + Number.EPSILON) * 100) / 100,
        deliveryFee,
        deliveryAddress: deliveryByUser.get(participantId).deliveryAddress,
        deliveryCoordinates: {
          latitude: deliveryByUser.get(participantId).latitude,
          longitude: deliveryByUser.get(participantId).longitude
        },
        notes: `Livraison individuelle Food Party ${party.inviteCode}`,
        sourceType: 'food_party',
        foodParty: party._id,
        dashPointsEligible: false,
        dashPointsEarned: 0,
        status: 'pending',
        estimatedDeliveryTime: new Date(Date.now() + 45 * 60000)
      };
    });

    createdOrders = await Order.insertMany(orderPayloads);
    lockedParty.finalOrders = createdOrders.map((order) => order._id);
    lockedParty.finalOrder = undefined;
    await lockedParty.save();
    const hostOrder = createdOrders.find((order) => sameId(order.userId, party.host)) || createdOrders[0];
    const dashPoints = await awardFoodPartyDashPoints(lockedParty._id, hostOrder?._id);
    ordersLinked = true;
    const populatedParty = await populateParty(FoodParty.findById(lockedParty._id));

    return res.status(201).json({
      success: true,
      message: `${createdOrders.length} livraison(s) Food Party créée(s) avec succès`,
      orders: createdOrders,
      dashPoints,
      party: serializeParty(populatedParty, req.user.id)
    });
  } catch (error) {
    if (lockedParty?._id && !ordersLinked) {
      if (createdOrders.length) {
        await Order.deleteMany({ _id: { $in: createdOrders.map((order) => order._id) } })
          .catch((cleanupError) => console.error('Food Party order cleanup failed:', cleanupError));
      }
      await FoodParty.updateOne({
        _id: lockedParty._id,
        status: 'ordered'
      }, {
        status: 'active',
        $unset: {
          finalOrder: 1,
          finalOrders: 1,
          dashPointsAwarded: 1,
          dashPointsAwardedAt: 1,
          dashPointsEarned: 1
        }
      })
        .catch((rollbackError) => console.error('Food Party checkout rollback failed:', rollbackError));
    }
    return sendError(res, error, 'Erreur lors de la validation de la commande');
  }
};

exports.cancelFoodParty = async (req, res) => {
  try {
    const party = await FoodParty.findOne({ inviteCode: normalizeCode(req.params.inviteCode) });
    if (!party) {
      return res.status(404).json({ success: false, message: 'Food Party introuvable' });
    }
    if (!sameId(party.host, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Seul l\'hôte peut annuler la Food Party' });
    }
    if (party.status !== 'active') {
      return res.status(409).json({ success: false, message: 'Cette Food Party est déjà terminée' });
    }

    party.status = 'cancelled';
    await party.save();
    const populatedParty = await populateParty(FoodParty.findById(party._id));
    return res.json({ success: true, message: 'Food Party annulée', party: serializeParty(populatedParty, req.user.id) });
  } catch (error) {
    return sendError(res, error, 'Erreur lors de l\'annulation de la Food Party');
  }
};

exports._test = {
  createInviteCode,
  normalizeCode,
  calculateFoodPartyDashPoints,
  FOOD_PARTY_MAD_PER_DASHPOINT
};
