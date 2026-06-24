const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

function isCoordinate(value) {
  return Number.isFinite(Number(value));
}

function normalizePoint(point) {
  if (!point || !isCoordinate(point.latitude) || !isCoordinate(point.longitude)) {
    throw new Error('Coordonnees invalides');
  }
  return { latitude: Number(point.latitude), longitude: Number(point.longitude) };
}

function haversineDistanceKm(origin, destination) {
  const from = normalizePoint(origin);
  const to = normalizePoint(destination);
  const toRad = value => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(to.latitude - from.latitude);
  const deltaLng = toRad(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude))
    * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fallbackRoute(origin, destination) {
  const from = normalizePoint(origin);
  const to = normalizePoint(destination);
  const distanceKm = haversineDistanceKm(from, to);
  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    etaMinutes: Math.max(1, Math.ceil((distanceKm / 25) * 60)),
    geometry: {
      type: 'LineString',
      coordinates: [[from.longitude, from.latitude], [to.longitude, to.latitude]]
    },
    source: 'fallback'
  };
}

async function getRoute(origin, destination) {
  const from = normalizePoint(origin);
  const to = normalizePoint(destination);
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) return fallbackRoute(from, to);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(ORS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: [[from.longitude, from.latitude], [to.longitude, to.latitude]]
      })
    });
    if (!response.ok) throw new Error(`OpenRouteService ${response.status}`);
    const data = await response.json();
    const feature = data.features && data.features[0];
    const summary = feature && feature.properties && feature.properties.summary;
    if (!feature || !feature.geometry || !summary) throw new Error('Itineraire OpenRouteService incomplet');
    return {
      distanceKm: Number((summary.distance / 1000).toFixed(2)),
      etaMinutes: Math.max(1, Math.ceil(summary.duration / 60)),
      geometry: feature.geometry,
      source: 'openrouteservice'
    };
  } catch (error) {
    console.warn(`Itineraire de secours utilise: ${error.message}`);
    return fallbackRoute(from, to);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getRoute, haversineDistanceKm };
