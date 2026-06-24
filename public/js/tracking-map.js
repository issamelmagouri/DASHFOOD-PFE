(() => {
  'use strict';
  const state = { map: null, courierMarker: null, clientMarker: null, routeLayer: null, socket: null, watchId: null, orderId: null, lastSentAt: 0 };
  const token = () => localStorage.getItem('dashfood_token');
  const byId = id => document.getElementById(id);
  const validPoint = point => point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude));
  const latLng = point => [Number(point.latitude), Number(point.longitude)];

  function markerIcon(kind) {
    return L.divIcon({ className: '', html: `<div class="tracking-marker ${kind}">${kind === 'courier' ? '🛵' : '⌂'}</div>`, iconSize: [42, 42], iconAnchor: [21, 21] });
  }
  function initMap(elementId = 'trackingMap') {
    const element = byId(elementId);
    if (!element || typeof L === 'undefined') throw new Error('La carte Leaflet ne peut pas etre chargee');
    if (state.map) state.map.remove();
    state.courierMarker = null;
    state.clientMarker = null;
    state.routeLayer = null;
    state.map = L.map(element).setView([33.5731, -7.5898], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(state.map);
    return state.map;
  }
  function updateCourierMarker(point, longitude) {
    if (longitude !== undefined) point = { latitude: point, longitude };
    if (!state.map || !validPoint(point)) return;
    if (!state.courierMarker) state.courierMarker = L.marker(latLng(point), { icon: markerIcon('courier'), zIndexOffset: 500 }).addTo(state.map).bindTooltip('Votre coursier');
    else state.courierMarker.setLatLng(latLng(point));
  }
  function updateClientMarker(point, longitude) {
    if (longitude !== undefined) point = { latitude: point, longitude };
    if (!state.map || !validPoint(point)) return;
    if (!state.clientMarker) state.clientMarker = L.marker(latLng(point), { icon: markerIcon('client') }).addTo(state.map).bindTooltip('Adresse de livraison');
    else state.clientMarker.setLatLng(latLng(point));
  }
  function drawRoute(geometry) {
    if (!state.map || !geometry || !Array.isArray(geometry.coordinates)) return;
    const points = geometry.coordinates.map(([lng, lat]) => [Number(lat), Number(lng)]).filter(point => point.every(Number.isFinite));
    if (points.length < 2) return;
    if (state.routeLayer) state.routeLayer.remove();
    state.routeLayer = L.polyline(points, { color: '#f31753', weight: 5, opacity: .86, lineCap: 'round' }).addTo(state.map);
    state.map.fitBounds(state.routeLayer.getBounds(), { padding: [45, 45], maxZoom: 16 });
  }
  function updateETA(value) { const element = byId('trackingEta') || byId('courierTrackingEta'); if (element) element.textContent = Number.isFinite(Number(value)) ? Math.ceil(Number(value)) : '—'; }
  function updateDistance(value) { const element = byId('trackingDistance') || byId('courierTrackingDistance'); if (element) element.textContent = Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—'; }
  function renderPayload(payload) { updateCourierMarker(payload.courierLocation); updateClientMarker(payload.clientLocation); drawRoute(payload.routeGeometry); updateETA(payload.etaMinutes); updateDistance(payload.distanceKm); }
  function connect(orderId, role) {
    if (typeof io === 'undefined') return null;
    if (state.socket) state.socket.disconnect();
    state.socket = io({ auth: { token: token() } });
    state.socket.on('connect', () => state.socket.emit(`${role}:join`, { orderId }));
    state.socket.on('courier:location:broadcast', renderPayload);
    state.socket.on('delivery:eta:update', payload => { updateETA(payload.etaMinutes); updateDistance(payload.distanceKm); });
    state.socket.on('delivery:status:update', payload => window.dispatchEvent(new CustomEvent('dashfood:delivery-status', { detail: payload })));
    return state.socket;
  }
  async function loadTracking(orderId) {
    const response = await fetch(`/api/tracking/order/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Suivi indisponible');
    renderPayload(data.tracking); return data.tracking;
  }
  async function initClientMap(orderId, elementId = 'trackingMap') { state.orderId = orderId; initMap(elementId); connect(orderId, 'client'); return loadTracking(orderId); }
  async function sendLocation(orderId, position) {
    const payload = { orderId, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
    if (state.socket?.connected) {
      state.socket.emit('courier:location:update', payload, result => { if (!result?.success) window.dispatchEvent(new CustomEvent('dashfood:tracking-error', { detail: result?.message || 'Position refusee' })); }); return;
    }
    const response = await fetch(`/api/tracking/order/${encodeURIComponent(orderId)}/location`, { method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).message || 'Position non enregistree');
  }
  async function initCourierMap(orderId, elementId = 'courierTrackingMap') {
    stopCourierTracking(); state.orderId = orderId; initMap(elementId); connect(orderId, 'courier');
    try { await loadTracking(orderId); } catch (error) { console.warn(error.message); }
    if (!navigator.geolocation) throw new Error('Geolocalisation non prise en charge');
    state.watchId = navigator.geolocation.watchPosition(position => {
      const now = Date.now(); updateCourierMarker({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      if (now - state.lastSentAt < 7000) return;
      state.lastSentAt = now; sendLocation(orderId, position).catch(error => window.dispatchEvent(new CustomEvent('dashfood:tracking-error', { detail: error.message })));
    }, error => window.dispatchEvent(new CustomEvent('dashfood:tracking-error', { detail: `GPS: ${error.message}` })), { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 });
    return state;
  }
  function stopCourierTracking() { if (state.watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(state.watchId); state.watchId = null; }
  window.addEventListener('beforeunload', stopCourierTracking);
  window.DashFoodTracking = { initClientMap, initCourierMap, updateCourierMarker, updateClientMarker, drawRoute, updateETA, updateDistance, stopCourierTracking };
})();
