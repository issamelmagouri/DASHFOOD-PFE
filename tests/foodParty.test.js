const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const FoodParty = require('../models/FoodParty');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Cart = require('../models/Cart');
const { _test: helpers } = require('../controllers/foodPartyController');
const catalogueHelpers = require('../public/js/catalogue.js');
const restaurantMenuHelpers = require('../public/js/restaurant-menu.js');
const cartHelpers = require('../public/js/panier.js');

const port = 3217;
const baseUrl = `http://127.0.0.1:${port}`;
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const hostEmail = `foodparty-host-${suffix}@example.test`;
const guestEmail = `foodparty-guest-${suffix}@example.test`;
const password = 'TestFoodParty!2026';
let server;
let restaurantId;
let inviteCode;
let menuItemIds = [];

async function request(pathname, { token, ...options } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

async function waitForServer() {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
    } catch (_) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Le serveur de test ne démarre pas dans le délai prévu');
}

async function registerAndLogin(fullName, email, deliveryAddress) {
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, phone: '0600000000', address: '1 rue de Test, Casablanca', password, confirmPassword: password })
  });
  assert.equal(registration.response.status, 201);

  const login = await request('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  });
  assert.equal(login.response.status, 200);
  const token = login.body.token;
  const addressUpdate = await request('/api/users/me/address', {
    token,
    method: 'PUT',
    body: JSON.stringify(deliveryAddress)
  });
  assert.equal(addressUpdate.response.status, 200);
  return token;
}

test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const restaurant = await Restaurant.create({
    name: `Food Party Test ${suffix}`,
    cuisineType: 'Cuisine de test',
    category: 'Français',
    city: 'Casablanca',
    address: '2 rue de Test',
    description: 'Restaurant temporaire pour les tests automatisés Food Party.',
    deliveryFee: 7,
    isActive: true,
    menuItems: [{ name: 'Assiette test', description: 'Plat temporaire', price: 25, category: 'Plat', isAvailable: true }]
  });
  restaurantId = restaurant._id.toString();
  const catalogueItems = await MenuItem.insertMany(MenuItem.MENU_CATEGORIES.map((category, index) => ({
    name: `Catalogue ${category} ${suffix}`,
    description: `Plat temporaire de la catégorie ${category}`,
    price: 30 + index,
    image: '/assets/images/platanimation1.png',
    category,
    restaurant: restaurant._id,
    available: true,
    badge: index === 0 ? 'promo' : (index === 1 ? 'populaire' : undefined)
  })));
  menuItemIds = catalogueItems.map((item) => item._id.toString());
  await mongoose.disconnect();

  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let errors = '';
  server.stderr.on('data', (chunk) => { errors += chunk.toString(); });
  server.on('exit', (code) => {
    if (code && code !== 0) process.stderr.write(errors);
  });
  await waitForServer();
});

test.after(async () => {
  if (server && !server.killed) server.kill();
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({ email: { $in: [hostEmail, guestEmail] } }).select('_id');
  const userIds = users.map((user) => user._id);
  await Promise.all([
    FoodParty.deleteMany({ $or: [{ inviteCode }, { host: { $in: userIds } }] }),
    Order.deleteMany({ userId: { $in: userIds } }),
    Cart.deleteMany({ user: { $in: userIds } }),
    Restaurant.deleteOne({ _id: restaurantId }),
    MenuItem.deleteMany({ _id: { $in: menuItemIds } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);
  await mongoose.disconnect();
});

test('helpers: le code est lisible, normalisé et suffisamment aléatoire', () => {
  const codes = new Set(Array.from({ length: 200 }, () => helpers.createInviteCode()));
  assert.equal(codes.size, 200);
  assert.match([...codes][0], /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(helpers.normalizeCode(' abcd2345 '), 'ABCD2345');
  assert.equal(helpers.FOOD_PARTY_MAD_PER_DASHPOINT, 10);
  assert.equal(helpers.calculateFoodPartyDashPoints(120 + 80 + 100), 30);
});

test('protection JWT et pages réelles sans Cannot GET', async () => {
  const unauthorized = await request('/api/food-party/my');
  assert.equal(unauthorized.response.status, 401);
  const unauthorizedCart = await request('/api/cart');
  assert.equal(unauthorizedCart.response.status, 401);
  const unauthorizedOrder = await request('/api/orders/create', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(unauthorizedOrder.response.status, 401);

  const invalidToken = await request('/api/food-party/my', { token: jwt.sign({ id: 'fake' }, 'wrong-secret') });
  assert.equal(invalidToken.response.status, 401);

  const loginPage = await request('/login');
  assert.equal(loginPage.response.status, 200);
  assert.doesNotMatch(loginPage.body, /Cannot GET/);

  const partyPage = await request('/foodparty.html');
  assert.equal(partyPage.response.status, 200);
  assert.match(partyPage.body, /window\.location\.replace\('\/login'\)/);
  assert.match(partyPage.body, /\/js\/food-party\.js/);
  assert.match(partyPage.body, /Ajouter une adresse dans mon profil/);

  const cartPage = await request('/panier');
  assert.equal(cartPage.response.status, 200);
  assert.match(cartPage.body, /id="cartLayout"/);
  assert.doesNotMatch(cartPage.body, /Cannot GET/);
});

test('catalogue: page, API, catégories, recherche et panier', async () => {
  const cataloguePage = await request('/catalogue');
  assert.equal(cataloguePage.response.status, 200);
  assert.match(cataloguePage.body, /id="menuItemsGrid"/);
  assert.match(cataloguePage.body, /\/css\/catalogue\.css/);

  const homePage = await request('/');
  assert.equal(homePage.response.status, 200);
  assert.match(homePage.body, /href="\/catalogue\.html"[^>]*class="action-card"/);

  const allItems = await request('/api/menuitems');
  assert.equal(allItems.response.status, 200);
  for (const category of MenuItem.MENU_CATEGORIES) {
    const categoryResponse = await request(`/api/menuitems?category=${category}`);
    assert.equal(categoryResponse.response.status, 200);
    assert.ok(categoryResponse.body.menuItems.some((item) => item.name === `Catalogue ${category} ${suffix}`));
    assert.ok(categoryResponse.body.menuItems.every((item) => item.category === category));
  }

  const detail = await request(`/api/menuitems/${menuItemIds[0]}`);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.menuItem._id, menuItemIds[0]);
  assert.ok(detail.body.menuItem.restaurant.name);

  const sampleItems = [
    { _id: 'a', name: 'Pizza Atlas', category: 'pizzas', price: 70, restaurant: { _id: 'r', name: 'Atlas' } },
    { _id: 'b', name: 'Burger Vert', category: 'burgers', price: 60, restaurant: { _id: 'r', name: 'Atlas' } }
  ];
  assert.deepEqual(catalogueHelpers.filterCatalogueItems(sampleItems, 'pizza', 'pizzas').map((item) => item._id), ['a']);
  let cart = catalogueHelpers.addCatalogueItemToCart([], sampleItems[0]);
  cart = catalogueHelpers.addCatalogueItemToCart(cart, sampleItems[0]);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);
});

test('restaurant menu: informations, menu filtré, promotions, quantités et panier', async () => {
  const page = await request(`/restaurant-menu.html?id=${restaurantId}`);
  assert.equal(page.response.status, 200);
  assert.match(page.body, /id="restaurantMenuSections"/);
  assert.match(page.body, /\/css\/restaurant-menu\.css/);

  const restaurant = await request(`/api/restaurants/${restaurantId}`);
  assert.equal(restaurant.response.status, 200);
  assert.equal(restaurant.body.restaurant._id, restaurantId);
  assert.equal(restaurant.body.restaurant.cuisine, 'Cuisine de test');
  assert.equal(restaurant.body.restaurant.isOpen, true);

  const allMenuItems = await request(`/api/menuitems?restaurant=${restaurantId}`);
  assert.equal(allMenuItems.response.status, 200);
  assert.equal(allMenuItems.body.menuItems.length, 6);
  assert.ok(allMenuItems.body.menuItems.every((item) => item.restaurant._id === restaurantId));

  const entrees = await request(`/api/menuitems?restaurant=${restaurantId}&category=entrees`);
  assert.equal(entrees.response.status, 200);
  assert.equal(entrees.body.menuItems.length, 1);
  assert.ok(entrees.body.menuItems.every((item) => item.category === 'entrees'));

  const promotions = await request(`/api/menuitems?restaurant=${restaurantId}&category=promotions`);
  assert.equal(promotions.response.status, 200);
  assert.equal(promotions.body.menuItems.length, 1);
  assert.equal(promotions.body.menuItems[0].badge, 'promo');

  const restaurantMenu = await request(`/api/restaurants/${restaurantId}/menu`);
  assert.equal(restaurantMenu.response.status, 200);
  assert.equal(restaurantMenu.body.menuItems.length, 6);

  const sample = allMenuItems.body.menuItems[0];
  assert.equal(restaurantMenuHelpers.filterRestaurantMenu(allMenuItems.body.menuItems, 'promotions').length, 1);
  let cart = restaurantMenuHelpers.addRestaurantItemToCart([], sample, 2);
  cart = restaurantMenuHelpers.addRestaurantItemToCart(cart, sample, 3);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 5);
  const guestTotals = cartHelpers.calculateLocalCart([{ price: 30, quantity: 2, deliveryFee: 7, freeDelivery: false }]);
  assert.equal(guestTotals.subtotal, 60);
  assert.equal(guestTotals.deliveryFee, 7);
  assert.equal(guestTotals.total, 67);

  const restaurantsScript = await request('/js/restaurants.js');
  assert.match(restaurantsScript.body, /restaurant-menu\.html\?id=/);
});

test('parcours complet: créer, rejoindre, gérer le panier et commander', async () => {
  const hostToken = await registerAndLogin('Hôte Food Party', hostEmail, {
    label: 'Domicile', address: '10 avenue de l’Hôte, Casablanca', latitude: 33.57, longitude: -7.59
  });
  const guestToken = await registerAndLogin('Invité Food Party', guestEmail, {
    label: 'Domicile', address: '20 avenue de l’Invité, Rabat', latitude: 34.02, longitude: -6.83
  });

  const hostProfile = await request('/api/users/me', { token: hostToken });
  assert.equal(hostProfile.response.status, 200);
  assert.equal(hostProfile.body.user.deliveryAddress.address, '10 avenue de l’Hôte, Casablanca');
  assert.equal(hostProfile.body.user.deliveryAddress.latitude, 33.57);

  const emptyUserCart = await request('/api/cart', { token: hostToken });
  assert.equal(emptyUserCart.response.status, 200);
  assert.equal(emptyUserCart.body.cart.items.length, 0);

  const cartAdded = await request('/api/cart/add', {
    token: hostToken, method: 'POST', body: JSON.stringify({ menuItemId: menuItemIds[0], quantity: 2 })
  });
  assert.equal(cartAdded.response.status, 201);
  assert.equal(cartAdded.body.cart.subtotal, 60);
  assert.equal(cartAdded.body.cart.deliveryFee, 7);
  assert.equal(cartAdded.body.cart.total, 67);

  const cartDuplicate = await request('/api/cart/add', {
    token: hostToken, method: 'POST', body: JSON.stringify({ menuItemId: menuItemIds[0], quantity: 1 })
  });
  assert.equal(cartDuplicate.body.cart.items.length, 1);
  assert.equal(cartDuplicate.body.cart.items[0].quantity, 3);
  const cartItemId = cartDuplicate.body.cart.items[0]._id;

  const cartUpdated = await request(`/api/cart/item/${cartItemId}`, {
    token: hostToken, method: 'PUT', body: JSON.stringify({ quantity: 4 })
  });
  assert.equal(cartUpdated.response.status, 200);
  assert.equal(cartUpdated.body.cart.subtotal, 120);

  const cartRemoved = await request(`/api/cart/item/${cartItemId}`, { token: hostToken, method: 'DELETE' });
  assert.equal(cartRemoved.response.status, 200);
  assert.equal(cartRemoved.body.cart.items.length, 0);
  assert.equal(cartRemoved.body.cart.total, 0);

  await request('/api/cart/add', {
    token: hostToken, method: 'POST', body: JSON.stringify({ menuItemId: menuItemIds[0], quantity: 2 })
  });
  await mongoose.connect(process.env.MONGO_URI);
  const hostUser = await User.findOne({ email: hostEmail });
  hostUser.deliveryAddress.address = undefined;
  await hostUser.save();
  await mongoose.disconnect();

  const orderWithoutAddress = await request('/api/orders/create', {
    token: hostToken, method: 'POST', body: JSON.stringify({ paymentMethod: 'cash_on_delivery' })
  });
  assert.equal(orderWithoutAddress.response.status, 400);

  const restoredAddress = await request('/api/users/me/address', {
    token: hostToken,
    method: 'PUT',
    body: JSON.stringify({ label: 'Domicile', address: '10 avenue de l’Hôte, Casablanca', latitude: 33.57, longitude: -7.59 })
  });
  assert.equal(restoredAddress.response.status, 200);

  const normalOrder = await request('/api/orders/create', {
    token: hostToken, method: 'POST', body: JSON.stringify({ paymentMethod: 'cash_on_delivery' })
  });
  assert.equal(normalOrder.response.status, 201);
  assert.equal(normalOrder.body.order.subtotal, 60);
  assert.equal(normalOrder.body.order.deliveryFee, 7);
  assert.equal(normalOrder.body.order.total, 67);
  assert.equal(normalOrder.body.order.deliveryAddress, '10 avenue de l’Hôte, Casablanca');
  assert.equal(normalOrder.body.order.status, 'pending');

  const clearedAfterOrder = await request('/api/cart', { token: hostToken });
  assert.equal(clearedAfterOrder.body.cart.items.length, 0);

  await request('/api/cart/add', {
    token: hostToken, method: 'POST', body: JSON.stringify({ menuItemId: menuItemIds[0], quantity: 1 })
  });
  const clearedManually = await request('/api/cart/clear', { token: hostToken, method: 'DELETE' });
  assert.equal(clearedManually.response.status, 200);
  assert.equal(clearedManually.body.cart.items.length, 0);

  const createWithoutAddress = await request('/api/food-party/create', {
    token: hostToken, method: 'POST', body: JSON.stringify({ restaurantId })
  });
  assert.equal(createWithoutAddress.response.status, 400);

  const created = await request('/api/food-party/create', {
    token: hostToken,
    method: 'POST',
    body: JSON.stringify({
      restaurantId,
      deliveryAddress: 'Adresse falsifiée',
      latitude: 0,
      longitude: 0,
      addressConfirmed: true
    })
  });
  assert.equal(created.response.status, 201);
  inviteCode = created.body.party.inviteCode;
  assert.match(inviteCode, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(created.body.party.participants.length, 1);

  const mine = await request('/api/food-party/my', { token: hostToken });
  assert.equal(mine.response.status, 200);
  assert.equal(mine.body.party.inviteCode, inviteCode);

  const joinWithoutAddress = await request(`/api/food-party/${inviteCode}/join`, {
    token: guestToken,
    method: 'POST',
    body: JSON.stringify({})
  });
  assert.equal(joinWithoutAddress.response.status, 400);

  const joined = await request(`/api/food-party/${inviteCode}/join`, {
    token: guestToken,
    method: 'POST',
    body: JSON.stringify({
      deliveryAddress: 'Adresse falsifiée',
      latitude: 0,
      longitude: 0,
      addressConfirmed: true
    })
  });
  assert.equal(joined.response.status, 200);
  assert.equal(joined.body.party.participants.length, 2);
  assert.equal(joined.body.party.participantDeliveries.find((entry) => entry.user.email === guestEmail).deliveryAddress, '20 avenue de l’Invité, Rabat');
  const menuItemId = joined.body.party.restaurant.menuItems[0]._id;

  const hostView = await request(`/api/food-party/${inviteCode}`, { token: hostToken });
  const guestDeliveryFromHost = hostView.body.party.participantDeliveries.find((entry) => entry.user.email === guestEmail);
  assert.equal(guestDeliveryFromHost.deliveryAddress, undefined);

  const hostAdded = await request(`/api/food-party/${inviteCode}/items`, {
    token: hostToken, method: 'POST', body: JSON.stringify({ menuItemId, quantity: 1 })
  });
  assert.equal(hostAdded.response.status, 201);
  assert.equal(hostAdded.body.party.totalPrice, 25);

  const added = await request(`/api/food-party/${inviteCode}/items`, {
    token: guestToken, method: 'POST', body: JSON.stringify({ menuItemId, quantity: 2 })
  });
  assert.equal(added.response.status, 201);
  assert.equal(added.body.party.totalPrice, 75);
  const itemId = added.body.party.items.find((item) => item.addedBy.email === guestEmail)._id;

  const updated = await request(`/api/food-party/${inviteCode}/items/${itemId}`, {
    token: guestToken, method: 'PUT', body: JSON.stringify({ quantity: 3 })
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.party.totalPrice, 100);

  const forbiddenDelete = await request(`/api/food-party/${inviteCode}/items/${itemId}`, { token: hostToken, method: 'DELETE' });
  assert.equal(forbiddenDelete.response.status, 403);

  const removed = await request(`/api/food-party/${inviteCode}/items/${itemId}`, { token: guestToken, method: 'DELETE' });
  assert.equal(removed.response.status, 200);
  assert.equal(removed.body.party.totalPrice, 25);

  const readded = await request(`/api/food-party/${inviteCode}/items`, {
    token: guestToken, method: 'POST', body: JSON.stringify({ menuItemId, quantity: 2 })
  });
  assert.equal(readded.body.party.totalPrice, 75);

  const guestId = joined.body.party.participants.find((participant) => participant.email === guestEmail)._id;
  await mongoose.connect(process.env.MONGO_URI);
  await FoodParty.updateOne(
    { inviteCode, 'participantDeliveries.user': guestId },
    { $set: { 'participantDeliveries.$.addressConfirmed': false } }
  );
  await mongoose.disconnect();

  const blockedByUnconfirmedAddress = await request(`/api/food-party/${inviteCode}/checkout`, {
    token: hostToken, method: 'POST', body: JSON.stringify({})
  });
  assert.equal(blockedByUnconfirmedAddress.response.status, 400);

  const guestProfileUpdated = await request('/api/users/me/address', {
    token: guestToken,
    method: 'PUT',
    body: JSON.stringify({
      label: 'Nouvelle adresse', address: '22 avenue de l’Invité, Rabat', latitude: 34.03, longitude: -6.84
    })
  });
  assert.equal(guestProfileUpdated.response.status, 200);

  const addressUpdated = await request(`/api/food-party/${inviteCode}/address`, {
    token: guestToken,
    method: 'PUT',
    body: JSON.stringify({ deliveryAddress: 'Adresse falsifiée', latitude: 0, longitude: 0, addressConfirmed: true })
  });
  assert.equal(addressUpdated.response.status, 200);
  assert.equal(addressUpdated.body.party.participantDeliveries.find((entry) => entry.user.email === guestEmail).deliveryAddress, '22 avenue de l’Invité, Rabat');

  const forbiddenCheckout = await request(`/api/food-party/${inviteCode}/checkout`, {
    token: guestToken, method: 'POST', body: JSON.stringify({ deliveryAddress: '1 rue de Test' })
  });
  assert.equal(forbiddenCheckout.response.status, 403);

  const checkout = await request(`/api/food-party/${inviteCode}/checkout`, {
    token: hostToken, method: 'POST', body: JSON.stringify({})
  });
  assert.equal(checkout.response.status, 201);
  assert.equal(checkout.body.party.status, 'ordered');
  assert.equal(checkout.body.orders.length, 2);
  assert.equal(checkout.body.dashPoints.awarded, true);
  assert.equal(checkout.body.dashPoints.points, 7);
  assert.equal(checkout.body.party.dashPointsEarned, 7);
  assert.equal(checkout.body.party.dashPointsAwarded, true);
  assert.ok(checkout.body.orders.every((order) => order.sourceType === 'food_party'));
  assert.ok(checkout.body.orders.every((order) => order.dashPointsEligible === false));
  assert.deepEqual(checkout.body.orders.map((order) => order.totalAmount).sort((a, b) => a - b), [32, 57]);
  assert.deepEqual(checkout.body.orders.map((order) => order.deliveryAddress).sort(), ['10 avenue de l’Hôte, Casablanca', '22 avenue de l’Invité, Rabat'].sort());
  assert.deepEqual(
    checkout.body.orders.map((order) => order.deliveryCoordinates.latitude).sort((a, b) => a - b),
    [33.57, 34.03]
  );
  assert.deepEqual(checkout.body.orders.map((order) => order.items[0].quantity).sort(), [1, 2]);

  const hostPointsAfterCheckout = await request('/api/dashpoints/user', { token: hostToken });
  const guestPointsAfterCheckout = await request('/api/dashpoints/user', { token: guestToken });
  assert.equal(hostPointsAfterCheckout.body.data.dashPoints, 7);
  assert.equal(hostPointsAfterCheckout.body.data.totalPointsEarned, 7);
  assert.equal(hostPointsAfterCheckout.body.data.pointsHistory.at(-1).amount, 7);
  assert.match(hostPointsAfterCheckout.body.data.pointsHistory.at(-1).description, /Food Party/);
  assert.equal(guestPointsAfterCheckout.body.data.dashPoints, 0);
  assert.equal(guestPointsAfterCheckout.body.data.totalPointsEarned, 0);

  const duplicateCheckout = await request(`/api/food-party/${inviteCode}/checkout`, {
    token: hostToken, method: 'POST', body: JSON.stringify({})
  });
  assert.equal(duplicateCheckout.response.status, 409);

  for (const order of checkout.body.orders) {
    const delivered = await request(`/api/orders/${order._id}/status`, {
      token: hostToken, method: 'PUT', body: JSON.stringify({ status: 'delivered' })
    });
    assert.equal(delivered.response.status, 200);
    const deliveredAgain = await request(`/api/orders/${order._id}/status`, {
      token: hostToken, method: 'PUT', body: JSON.stringify({ status: 'delivered' })
    });
    assert.equal(deliveredAgain.response.status, 200);
  }

  const hostPointsAfterDelivery = await request('/api/dashpoints/user', { token: hostToken });
  const guestPointsAfterDelivery = await request('/api/dashpoints/user', { token: guestToken });
  assert.equal(hostPointsAfterDelivery.body.data.dashPoints, 7);
  assert.equal(hostPointsAfterDelivery.body.data.pointsHistory.filter((entry) => entry.type === 'earned').length, 1);
  assert.equal(guestPointsAfterDelivery.body.data.dashPoints, 0);

  const locked = await request(`/api/food-party/${inviteCode}/items`, {
    token: guestToken, method: 'POST', body: JSON.stringify({ menuItemId, quantity: 1 })
  });
  assert.equal(locked.response.status, 404);

  const cannotCancelOrdered = await request(`/api/food-party/${inviteCode}/cancel`, { token: hostToken, method: 'POST' });
  assert.equal(cannotCancelOrdered.response.status, 409);

  const secondParty = await request('/api/food-party/create', {
    token: hostToken,
    method: 'POST',
    body: JSON.stringify({ restaurantId, deliveryAddress: 'Adresse falsifiée', addressConfirmed: true })
  });
  assert.equal(secondParty.response.status, 201);
  const cancelled = await request(`/api/food-party/${secondParty.body.party.inviteCode}/cancel`, {
    token: hostToken, method: 'POST'
  });
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.body.party.status, 'cancelled');
});
