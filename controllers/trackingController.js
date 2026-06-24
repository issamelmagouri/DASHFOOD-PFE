const trackingService = require('../services/trackingService');

function fail(res, error) {
  const status = error.status || 500;
  if (status === 500) console.error('Erreur tracking:', error);
  return res.status(status).json({ success: false, message: error.message || 'Erreur serveur' });
}

exports.getOrderTracking = async (req, res) => {
  try {
    const { order, client, delivery } = await trackingService.getTracking(req.params.orderId, req.user.id);
    res.json({
      success: true,
      tracking: {
        orderId: order._id,
        orderNumber: `DF-${String(order._id).slice(-6).toUpperCase()}`,
        restaurantName: order.restaurantName,
        deliveryAddress: order.deliveryAddress,
        status: (delivery?.status && delivery.status !== 'available') ? delivery.status : (order.deliveryStatus || order.status),
        orderStatus: order.status,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        courierLocation: order.tracking?.courierLocation || null,
        clientLocation: order.tracking?.clientLocation || null,
        distanceKm: order.tracking?.distanceKm ?? null,
        etaMinutes: order.tracking?.etaMinutes ?? null,
        routeGeometry: order.tracking?.routeGeometry || null,
        routeSource: order.tracking?.routeSource || null,
        lastStatusUpdate: order.tracking?.lastStatusUpdate || null,
        client: {
          name: client?.fullName || delivery?.clientName || 'Client',
          phone: client?.phone || delivery?.clientPhone || ''
        }
      }
    });
  } catch (error) {
    fail(res, error);
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const result = await trackingService.updateCourierLocation(req.params.orderId, req.user.id, req.body);
    const payload = {
      orderId: String(result.order._id),
      courierLocation: result.courierLocation,
      clientLocation: result.clientLocation,
      distanceKm: result.route.distanceKm,
      etaMinutes: result.route.etaMinutes,
      routeGeometry: result.route.geometry,
      routeSource: result.route.source,
      estimatedDeliveryTime: result.order.estimatedDeliveryTime
    };
    const io = req.app.get('io');
    if (io) {
      io.to(`order-${result.order._id}`).emit('courier:location:broadcast', payload);
      io.to(`order-${result.order._id}`).emit('delivery:eta:update', {
        orderId: payload.orderId,
        distanceKm: payload.distanceKm,
        etaMinutes: payload.etaMinutes,
        estimatedDeliveryTime: payload.estimatedDeliveryTime
      });
    }
    res.json({ success: true, message: 'Position mise a jour', tracking: payload });
  } catch (error) {
    fail(res, error);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const order = await trackingService.updateDeliveryStatus(req.params.orderId, req.user.id, req.body.status);
    const payload = {
      orderId: String(order._id),
      status: order.deliveryStatus,
      orderStatus: order.status,
      updatedAt: order.tracking?.lastStatusUpdate
    };
    const io = req.app.get('io');
    if (io) io.to(`order-${order._id}`).emit('delivery:status:update', payload);
    res.json({ success: true, message: 'Statut mis a jour', tracking: payload });
  } catch (error) {
    fail(res, error);
  }
};
