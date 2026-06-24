const jwt = require('jsonwebtoken');
const trackingService = require('../services/trackingService');

function socketToken(socket) {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  const header = socket.handshake.headers.authorization;
  if (authToken) return String(authToken).replace(/^Bearer\s+/i, '');
  if (header) return String(header).replace(/^Bearer\s+/i, '');
  return null;
}

function configureSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socketToken(socket);
      if (!token) return next(new Error('Authentification requise'));
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (_error) {
      next(new Error('Token invalide ou expire'));
    }
  });

  io.on('connection', socket => {
    const join = async (orderId, role, acknowledgement) => {
      try {
        await trackingService.getAuthorizedOrder(orderId, socket.user.id, [role]);
        await socket.join(`order-${orderId}`);
        if (typeof acknowledgement === 'function') acknowledgement({ success: true });
      } catch (error) {
        if (typeof acknowledgement === 'function') acknowledgement({ success: false, message: error.message });
      }
    };

    socket.on('client:join', (data = {}, acknowledgement) => join(data.orderId, 'client', acknowledgement));
    socket.on('courier:join', (data = {}, acknowledgement) => join(data.orderId, 'courier', acknowledgement));

    socket.on('courier:location:update', async (data = {}, acknowledgement) => {
      try {
        const result = await trackingService.updateCourierLocation(data.orderId, socket.user.id, data);
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
        io.to(`order-${result.order._id}`).emit('courier:location:broadcast', payload);
        io.to(`order-${result.order._id}`).emit('delivery:eta:update', {
          orderId: payload.orderId,
          distanceKm: payload.distanceKm,
          etaMinutes: payload.etaMinutes,
          estimatedDeliveryTime: payload.estimatedDeliveryTime
        });
        if (typeof acknowledgement === 'function') acknowledgement({ success: true, tracking: payload });
      } catch (error) {
        if (typeof acknowledgement === 'function') acknowledgement({ success: false, message: error.message });
      }
    });
  });
}

module.exports = configureSocket;
