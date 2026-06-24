const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');

async function creditNormalOrderDashPoints(orderId) {
  const session = await mongoose.startSession();
  let pointsAwarded = 0;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOneAndUpdate({
        _id: orderId,
        status: 'delivered',
        dashPointsEligible: { $ne: false },
        dashPointsAwarded: { $ne: true }
      }, {
        $set: { dashPointsAwarded: true, dashPointsAwardedAt: new Date() }
      }, { new: true, session });

      if (!order || order.dashPointsEarned <= 0) return;
      const user = await User.findById(order.userId).session(session);
      if (!user) throw new Error('Utilisateur introuvable pour l’attribution des DashPoints');
      user.addDashPoints(
        order.dashPointsEarned,
        `Commande de ${order.totalAmount} MAD`,
        order._id
      );
      await user.save({ session });
      pointsAwarded = order.dashPointsEarned;
    });
    return pointsAwarded;
  } finally {
    await session.endSession();
  }
}

// Reutilisee par le suivi coursier; la mise a jour atomique empeche tout double credit.
exports.creditNormalOrderDashPoints = creditNormalOrderDashPoints;

/**
 * Créer une nouvelle commande
 */
exports.createOrderFromCart = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const paymentMethod = req.body.paymentMethod || 'cash_on_delivery';
    if (!['cash_on_delivery', 'card'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Mode de paiement invalide' });
    }

    let createdOrder;
    await session.withTransaction(async () => {
      const [cart, user] = await Promise.all([
        Cart.findOne({ user: req.user.id }).session(session),
        User.findById(req.user.id).select('deliveryAddress').session(session)
      ]);
      if (!cart?.items.length) {
        const error = new Error('Votre panier est vide');
        error.statusCode = 400;
        throw error;
      }
      const deliveryAddress = String(user?.deliveryAddress?.address || '').trim();
      if (!deliveryAddress) {
        const error = new Error('Veuillez ajouter une adresse dans votre profil');
        error.statusCode = 400;
        throw error;
      }

      const orders = await Order.create([{
        userId: req.user.id,
        restaurantId: cart.items[0].restaurant,
        restaurantName: cart.items[0].restaurantName,
        items: cart.items.map((item) => ({
          menuItem: item.menuItem,
          restaurant: item.restaurant,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal: cart.subtotal,
        deliveryFee: cart.deliveryFee,
        total: cart.total,
        totalAmount: cart.total,
        deliveryAddress,
        deliveryCoordinates: {
          latitude: user.deliveryAddress?.latitude,
          longitude: user.deliveryAddress?.longitude
        },
        paymentMethod,
        status: 'pending',
        sourceType: 'normal',
        estimatedDeliveryTime: new Date(Date.now() + 45 * 60000)
      }], { session });
      createdOrder = orders[0];
      await Cart.deleteOne({ _id: cart._id }, { session });
    });

    return res.status(201).json({ success: true, message: 'Commande créée avec succès', order: createdOrder });
  } catch (error) {
    console.error('Erreur création commande depuis panier:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la création de la commande'
    });
  } finally {
    await session.endSession();
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { restaurantId, restaurantName, items, totalAmount, deliveryAddress, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!restaurantName || !items || items.length === 0 || !totalAmount || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs requis doivent être fournis'
      });
    }

    // Créer la commande
    const order = new Order({
      userId,
      restaurantId,
      restaurantName,
      items,
      totalAmount,
      deliveryAddress,
      notes,
      status: 'pending',
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60000) // 45 minutes
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      order
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande'
    });
  }
};

/**
 * Récupérer toutes les commandes de l'utilisateur connecté
 */
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    // Construire le filtre
    let filter = { userId };

    if (status && status !== 'all') {
      if (status === 'active') {
        // Commandes en cours (pending, confirmed, preparing, on_the_way)
        filter.status = { $in: ['pending', 'confirmed', 'preparing', 'on_the_way'] };
      } else if (status === 'delivered') {
        filter.status = 'delivered';
      } else if (status === 'cancelled') {
        filter.status = 'cancelled';
      }
    }

    // Récupérer les commandes
    const orders = await Order.find(filter)
      .populate('assignedDriver', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes'
    });
  }
};

/**
 * Récupérer les détails d'une commande spécifique
 */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate('assignedDriver', 'name phone');

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
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la commande'
    });
  }
};

/**
 * Mettre à jour le statut d'une commande (Admin/Restaurant uniquement)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, driverId, driverName } = req.body;

    // Valider le statut
    const validStatuses = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Mettre à jour le statut
    order.status = status;

    // Si un livreur est assigné
    if (driverId && driverName) {
      order.assignedDriver = driverId;
      order.driverName = driverName;
    }

    await order.save();

    // Si la commande est livrée, créditer les DashPoints à l'utilisateur
    // Les livraisons individuelles Food Party ne créditent jamais leurs participants.
    // Le bonus global a déjà été attribué une fois à l'hôte lors du checkout Food Party.
    if (status === 'delivered' && order.dashPointsEligible !== false) {
      const pointsAwarded = await creditNormalOrderDashPoints(order._id);
      if (pointsAwarded > 0) {
        order.dashPointsAwarded = true;
        order.dashPointsAwardedAt = new Date();
      }
    }

    res.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
};

/**
 * Annuler une commande
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifier si la commande peut être annulée
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cette commande ne peut pas être annulée'
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason || 'Annulée par le client';

    await order.save();

    res.json({
      success: true,
      message: 'Commande annulée avec succès'
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la commande'
    });
  }
};

/**
 * Recommander (créer une nouvelle commande identique)
 */
exports.reorderOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Récupérer la commande originale
    const originalOrder = await Order.findOne({ _id: orderId, userId });

    if (!originalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Commande originale non trouvée'
      });
    }

    // Créer une nouvelle commande avec les mêmes articles
    const newOrder = new Order({
      userId,
      restaurantId: originalOrder.restaurantId,
      restaurantName: originalOrder.restaurantName,
      items: originalOrder.items,
      totalAmount: originalOrder.totalAmount,
      deliveryAddress: originalOrder.deliveryAddress,
      status: 'pending',
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60000)
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Commande recréée avec succès',
      order: newOrder
    });

  } catch (error) {
    console.error('Error reordering:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recommande'
    });
  }
};
