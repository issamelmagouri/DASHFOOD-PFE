/**
 * Admin Dashboard - DashFood
 * Charge et affiche les statistiques du tableau de bord admin
 */

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    // Rafraîchir toutes les 30 secondes
    setInterval(loadDashboardStats, 30000);
});

// Charge les statistiques du dashboard
async function loadDashboardStats() {
    try {
        const data = await apiGet('/api/admin/dashboard/stats');

        if (data.success) {
            displayStats(data.stats);
            displayActivity(data.recentActivity);
            displayOrdersStatus(data.stats.ordersByStatus);
            displayAlerts(data.stats);
        }
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
    }
}

// Affiche les statistiques principales
function displayStats(stats) {
    document.getElementById('totalUsers').textContent = formatNumber(stats.totalUsers || 0);
    document.getElementById('totalRestaurants').textContent = formatNumber(stats.totalRestaurants || 0);
    document.getElementById('totalLivreurs').textContent = formatNumber(stats.totalLivreurs || 0);
    document.getElementById('ordersToday').textContent = formatNumber(stats.ordersToday || 0);
}

// Affiche l'activité récente
function displayActivity(activity) {
    const feed = document.getElementById('activityFeed');
    if (!activity || (!activity.users.length && !activity.orders.length)) {
        feed.innerHTML = '<p style="text-align: center; color: #999; padding: 40px 0;">Aucune activité récente</p>';
        return;
    }

    // Combine users et orders
    const items = [];

    // Ajoute les nouveaux utilisateurs
    activity.users.forEach(user => {
        items.push({
            type: 'user',
            icon: 'fa-user-plus',
            iconClass: 'user',
            title: `Nouvelle inscription : ${user.fullName}`,
            description: `${getRoleLabel(user.role)} • ${user.email}`,
            time: formatDateTime(user.createdAt),
            timestamp: new Date(user.createdAt).getTime()
        });
    });

    // Ajoute les nouvelles commandes
    activity.orders.forEach(order => {
        items.push({
            type: 'order',
            icon: 'fa-shopping-bag',
            iconClass: 'order',
            title: `Nouvelle commande #${order.orderId}`,
            description: `${order.userId?.fullName || 'Client'} • ${formatCurrency(order.totalAmount)}`,
            time: formatDateTime(order.createdAt),
            timestamp: new Date(order.createdAt).getTime()
        });
    });

    // Trie par date décroissante
    items.sort((a, b) => b.timestamp - a.timestamp);

    // Affiche les 5 premiers
    feed.innerHTML = items.slice(0, 5).map(item => `
        <div class="activity-item">
            <div class="activity-icon ${item.iconClass}">
                <i class="fas ${item.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${item.title}</div>
                <div class="activity-description">${item.description}</div>
            </div>
            <div class="activity-time">${getRelativeTime(item.time)}</div>
        </div>
    `).join('');
}

// Affiche le statut des commandes
function displayOrdersStatus(ordersByStatus) {
    const container = document.getElementById('ordersStatus');

    // Map des statuts
    const statusMap = {
        'pending': { label: 'En attente', count: 0, class: 'pending' },
        'preparation': { label: 'Préparation', count: 0, class: 'preparation' },
        'on_the_way': { label: 'En livraison', count: 0, class: 'en-livraison' },
        'delivered': { label: 'Livrées', count: 0, class: 'livree' },
        'cancelled': { label: 'Annulées', count: 0, class: 'annulee' }
    };

    // Remplit les compteurs
    if (ordersByStatus) {
        ordersByStatus.forEach(item => {
            if (statusMap[item._id]) {
                statusMap[item._id].count = item.count;
            }
        });
    }

    // Affiche les statistiques
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            ${Object.values(statusMap).map(status => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #F3F4F6;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="badge ${status.class}">${status.label}</span>
                    </div>
                    <div style="font-family: var(--font-display); font-size: 24px; font-weight: 600; color: var(--text-primary);">
                        ${status.count}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Affiche les alertes administrateur
function displayAlerts(stats) {
    const container = document.getElementById('adminAlerts');
    const alerts = [];

    // Candidatures restaurants en attente
    if (stats.pendingRestaurantRequests > 0) {
        alerts.push({
            priority: 'medium',
            icon: 'fa-utensils',
            title: `${stats.pendingRestaurantRequests} restaurants en attente de validation`,
            description: 'Candidatures à examiner dans la file partenaires.',
            priorityLabel: 'PRIORITÉ MOYENNE'
        });
    }

    // Candidatures livreurs en attente
    if (stats.pendingDeliveryRequests > 0) {
        alerts.push({
            priority: 'medium',
            icon: 'fa-motorcycle',
            title: `${stats.pendingDeliveryRequests} demandes livreur à examiner`,
            description: 'Nouvelles candidatures en attente de décision.',
            priorityLabel: 'PRIORITÉ MOYENNE'
        });
    }

    // Commande problématique (exemple fictif)
    alerts.push({
        priority: 'high',
        icon: 'fa-exclamation-triangle',
        title: 'Commande problématique signalée',
        description: 'Commande #DF-2031 — litige client en attente de résolution.',
        priorityLabel: 'PRIORITÉ HAUTE'
    });

    // Alerte générique de signalement
    alerts.push({
        priority: 'low',
        icon: 'fa-user',
        title: 'Signalement client à vérifier',
        description: 'Un client a signalé un comportement inapproprié.',
        priorityLabel: 'PRIORITÉ BASSE'
    });

    // Affiche les alertes
    if (alerts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px 0;">Aucune alerte pour le moment</p>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert ${alert.priority}">
            <div class="alert-icon">
                <i class="fas ${alert.icon}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-description">${alert.description}</div>
            </div>
            <div class="alert-priority">${alert.priorityLabel}</div>
        </div>
    `).join('');
}

// Helper : Label du rôle
function getRoleLabel(role) {
    const roles = {
        'client': 'Client',
        'admin': 'Admin',
        'restaurant': 'Restaurant',
        'livreur': 'Livreur'
    };
    return roles[role] || role;
}

// Helper : Temps relatif
function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
}
