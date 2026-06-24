const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const routeService = require('./routeService');

const DELIVERY_STATUSES = ['pending', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

async function loadActor(userId) {
  const user = await User.findById(userId).select('role fullName phone deliveryAddress');
  if (!user) {
    const error = new Error('Utilisateur introuvable');
    error.status = 401;
    throw error;
  }
  return user;
}

async function getAuthorizedOrder(orderId, userId, allowed = ['client', 'courier']) {
  const [order, actor] = await Promise.all([
    Order.findById(orderId),
    loadActor(userId)
  ]);
  if (!order) {
    const error = new Error('Commande introuvable');
    error.status = 404;
    throw error;
  }

  const isClient = String(order.userId) === String(actor._id);
  let isCourier = String(order.assignedDriver || '') === String(actor._id);
  if (!isCourier && actor.role === 'livreur') {
    isCourier = Boolean(await Delivery.exists({ orderId: order._id, assignedDriver: actor._id }));
  }
  const isAdmin = actor.role === 'admin';
  const permitted = isAdmin
    || (allowed.includes('client') && isClient)
    || (allowed.includes('courier') && isCourier);

  if (!permitted) {
    const error = new Error('Vous ne pouvez pas suivre cette commande');
    error.status = 403;
    throw error;
  }
  return { order, actor, isClient, isCourier, isAdmin };
}

function resolveClientLocation(order, client) {
  const saved = order.tracking && order.tracking.clientLocation;
  if (Number.isFinite(saved?.latitude) && Number.isFinite(saved?.longitude)) return saved;
  if (Number.isFinite(order.deliveryCoordinates?.latitude) && Number.isFinite(order.deliveryCoordinates?.longitude)) {
    return order.deliveryCoordinates;
  }
  if (Number.isFinite(client?.deliveryAddress?.latitude) && Number.isFinite(client?.deliveryAddress?.longitude)) {
    return client.deliveryAddress;
  }
  return null;
}

async function getTracking(orderId, userId) {
  const access = await getAuthorizedOrder(orderId, userId);
  const client = await User.findById(access.order.userId).select('fullName phone deliveryAddress');
  const delivery = await Delivery.findOne({ orderId: access.order._id }).select('clientName clientPhone assignedDriver status');
  const clientLocation = resolveClientLocation(access.order, client);
  if (clientLocation && (!access.order.tracking?.clientLocation?.latitude || !access.order.tracking?.clientLocation?.longitude)) {
    access.order.tracking = access.order.tracking || {};
    access.order.tracking.clientLocation = {
      latitude: clientLocation.latitude,
      longitude: clientLocation.longitude
    };
    await access.order.save();
  }
  return { ...access, client, delivery };
}

async function updateCourierLocation(orderId, userId, payload) {
  const { order } = await getAuthorizedOrder(orderId, userId, ['courier']);
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const accuracy = payload.accuracy === undefined ? undefined : Number(payload.accuracy);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    const error = new Error('Position GPS invalide');
    error.status = 400;
    throw error;
  }

  const client = await User.findById(order.userId).select('deliveryAddress');
  const clientLocation = resolveClientLocation(order, client);
  if (!clientLocation) {
    const error = new Error('Coordonnees de livraison du client manquantes');
    error.status = 422;
    throw error;
  }

  const courierLocation = { latitude, longitude, accuracy, updatedAt: new Date() };
  const route = await routeService.getRoute(courierLocation, clientLocation);
  order.tracking = order.tracking || {};
  order.tracking.courierLocation = courierLocation;
  order.tracking.clientLocation = {
    latitude: Number(clientLocation.latitude),
    longitude: Number(clientLocation.longitude)
  };
  order.tracking.distanceKm = route.distanceKm;
  order.tracking.etaMinutes = route.etaMinutes;
  order.tracking.routeGeometry = route.geometry;
  order.tracking.routeSource = route.source;
  order.estimatedDeliveryTime = new Date(Date.now() + route.etaMinutes * 60000);
  await order.save();
  await Delivery.updateOne(
    { orderId: order._id, assignedDriver: userId },
    { $set: { currentPosition: { latitude, longitude }, distanceKm: route.distanceKm } }
  );
  return { order, courierLocation, clientLocation: order.tracking.clientLocation, route };
}

async function updateDeliveryStatus(orderId, userId, status) {
  if (!DELIVERY_STATUSES.includes(status)) {
    const error = new Error('Statut de livraison invalide');
    error.status = 400;
    throw error;
  }
  const { order } = await getAuthorizedOrder(orderId, userId, ['courier']);
  const delivery = await Delivery.findOne({ orderId: order._id, assignedDriver: userId });
  const currentStatus = delivery?.status === 'available' ? 'pending' : (delivery?.status || order.deliveryStatus || 'pending');
  const transitions = {
    pending: ['accepted', 'cancelled'],
    accepted: ['picked_up', 'cancelled'],
    picked_up: ['on_the_way', 'cancelled'],
    on_the_way: ['delivered', 'cancelled'],
    delivered: [], cancelled: []
  };
  if (currentStatus !== status && !transitions[currentStatus]?.includes(status)) {
    const error = new Error(`Transition ${currentStatus} vers ${status} interdite`);
    error.status = 409;
    throw error;
  }
  order.deliveryStatus = status;
  order.tracking = order.tracking || {};
  order.tracking.lastStatusUpdate = new Date();
  const orderStatus = {
    pending: 'pending', accepted: 'confirmed', picked_up: 'preparing',
    on_the_way: 'on_the_way', delivered: 'delivered', cancelled: 'cancelled'
  }[status];
  order.status = orderStatus;
  await order.save();

  if (delivery && delivery.status !== status) await delivery.updateStatus(status);
  if (status === 'delivered' && order.dashPointsEligible !== false) {
    const { creditNormalOrderDashPoints } = require('../controllers/orderController');
    await creditNormalOrderDashPoints(order._id);
  }
  return order;
}

module.exports = {
  DELIVERY_STATUSES,
  getAuthorizedOrder,
  getTracking,
  updateCourierLocation,
  updateDeliveryStatus
};
