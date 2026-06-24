/**
 * Gestion de la page "Mes Commandes"
 * - Vérifie l'authentification
 * - Affiche les commandes avec filtres
 * - Gère les actions (recommander, annuler)
 */

// Mode démo : affiche des commandes fictives si aucune commande réelle
const DEMO_MODE = true;

let allOrders = [];
let currentFilter = 'all';

function getOrderDashPoints(order) {
    if (order.dashPointsEligible === false) return 0;
    return order.dashPointsEarned ?? Math.floor(order.totalAmount || 0);
}

// Au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupFilters();
    loadOrders();
});

/**
 * Vérifie l'authentification et redirige si nécessaire
 */
function checkAuthentication() {
    const token = localStorage.getItem('dashfood_token');
    const userStr = localStorage.getItem('dashfood_user');

    if (!token || !userStr) {
        window.location.href = '/login';
        return false;
    }

    return true;
}

/**
 * Génère des commandes de démonstration pour visualiser le design
 * Utilisé uniquement si DEMO_MODE === true et aucune commande réelle
 */
function getDemoOrders() {
    const now = new Date();
    const today = new Date(now);
    const yesterday = new Date(now.setDate(now.getDate() - 1));
    const lastWeek = new Date(now.setDate(now.getDate() - 6));
    const twoWeeksAgo = new Date(now.setDate(now.getDate() - 7));

    return [
        // Commande active - Le Comptoir d'Or
        {
            _id: '507f1f77bcf86cd799442826',  // Se termine par 2826
            restaurantName: 'Le Comptoir d\'Or',
            items: [
                { name: 'Tajine d\'agneau aux pruneaux', quantity: 1, price: 145 },
                { name: 'Couscous royal', quantity: 1, price: 165 },
                { name: 'Pastilla au poulet', quantity: 1, price: 38 }
            ],
            totalAmount: 348,
            status: 'on_the_way',
            driverName: 'Karim B.',
            dashPointsEarned: 348,
            createdAt: today.toISOString(),
            confirmedAt: new Date(today.getTime() - 18 * 60000).toISOString(),  // -18 min
            preparingAt: new Date(today.getTime() - 12 * 60000).toISOString(),  // -12 min
            onTheWayAt: new Date(today.getTime() - 4 * 60000).toISOString()     // -4 min
        },

        // Commande historique 1 - Sushi Maison (livrée)
        {
            _id: '507f1f77bcf86cd799443157',
            restaurantName: 'Sushi Maison',
            items: [
                { name: 'California Roll', quantity: 2, price: 55 },
                { name: 'Dragon Roll', quantity: 1, price: 75 },
                { name: 'Miso Soup', quantity: 2, price: 20 },
                { name: 'Edamame', quantity: 1, price: 25 }
            ],
            totalAmount: 175,
            status: 'delivered',
            driverName: 'Youssef M.',
            dashPointsEarned: 175,
            createdAt: yesterday.toISOString(),
            confirmedAt: yesterday.toISOString(),
            deliveredAt: yesterday.toISOString()
        },

        // Commande historique 2 - Pizzeria Toscana (livrée)
        {
            _id: '507f1f77bcf86cd799443258',
            restaurantName: 'Pizzeria Toscana',
            items: [
                { name: 'Pizza Quattro Stagioni', quantity: 1, price: 95 },
                { name: 'Pizza Margherita', quantity: 1, price: 75 },
                { name: 'Tiramisu', quantity: 2, price: 40 }
            ],
            totalAmount: 210,
            status: 'delivered',
            driverName: 'Amine K.',
            dashPointsEarned: 210,
            createdAt: lastWeek.toISOString(),
            confirmedAt: lastWeek.toISOString(),
            deliveredAt: lastWeek.toISOString()
        },

        // Commande historique 3 - Burger Atelier (annulée)
        {
            _id: '507f1f77bcf86cd799443359',
            restaurantName: 'Burger Atelier',
            items: [
                { name: 'Burger Classic', quantity: 2, price: 80 },
                { name: 'Frites maison', quantity: 2, price: 30 },
                { name: 'Milkshake vanille', quantity: 1, price: 35 }
            ],
            totalAmount: 145,
            status: 'cancelled',
            driverName: null,
            dashPointsEarned: 0,
            createdAt: twoWeeksAgo.toISOString(),
            cancelledAt: twoWeeksAgo.toISOString(),
            cancellationReason: 'Temps d\'attente trop long'
        }
    ];
}

/**
 * Configure les filtres
 */
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            filterButtons.forEach(b => b.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');

            // Update current filter
            currentFilter = btn.dataset.filter;

            // Filter orders
            filterOrders();
        });
    });
}

/**
 * Charge les commandes depuis l'API
 */
async function loadOrders() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const ordersContent = document.getElementById('ordersContent');
    const messageBanner = document.getElementById('messageBanner');

    // Afficher le loading
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    ordersContent.style.display = 'none';
    messageBanner.style.display = 'none';

    try {
        const token = localStorage.getItem('dashfood_token');

        const response = await fetch('/api/orders/my-orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            allOrders = data.orders || [];

            // Si mode démo activé et aucune commande réelle, utiliser les données de démonstration
            if (DEMO_MODE && allOrders.length === 0) {
                console.log('Mode démo activé : affichage de commandes de démonstration');
                allOrders = getDemoOrders();
            }

            if (allOrders.length === 0) {
                // Aucune commande (même en mode démo désactivé)
                loadingState.style.display = 'none';
                emptyState.style.display = 'block';
            } else {
                // Afficher les commandes (réelles ou démo)
                loadingState.style.display = 'none';
                ordersContent.style.display = 'block';
                updateFilterCounts();
                filterOrders();
            }
        } else {
            throw new Error(data.message || 'Erreur lors du chargement des commandes');
        }

    } catch (error) {
        console.error('Error loading orders:', error);
        loadingState.style.display = 'none';
        emptyState.style.display = 'none';
        showMessage('error', 'Erreur lors du chargement des commandes');
    }
}

/**
 * Met à jour les compteurs des filtres
 */
function updateFilterCounts() {
    const activeOrders = allOrders.filter(o => ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(o.status));
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
    const cancelledOrders = allOrders.filter(o => o.status === 'cancelled');

    document.getElementById('countAll').textContent = allOrders.length;
    const countActive = document.getElementById('countActive');
    const countDelivered = document.getElementById('countDelivered');
    const countCancelled = document.getElementById('countCancelled');

    if (countActive) countActive.textContent = activeOrders.length;
    if (countDelivered) countDelivered.textContent = deliveredOrders.length;
    if (countCancelled) countCancelled.textContent = cancelledOrders.length;
}

/**
 * Filtre et affiche les commandes
 */
function filterOrders() {
    let filteredOrders = [];

    switch (currentFilter) {
        case 'all':
            filteredOrders = allOrders;
            break;
        case 'active':
            filteredOrders = allOrders.filter(o => ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(o.status));
            break;
        case 'delivered':
            filteredOrders = allOrders.filter(o => o.status === 'delivered');
            break;
        case 'cancelled':
            filteredOrders = allOrders.filter(o => o.status === 'cancelled');
            break;
    }

    displayOrders(filteredOrders);
}

/**
 * Affiche les commandes dans les sections appropriées
 */
function displayOrders(orders) {
    const activeOrdersSection = document.getElementById('activeOrdersSection');
    const activeOrdersList = document.getElementById('activeOrdersList');
    const historySection = document.getElementById('historySection');
    const historyOrdersList = document.getElementById('historyOrdersList');

    // Séparer les commandes actives et historiques
    const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(o.status));
    const historicalOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

    // Section active
    if (activeOrders.length > 0) {
        activeOrdersSection.style.display = 'block';
        activeOrdersList.innerHTML = activeOrders.map(order => createActiveOrderCard(order)).join('');
    } else {
        activeOrdersSection.style.display = 'none';
    }

    // Section historique
    if (historicalOrders.length > 0) {
        historySection.style.display = 'block';
        historyOrdersList.innerHTML = historicalOrders.map(order => createHistoryOrderCard(order)).join('');
    } else {
        historySection.style.display = 'none';
    }

    // Si aucune commande dans les deux sections
    if (activeOrders.length === 0 && historicalOrders.length === 0) {
        document.getElementById('ordersContent').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
    }

    // Attacher les événements après le rendu
    attachOrderEvents();
}

/**
 * Cr\u00e9e le HTML d'une carte de commande active (avec timeline)
 */
function createActiveOrderCard(order) {
    const orderDate = new Date(order.createdAt);
    const day = orderDate.getDate();
    const month = orderDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();

    const itemsList = order.items.map(item =>
        `${item.quantity}× ${item.name}`
    ).join(' • ');

    const orderTime = orderDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const timeline = createTimeline(order);

    return `
        <div class="order-card" data-order-id="${order._id}">
            <div class="order-left-panel">
                <div class="order-number-badge">COMMANDE N° DF-${order._id.slice(-4).toUpperCase()}</div>
                <div class="order-icon-circle"></div>
            </div>

            <div class="order-right-content">
                <div class="delivery-estimate">
                    <div class="estimate-label">LIVRAISON ESTIMÉE</div>
                    <div class="estimate-time"><span class="estimate-time-value">25</span>min</div>
                    <div class="estimate-arrival">vers 20h30</div>
                </div>

                <div class="order-content-header">
                    <div class="order-restaurant-info">
                        <h3>${order.restaurantName}</h3>
                        <p class="order-meta">${order.items.length} article${order.items.length > 1 ? 's' : ''} • Commandée à ${orderTime} • Coursier : ${order.driverName || 'En attente'}</p>
                    </div>
                </div>

                ${timeline}

                <div class="order-delivery-info">
                    <div class="delivery-courier">
                        <div class="courier-avatar">K</div>
                        <div class="courier-info">
                            <div class="courier-info-label">VOTRE COURSIER</div>
                            <div class="courier-name-rating">
                                <span class="courier-name">${order.driverName || 'Karim B.'}</span>
                                <span class="courier-rating">★ 4.9</span>
                            </div>
                        </div>
                        <div class="courier-actions">
                            <button class="courier-action-btn">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="courier-action-btn">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="delivery-totals">
                        <div class="delivery-total-item">
                            <div class="delivery-total-label">TOTAL</div>
                            <div class="delivery-total-value">${order.totalAmount} <span style="font-size: 16px; color: #666;">MAD</span></div>
                        </div>
                        <div class="delivery-total-item">
                            <div class="delivery-total-label">DASHPOINTS</div>
                            <div class="delivery-points-value">+${getOrderDashPoints(order)} <span class="delivery-points-label">pts</span></div>
                        </div>
                    </div>

                    <button class="delivery-track-btn" onclick="window.location.href='/suivi-commande.html?orderId=${order._id}'">
                        SUIVRE
                        <div class="btn-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crée le HTML d'une carte de commande historique
 */
function createHistoryOrderCard(order) {
    const orderDate = new Date(order.createdAt);
    const day = orderDate.getDate();
    const month = orderDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();

    const panelClass = order.status === 'cancelled' ? 'cancelled' : '';
    const statusClass = `status-${order.status}`;
    const statusLabel = order.status === 'delivered' ? 'LIVRÉE' : 'ANNULÉE';

    const itemsHTML = order.items.map(item =>
        `<div class="order-item-row">${item.quantity}× ${item.name}</div>`
    ).join('');

    const pointsBadge = order.status === 'delivered' && order.dashPointsEligible === false
        ? `<div class="order-points-label-cancelled">DashPoints Food Party attribués uniquement à l'hôte</div>`
        : order.status === 'delivered'
        ? `<div class="order-points-badge">
                <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.2"/>
                    <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="points-earned">+${getOrderDashPoints(order)}</span> DashPoints gagnés
            </div>`
        : `<div class="order-points-label-cancelled">DashPoints non comptabilisés</div>`;

    const actionsHTML = order.status === 'delivered'
        ? `<div class="order-actions">
                <button class="action-btn reorder-btn" data-order-id="${order._id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 4v6h6M23 20v-6h-6"/>
                        <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
                    </svg>
                    RECOMMANDER
                </button>
                <button class="action-btn" data-order-id="${order._id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    DÉTAILS
                </button>
            </div>`
        : `<div class="order-actions">
                <button class="action-btn" data-order-id="${order._id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    DÉTAILS
                </button>
            </div>`;

    return `
        <div class="order-card" data-order-id="${order._id}">
            <div class="order-left-panel ${panelClass}">
                <div class="order-date-box">
                    <div class="order-date-day">${day}</div>
                    <div class="order-date-month">${month}</div>
                </div>
                <div class="order-icon-circle"></div>
            </div>

            <div class="order-right-content">
                <div class="order-content-header">
                    <div class="order-restaurant-info">
                        <h3>${order.restaurantName}</h3>
                        <p class="order-meta">N° DF-${order._id.slice(-4).toUpperCase()}</p>
                    </div>
                    <div class="order-status-badge ${statusClass}">
                        ${statusLabel}
                    </div>
                </div>

                <div class="order-items-list">
                    ${itemsHTML}
                </div>

                <div class="order-content-footer">
                    <div class="order-price-info">
                        <span class="order-price">${order.totalAmount}</span>
                        <span class="order-currency">MAD</span>
                    </div>
                    ${pointsBadge}
                </div>

                ${actionsHTML}
            </div>
        </div>
    `;
}

/**
 * Crée la timeline pour les commandes actives
 */
function createTimeline(order) {
    const steps = [
        { key: 'confirmed', label: 'Confirmée', time: '19h42' },
        { key: 'preparing', label: 'Préparation', time: '19h48' },
        { key: 'on_the_way', label: 'En route', time: '19h56' },
        { key: 'delivered', label: 'Livrée', time: '~20h08' }
    ];

    const statusOrder = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);

    const stepsHTML = steps.map((step, index) => {
        let stepClass = '';
        if (index < currentIndex) stepClass = 'completed';
        else if (index === currentIndex) stepClass = 'active';

        return `
            <div class="timeline-step ${stepClass}">
                <div class="timeline-dot">
                    <svg viewBox="0 0 16 16" fill="none">
                        <path d="M5 8L7 10L11 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="timeline-label">${step.label}</div>
                <div class="timeline-time">${step.time}</div>
            </div>
        `;
    }).join('');

    const progressPercent = currentIndex >= 0 ? (currentIndex / (steps.length - 1)) * 100 : 0;

    return `
        <div class="order-timeline">
            <div class="timeline-steps">
                <div class="timeline-line">
                    <div class="timeline-line-progress" style="width: ${progressPercent}%"></div>
                </div>
                ${stepsHTML}
            </div>
        </div>
    `;
}

/**
 * Attache les événements aux boutons des commandes
 */
function attachOrderEvents() {
    // Boutons Recommander
    const reorderButtons = document.querySelectorAll('.reorder-btn');
    reorderButtons.forEach(btn => {
        btn.addEventListener('click', () => reorderOrder(btn.dataset.orderId));
    });

    // Boutons Annuler
    const cancelButtons = document.querySelectorAll('.cancel-order-btn');
    cancelButtons.forEach(btn => {
        btn.addEventListener('click', () => cancelOrder(btn.dataset.orderId));
    });
}

/**
 * Recommande une commande
 */
async function reorderOrder(orderId) {
    if (!confirm('Voulez-vous vraiment commander à nouveau ces articles ?')) return;

    try {
        const token = localStorage.getItem('dashfood_token');

        const response = await fetch(`/api/orders/${orderId}/reorder`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showMessage('success', 'Commande recréée avec succès !');
            setTimeout(() => {
                loadOrders();
            }, 1500);
        } else {
            showMessage('error', data.message || 'Erreur lors de la recommande');
        }

    } catch (error) {
        console.error('Error reordering:', error);
        showMessage('error', 'Erreur de connexion au serveur');
    }
}

/**
 * Annule une commande
 */
async function cancelOrder(orderId) {
    if (!confirm('Voulez-vous vraiment annuler cette commande ?')) return;

    try {
        const token = localStorage.getItem('dashfood_token');

        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reason: 'Annulée par le client'
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('success', 'Commande annulée avec succès');
            setTimeout(() => {
                loadOrders();
            }, 1500);
        } else {
            showMessage('error', data.message || 'Erreur lors de l\'annulation');
        }

    } catch (error) {
        console.error('Error cancelling order:', error);
        showMessage('error', 'Erreur de connexion au serveur');
    }
}

/**
 * Affiche un message
 */
function showMessage(type, message) {
    const messageBanner = document.getElementById('messageBanner');
    messageBanner.textContent = message;
    messageBanner.className = `message-banner ${type}`;
    messageBanner.style.display = 'block';

    messageBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(() => {
        messageBanner.style.display = 'none';
    }, 5000);
}
