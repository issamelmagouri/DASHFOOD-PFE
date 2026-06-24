/**
 * Livreur Dashboard - DashFood
 * Gestion du tableau de bord coursier avec mode demo
 */

// Mode demo si la base de donnees est vide
const DEMO_MODE = false;

// Variables globales
let currentDeliveryId = null;
let pendingStatusUpdate = null;
let refreshInterval = null;

// ==================== INITIALISATION ====================

document.addEventListener('DOMContentLoaded', () => {
    // Verifier l'authentification et le role
    checkAuthAndRole();

    // Charger les donnees
    loadDriverStats();
    loadCurrentDelivery();
    loadAvailableDeliveries();

    // Event listeners
    setupEventListeners();

    // Auto-refresh toutes les 30 secondes
    refreshInterval = setInterval(() => {
        loadAvailableDeliveries();
        loadCurrentDelivery();
    }, 30000);
});

// ==================== AUTHENTIFICATION ====================

function checkAuthAndRole() {
    const token = localStorage.getItem('dashfood_token');
    const userStr = localStorage.getItem('dashfood_user');

    if (!token || !userStr) {
        window.location.href = '/login';
        return;
    }

    try {
        const user = JSON.parse(userStr);

        // Verifier le role livreur
        if (user.role !== 'livreur') {
            showToast('Accès refusé', 'Cette page est réservée aux livreurs', 'error');
            setTimeout(() => {
                window.location.href = '/devenir-livreur';
            }, 2000);
            return;
        }

        // Afficher le nom du livreur
        const driverNameEl = document.getElementById('driverName');
        if (driverNameEl) {
            driverNameEl.textContent = user.name || 'Livreur DashFood';
        }

    } catch (error) {
        console.error('Erreur verification auth:', error);
        window.location.href = '/login';
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Bouton refresh
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }

    // Bouton deconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Modals
    const modalClose = document.getElementById('modalClose');
    const modalOverlay = document.getElementById('modalOverlay');
    const cancelAcceptBtn = document.getElementById('cancelAcceptBtn');

    if (modalClose) modalClose.addEventListener('click', closeAcceptModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeAcceptModal);
    if (cancelAcceptBtn) cancelAcceptBtn.addEventListener('click', closeAcceptModal);

    const confirmAcceptBtn = document.getElementById('confirmAcceptBtn');
    if (confirmAcceptBtn) {
        confirmAcceptBtn.addEventListener('click', confirmAcceptDelivery);
    }

    // Modal status
    const statusModalClose = document.getElementById('statusModalClose');
    const statusModalOverlay = document.getElementById('statusModalOverlay');
    const cancelStatusBtn = document.getElementById('cancelStatusBtn');

    if (statusModalClose) statusModalClose.addEventListener('click', closeStatusModal);
    if (statusModalOverlay) statusModalOverlay.addEventListener('click', closeStatusModal);
    if (cancelStatusBtn) cancelStatusBtn.addEventListener('click', closeStatusModal);

    const confirmStatusBtn = document.getElementById('confirmStatusBtn');
    if (confirmStatusBtn) {
        confirmStatusBtn.addEventListener('click', confirmStatusUpdate);
    }
}

// ==================== CHARGEMENT DES DONNEES ====================

async function loadDriverStats() {
    try {
        if (DEMO_MODE) {
            displayStats(getDemoStats());
            return;
        }

        const token = localStorage.getItem('dashfood_token');
        const response = await fetch('/api/delivery/my-stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayStats(data.stats);
        } else {
            // Fallback vers demo en cas d'erreur
            displayStats(getDemoStats());
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
        displayStats(getDemoStats());
    }
}

function displayStats(stats) {
    document.getElementById('deliveriesToday').textContent = stats.deliveriesToday || 0;
    document.getElementById('totalDeliveries').textContent = stats.totalDeliveries || 0;

    const earningsEl = document.getElementById('earningsToday');
    if (earningsEl) {
        earningsEl.querySelector('.amount').textContent = stats.earningsToday || 0;
    }

    const ratingEl = document.getElementById('averageRating');
    if (ratingEl) {
        ratingEl.querySelector('.rating-value').textContent = (stats.averageRating || 0).toFixed(1);
    }
}

async function loadCurrentDelivery() {
    try {
        if (DEMO_MODE) {
            const demoDelivery = getDemoCurrentDelivery();
            if (demoDelivery) {
                displayCurrentDelivery(demoDelivery);
            } else {
                hideCurrentDelivery();
            }
            return;
        }

        const token = localStorage.getItem('dashfood_token');
        const response = await fetch('/api/delivery/my-current', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.delivery) {
                displayCurrentDelivery(data.delivery);
            } else {
                hideCurrentDelivery();
            }
        } else {
            hideCurrentDelivery();
        }
    } catch (error) {
        console.error('Erreur chargement livraison en cours:', error);
        hideCurrentDelivery();
    }
}

function displayCurrentDelivery(delivery) {
    const section = document.getElementById('currentDeliverySection');
    const card = document.getElementById('currentDeliveryCard');

    if (!section || !card) return;

    section.style.display = 'block';

    const orderId = typeof delivery.orderId === 'object' ? delivery.orderId._id : delivery.orderId;
    const phoneDigits = String(delivery.clientPhone || '').replace(/\D/g, '');
    const nextAction = {
        accepted: { status: 'picked_up', label: 'Commande récupérée', icon: 'fa-box' },
        picked_up: { status: 'on_the_way', label: 'Démarrer la livraison', icon: 'fa-motorcycle' },
        on_the_way: { status: 'delivered', label: 'Confirmer la livraison', icon: 'fa-check-circle' }
    }[delivery.status];

    // Determiner le statut et le libelle
    let statusLabel = '';
    let showDeliverButton = false;

    switch (delivery.status) {
        case 'accepted':
            statusLabel = 'Acceptée';
            showDeliverButton = true;
            break;
        case 'picked_up':
            statusLabel = 'Récupérée';
            showDeliverButton = true;
            break;
        case 'on_the_way':
            statusLabel = 'En route';
            showDeliverButton = true;
            break;
        case 'delivered':
            statusLabel = 'Livrée';
            showDeliverButton = false;
            break;
        default:
            statusLabel = 'En cours';
            showDeliverButton = true;
    }

    // Calculer le temps estime (estimation simple)
    const estimatedTime = delivery.distanceKm ? Math.ceil(delivery.distanceKm * 3) : 15;

    // Initiales du client pour l'avatar
    const clientInitial = delivery.clientName ? delivery.clientName.charAt(0).toUpperCase() : 'C';

    card.innerHTML = `
        <!-- Panneau gauche vert foncé -->
        <div class="delivery-left-panel">
            <div class="delivery-avatar-large">
                <i class="fas fa-motorcycle"></i>
            </div>
            <div class="delivery-number-large">LIVRAISON N°</div>
            <div class="delivery-id-large">DF-${orderId ? orderId.toString().slice(-4) : '----'}</div>
            <div class="delivery-status-badge-large">
                <span class="status-dot"></span>
                ${statusLabel}
            </div>
        </div>

        <!-- Contenu principal -->
        <div class="delivery-right-content">
            <!-- Header avec restaurant et gain -->
            <div class="delivery-main-header">
                <div class="delivery-restaurant-info">
                    <h3>${delivery.restaurantName}</h3>
                    <div class="delivery-restaurant-address">
                        <i class="fas fa-map-marker-alt"></i>
                        ${delivery.restaurantAddress}
                    </div>
                </div>
                <div class="delivery-earning-large">
                    <div class="delivery-earning-label">Gain</div>
                    <div class="delivery-earning-value">
                        ${delivery.driverEarning || 0} <span class="delivery-earning-currency">MAD</span>
                    </div>
                </div>
            </div>

            <!-- Grille d'informations client et restaurant -->
            <div class="delivery-info-grid">
                <div class="delivery-info-block">
                    <div class="delivery-info-label">
                        <i class="fas fa-user"></i>
                        Client
                    </div>
                    <div class="delivery-info-item">
                        <span class="delivery-info-key">Nom</span>
                        <span class="delivery-info-val">${delivery.clientName}</span>
                    </div>
                    <div class="delivery-info-item">
                        <span class="delivery-info-key">Téléphone</span>
                        <span class="delivery-info-val">${delivery.clientPhone}</span>
                    </div>
                    <div class="delivery-info-item">
                        <span class="delivery-info-key">Adresse</span>
                        <span class="delivery-info-val">${delivery.clientAddress}</span>
                    </div>
                </div>

                <div class="delivery-info-block">
                    <div class="delivery-info-label">
                        <i class="fas fa-info-circle"></i>
                        Détails
                    </div>
                    <div class="delivery-info-item">
                        <span class="delivery-info-key">Distance</span>
                        <span class="delivery-info-val"><span id="courierTrackingDistance">${delivery.distanceKm || '—'}</span> km</span>
                    </div>
                    <div class="delivery-info-item">
                        <span class="delivery-info-key">Temps estimé</span>
                        <span class="delivery-info-val"><span id="courierTrackingEta">${estimatedTime}</span> min</span>
                    </div>
                    <div class="delivery-info-item">
                        <span class="delivery-info-key">Statut</span>
                        <span class="delivery-info-val">${statusLabel}</span>
                    </div>
                </div>
            </div>

            <div class="courier-tracking-block">
                <div class="courier-tracking-heading"><div><span>ITINÉRAIRE EN DIRECT</span><h4>Vers l'adresse du client</h4></div><div class="gps-live"><i></i> GPS actif</div></div>
                <div id="courierTrackingMap" class="courier-tracking-map" aria-label="Itinéraire de livraison"></div>
            </div>

            <!-- Timeline -->
            <div class="delivery-timeline-premium">
                <div class="timeline-premium">
                    <div class="timeline-step-premium ${delivery.status === 'accepted' || delivery.status === 'picked_up' || delivery.status === 'on_the_way' || delivery.status === 'delivered' ? 'completed' : ''}">
                        <div class="timeline-icon-premium">
                            <i class="fas fa-check"></i>
                        </div>
                        <div class="timeline-label-premium">Acceptée</div>
                        <div class="timeline-time-premium">20h02</div>
                    </div>
                    <div class="timeline-step-premium ${delivery.status === 'picked_up' || delivery.status === 'on_the_way' || delivery.status === 'delivered' ? 'completed' : delivery.status === 'accepted' ? 'active' : ''}">
                        <div class="timeline-icon-premium">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="timeline-label-premium">Récupérée</div>
                        <div class="timeline-time-premium">20h11</div>
                    </div>
                    <div class="timeline-step-premium ${delivery.status === 'on_the_way' || delivery.status === 'delivered' ? 'completed' : delivery.status === 'picked_up' ? 'active' : ''}">
                        <div class="timeline-icon-premium">
                            <i class="fas fa-motorcycle"></i>
                        </div>
                        <div class="timeline-label-premium">En route</div>
                        <div class="timeline-time-premium">20h16</div>
                    </div>
                    <div class="timeline-step-premium ${delivery.status === 'delivered' ? 'completed' : delivery.status === 'on_the_way' ? 'active' : ''}">
                        <div class="timeline-icon-premium">
                            <i class="fas fa-flag-checkered"></i>
                        </div>
                        <div class="timeline-label-premium">Livrée</div>
                        <div class="timeline-time-premium">~20h30</div>
                    </div>
                </div>
            </div>

            <!-- Contact client -->
            <div class="delivery-contact-section">
                <div class="delivery-client-info">
                    <div class="client-avatar-small">${clientInitial}</div>
                    <div class="client-details-small">
                        <div class="client-label-small">Client</div>
                        <div class="client-name-small">${delivery.clientName}</div>
                        <div class="client-badge">
                            <i class="fas fa-star"></i>
                            Client vérifié
                        </div>
                    </div>
                </div>
                <div class="delivery-contact-actions">
                    <button class="btn-contact" onclick="window.location.href='tel:${delivery.clientPhone}'">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="btn-contact" onclick="window.open('https://wa.me/${phoneDigits}', '_blank', 'noopener')" title="Contacter sur WhatsApp">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            </div>

            <!-- Actions : Livrer et Annuler -->
            ${showDeliverButton ? `
                <div class="delivery-actions-premium">
                    <button class="btn-cancel-delivery" onclick="handleStatusUpdate('${orderId}', 'cancelled')">
                        <i class="fas fa-times-circle"></i>
                        Annuler livraison
                    </button>
                    ${nextAction ? `<button class="btn-deliver" onclick="handleStatusUpdate('${orderId}', '${nextAction.status}')"><i class="fas ${nextAction.icon}"></i>${nextAction.label}</button>` : ''}
                </div>
            ` : ''}
        </div>
    `;

    if (orderId && window.DashFoodTracking) {
        setTimeout(() => window.DashFoodTracking.initCourierMap(orderId).catch(error => showToast('GPS indisponible', error.message, 'error')), 0);
    }
}

function hideCurrentDelivery() {
    const section = document.getElementById('currentDeliverySection');
    if (section) {
        section.style.display = 'none';
    }
}

async function loadAvailableDeliveries() {
    try {
        if (DEMO_MODE) {
            displayAvailableDeliveries(getDemoAvailableDeliveries());
            return;
        }

        const token = localStorage.getItem('dashfood_token');
        const response = await fetch('/api/delivery/available', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayAvailableDeliveries(data.deliveries || []);
        } else {
            displayAvailableDeliveries([]);
        }
    } catch (error) {
        console.error('Erreur chargement livraisons disponibles:', error);
        displayAvailableDeliveries(getDemoAvailableDeliveries());
    }
}

function displayAvailableDeliveries(deliveries) {
    const list = document.getElementById('deliveriesList');
    const emptyState = document.getElementById('emptyState');

    if (!list || !emptyState) return;

    if (deliveries.length === 0) {
        list.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    list.innerHTML = deliveries.map(delivery => {
        // Calculer le temps estime (3 min par km en moyenne)
        const estimatedTime = delivery.distanceKm ? Math.ceil(delivery.distanceKm * 3) : 12;

        return `
            <div class="delivery-available-card">
                <div class="delivery-card-restaurant">${delivery.restaurantName}</div>

                <div class="delivery-card-details">
                    <div class="delivery-card-row">
                        <span class="delivery-card-label">Client</span>
                        <span class="delivery-card-value">${delivery.clientName}</span>
                    </div>
                    <div class="delivery-card-row">
                        <span class="delivery-card-label">Distance</span>
                        <span class="delivery-card-value">${delivery.distanceKm} km</span>
                    </div>
                    <div class="delivery-card-row">
                        <span class="delivery-card-label">Gain</span>
                        <span class="delivery-card-value">${delivery.driverEarning} MAD</span>
                    </div>
                    <div class="delivery-card-row">
                        <span class="delivery-card-label">Temps estimé</span>
                        <span class="delivery-card-value">${estimatedTime} min</span>
                    </div>
                </div>

                <div class="delivery-card-badges">
                    <span class="badge-premium badge-gain">
                        <i class="fas fa-coins"></i>
                        ${delivery.driverEarning} MAD
                    </span>
                    <span class="badge-premium badge-distance">
                        <i class="fas fa-route"></i>
                        ${delivery.distanceKm} km
                    </span>
                    <span class="badge-premium badge-time">
                        <i class="far fa-clock"></i>
                        ${estimatedTime} min
                    </span>
                </div>

                <button class="btn-accept-premium" onclick="handleAcceptDelivery('${delivery._id}')">
                    <i class="fas fa-check-circle"></i>
                    Accepter
                </button>
            </div>
        `;
    }).join('');
}

// ==================== ACTIONS ====================

function handleRefresh() {
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        btn.querySelector('i').classList.add('fa-spin');
    }

    loadAvailableDeliveries();
    loadCurrentDelivery();
    loadDriverStats();

    setTimeout(() => {
        if (btn) {
            btn.querySelector('i').classList.remove('fa-spin');
        }
        showToast('Actualisé', 'Les données ont été mises à jour', 'success');
    }, 1000);
}

function handleLogout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        localStorage.removeItem('dashfood_token');
        localStorage.removeItem('dashfood_user');
        window.location.href = '/login';
    }
}

function handleAcceptDelivery(deliveryId) {
    currentDeliveryId = deliveryId;
    openAcceptModal(deliveryId);
}

function openAcceptModal(deliveryId) {
    const modal = document.getElementById('acceptModal');
    const modalInfo = document.getElementById('modalDeliveryInfo');

    if (!modal || !modalInfo) return;

    // Afficher un message generique
    modalInfo.innerHTML = `
        <div style="padding: 16px; text-align: center;">
            <i class="fas fa-motorcycle" style="font-size: 48px; color: var(--green); margin-bottom: 12px;"></i>
            <p style="font-size: 14px; color: var(--gray);">
                En acceptant cette livraison, vous vous engagez à la récupérer et la livrer au client.
            </p>
        </div>
    `;

    modal.classList.add('active');
}

function closeAcceptModal() {
    const modal = document.getElementById('acceptModal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentDeliveryId = null;
}

async function confirmAcceptDelivery() {
    if (!currentDeliveryId) return;

    showLoading();

    try {
        if (DEMO_MODE) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            closeAcceptModal();
            hideLoading();
            showToast('Livraison acceptée', 'Vous pouvez maintenant récupérer la commande', 'success');
            setTimeout(() => {
                loadCurrentDelivery();
                loadAvailableDeliveries();
            }, 500);
            return;
        }

        const token = localStorage.getItem('dashfood_token');
        const response = await fetch(`/api/delivery/accept/${currentDeliveryId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        hideLoading();

        if (response.ok) {
            closeAcceptModal();
            showToast('Livraison acceptée', 'Vous pouvez maintenant récupérer la commande', 'success');
            setTimeout(() => {
                loadCurrentDelivery();
                loadAvailableDeliveries();
            }, 500);
        } else {
            const data = await response.json();
            showToast('Erreur', data.message || 'Impossible d\'accepter la livraison', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erreur acceptation livraison:', error);
        showToast('Erreur', 'Une erreur est survenue', 'error');
    }
}

function handleStatusUpdate(orderId, newStatus) {
    pendingStatusUpdate = { orderId, newStatus };
    openStatusModal(newStatus);
}

function openStatusModal(newStatus) {
    const modal = document.getElementById('statusModal');
    const statusInfo = document.getElementById('statusUpdateInfo');

    if (!modal || !statusInfo) return;

    let statusLabel = '';
    let statusIcon = '';
    let statusColor = '';

    switch (newStatus) {
        case 'picked_up':
            statusLabel = 'Commande récupérée au restaurant';
            statusIcon = 'fa-box';
            statusColor = '#1976D2';
            break;
        case 'on_the_way':
            statusLabel = 'En route vers le client';
            statusIcon = 'fa-motorcycle';
            statusColor = '#7B1FA2';
            break;
        case 'delivered':
            statusLabel = 'Commande livrée au client';
            statusIcon = 'fa-flag-checkered';
            statusColor = '#2E7D32';
            break;
        case 'cancelled':
            statusLabel = 'Livraison annulée';
            statusIcon = 'fa-times-circle';
            statusColor = '#F31753';
            break;
    }

    statusInfo.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <i class="fas ${statusIcon}" style="font-size: 56px; color: ${statusColor}; margin-bottom: 16px;"></i>
            <h3 style="font-size: 18px; font-weight: 600; color: var(--black); margin-bottom: 8px;">
                ${statusLabel}
            </h3>
        </div>
    `;

    modal.classList.add('active');
}

function closeStatusModal() {
    const modal = document.getElementById('statusModal');
    if (modal) {
        modal.classList.remove('active');
    }
    pendingStatusUpdate = null;
}

async function confirmStatusUpdate() {
    if (!pendingStatusUpdate) return;

    const { orderId, newStatus } = pendingStatusUpdate;

    showLoading();

    try {
        if (DEMO_MODE) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            closeStatusModal();
            hideLoading();
            showToast('Statut mis à jour', 'La livraison a été mise à jour avec succès', 'success');

            if (newStatus === 'delivered' || newStatus === 'cancelled') {
                setTimeout(() => {
                    loadCurrentDelivery();
                    loadDriverStats();
                }, 500);
            } else {
                loadCurrentDelivery();
            }
            return;
        }

        const token = localStorage.getItem('dashfood_token');
        const response = await fetch(`/api/tracking/order/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        hideLoading();

        if (response.ok) {
            closeStatusModal();
            showToast('Statut mis à jour', 'La livraison a été mise à jour avec succès', 'success');

            if (newStatus === 'delivered' || newStatus === 'cancelled') {
                setTimeout(() => {
                    loadCurrentDelivery();
                    loadDriverStats();
                }, 500);
            } else {
                loadCurrentDelivery();
            }
        } else {
            const data = await response.json();
            showToast('Erreur', data.message || 'Impossible de mettre à jour le statut', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erreur mise a jour statut:', error);
        showToast('Erreur', 'Une erreur est survenue', 'error');
    }
}

// ==================== UTILITAIRES ====================

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showToast(title, message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// ==================== DONNEES DEMO ====================

function getDemoStats() {
    return {
        deliveriesToday: 8,
        totalDeliveries: 247,
        earningsToday: 156,
        totalEarnings: 3890,
        averageRating: 4.8
    };
}

function getDemoCurrentDelivery() {
    // Retourne un objet pour simuler une livraison en cours
    return {
        _id: 'demo-current-1',
        orderId: 'ORD123456',
        restaurantName: 'Le Comptoir d\'Or',
        restaurantAddress: '45 Avenue Mohammed V, Casablanca',
        clientName: 'Ahmed Benali',
        clientPhone: '+212 6 12 34 56 78',
        clientAddress: '12 Rue des Fleurs, Maarif, Casablanca',
        distanceKm: 3.5,
        driverEarning: 13.5,
        status: 'picked_up'
    };
}

function getDemoAvailableDeliveries() {
    return [
        {
            _id: 'demo-1',
            restaurantName: 'Pizza Roma',
            clientName: 'Sara El Amrani',
            distanceKm: 2.3,
            driverEarning: 12.3
        },
        {
            _id: 'demo-2',
            restaurantName: 'Sushi Master',
            clientName: 'Youssef Alami',
            distanceKm: 4.8,
            driverEarning: 14.8
        },
        {
            _id: 'demo-3',
            restaurantName: 'Burger House',
            clientName: 'Fatima Zahra',
            distanceKm: 1.5,
            driverEarning: 11.5
        },
        {
            _id: 'demo-4',
            restaurantName: 'Le Jardin Secret',
            clientName: 'Mehdi Rachidi',
            distanceKm: 5.2,
            driverEarning: 15.2
        }
    ];
}

// Animation pour la fermeture des toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);
