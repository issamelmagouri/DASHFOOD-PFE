const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const { haversineDistanceKm } = require('../services/routeService');

const port = 3218;
const baseUrl = `http://127.0.0.1:${port}`;
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let server;
let client;
let courier;
let stranger;
let order;
let delivery;

const tokenFor = user => jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

async function request(pathname, { token, ...options } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const contentType = response.headers.get('content-type') || '';
  return { response, body: contentType.includes('application/json') ? await response.json() : await response.text() };
}

async function waitForServer() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${baseUrl}/suivi-commande`)).ok) return; } catch (_) { /* demarrage */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Serveur tracking indisponible');
}

test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  [client, courier, stranger] = await User.create([
    { fullName: 'Client Tracking', email: `tracking-client-${suffix}@test.dev`, phone: '0600000001', address: 'Casablanca', password: 'hashed-test', role: 'client', deliveryAddress: { address: 'Maarif, Casablanca', latitude: 33.586, longitude: -7.632 } },
    { fullName: 'Coursier Tracking', email: `tracking-courier-${suffix}@test.dev`, phone: '0600000002', address: 'Casablanca', password: 'hashed-test', role: 'livreur' },
    { fullName: 'Autre Client', email: `tracking-other-${suffix}@test.dev`, phone: '0600000003', address: 'Rabat', password: 'hashed-test', role: 'client' }
  ]);
  order = await Order.create({
    userId: client._id, restaurantName: 'Restaurant Tracking', items: [{ name: 'Plat GPS', quantity: 1, price: 80 }],
    totalAmount: 90, subtotal: 80, total: 90, deliveryFee: 10, deliveryAddress: 'Maarif, Casablanca',
    deliveryCoordinates: { latitude: 33.586, longitude: -7.632 }, assignedDriver: courier._id,
    deliveryStatus: 'accepted', status: 'confirmed', dashPointsEligible: false
  });
  delivery = await Delivery.create({ orderId: order._id, clientId: client._id, clientName: client.fullName, clientPhone: client.phone, clientAddress: order.deliveryAddress, restaurantName: order.restaurantName, restaurantAddress: 'Centre, Casablanca', distanceKm: 5, assignedDriver: courier._id, status: 'accepted' });
  await mongoose.disconnect();

  server = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port), NODE_ENV: 'test', OPENROUTESERVICE_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = '';
  server.stderr.on('data', chunk => { errors += chunk.toString(); });
  server.on('exit', code => { if (code && code !== 0) process.stderr.write(errors); });
  await waitForServer();
});

test.after(async () => {
  if (server && !server.killed) server.kill();
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Delivery.deleteOne({ _id: delivery._id }), Order.deleteOne({ _id: order._id }), User.deleteMany({ _id: { $in: [client._id, courier._id, stranger._id] } })]);
  await mongoose.disconnect();
});

test('routeService calcule une distance Haversine coherente', () => {
  const distance = haversineDistanceKm({ latitude: 33.5731, longitude: -7.5898 }, { latitude: 33.586, longitude: -7.632 });
  assert.ok(distance > 3 && distance < 5);
});

test('page, JWT et propriete de commande sont proteges', async () => {
  const page = await request(`/suivi-commande.html?orderId=${order._id}`);
  assert.equal(page.response.status, 200);
  assert.match(page.body, /id="trackingMap"/);
  assert.doesNotMatch(page.body, /Cannot GET/);
  const socketClient = await request('/socket.io/socket.io.js');
  assert.equal(socketClient.response.status, 200);
  assert.match(socketClient.body, /Socket\.IO/);
  assert.equal((await request(`/api/tracking/order/${order._id}`)).response.status, 401);
  assert.equal((await request(`/api/tracking/order/${order._id}`, { token: tokenFor(stranger) })).response.status, 403);
  const own = await request(`/api/tracking/order/${order._id}`, { token: tokenFor(client) });
  assert.equal(own.response.status, 200);
  assert.equal(own.body.tracking.deliveryAddress, 'Maarif, Casablanca');
  assert.equal(own.body.tracking.clientLocation.latitude, 33.586);
});

test('seul le coursier assigne publie sa position, distance et ETA', async () => {
  const forbidden = await request(`/api/tracking/order/${order._id}/location`, { token: tokenFor(client), method: 'PUT', body: JSON.stringify({ latitude: 33.57, longitude: -7.59 }) });
  assert.equal(forbidden.response.status, 403);
  const updated = await request(`/api/tracking/order/${order._id}/location`, { token: tokenFor(courier), method: 'PUT', body: JSON.stringify({ latitude: 33.5731, longitude: -7.5898, accuracy: 8 }) });
  assert.equal(updated.response.status, 200);
  assert.ok(updated.body.tracking.distanceKm > 3);
  assert.ok(updated.body.tracking.etaMinutes > 0);
  assert.equal(updated.body.tracking.routeSource, 'fallback');

  await mongoose.connect(process.env.MONGO_URI);
  const persisted = await Order.findById(order._id);
  assert.equal(persisted.tracking.courierLocation.latitude, 33.5731);
  assert.ok(persisted.tracking.routeGeometry.coordinates.length >= 2);
  await mongoose.disconnect();
});

test('les transitions coursier mettent a jour Order et Delivery', async () => {
  for (const status of ['picked_up', 'on_the_way', 'delivered']) {
    const result = await request(`/api/tracking/order/${order._id}/status`, { token: tokenFor(courier), method: 'PUT', body: JSON.stringify({ status }) });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.tracking.status, status);
  }
  const backwards = await request(`/api/tracking/order/${order._id}/status`, { token: tokenFor(courier), method: 'PUT', body: JSON.stringify({ status: 'picked_up' }) });
  assert.equal(backwards.response.status, 409);
  await mongoose.connect(process.env.MONGO_URI);
  const [savedOrder, savedDelivery] = await Promise.all([Order.findById(order._id), Delivery.findById(delivery._id)]);
  assert.equal(savedOrder.status, 'delivered');
  assert.equal(savedOrder.deliveryStatus, 'delivered');
  assert.equal(savedDelivery.status, 'delivered');
  await mongoose.disconnect();
});
