(() => {
  'use strict';
  const labels = { pending: 'En attente du coursier', accepted: 'Commande acceptée', picked_up: 'Commande récupérée', on_the_way: 'Le coursier est en route', delivered: 'Commande livrée', cancelled: 'Livraison annulée', confirmed: 'Commande confirmée', preparing: 'En préparation' };
  const steps = ['accepted', 'picked_up', 'on_the_way', 'delivered'];
  const alertBox = document.getElementById('trackingAlert');
  function showError(message) { alertBox.textContent = message; alertBox.hidden = false; }
  function setStatus(status) {
    document.getElementById('trackingStatus').textContent = labels[status] || status;
    const current = steps.indexOf(status);
    document.querySelectorAll('#trackingTimeline li').forEach((item, index) => { item.classList.toggle('done', current >= index); item.classList.toggle('current', current === index); });
  }
  function render(tracking) {
    document.getElementById('trackingOrderNumber').textContent = tracking.orderNumber;
    document.getElementById('trackingSubtitle').textContent = `${tracking.restaurantName} · mise à jour automatique`;
    document.getElementById('trackingAddress').textContent = tracking.deliveryAddress;
    setStatus(tracking.status);
  }
  document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('dashfood_token')) return window.location.replace('/login');
    const orderId = new URLSearchParams(location.search).get('orderId');
    if (!orderId || !/^[a-f\d]{24}$/i.test(orderId)) return showError('Commande invalide. Revenez à la page Mes commandes.');
    try { render(await window.DashFoodTracking.initClientMap(orderId)); } catch (error) { showError(error.message); }
  });
  window.addEventListener('dashfood:delivery-status', event => setStatus(event.detail.status));
})();
