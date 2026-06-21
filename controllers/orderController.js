const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Créer une nouvelle commande
 */
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
    if (status === 'delivered') {
      const user = await User.findById(order.userId);
      if (user) {
        user.dashPoints = (user.dashPoints || 0) + order.dashPointsEarned;
        await user.save();
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
