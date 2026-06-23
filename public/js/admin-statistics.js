/**
 * Admin Statistics - DashFood
 * Statistiques avancées et analyses
 */

let statsData = null;

// Données DEMO pour présentation (si MongoDB vide)
const DEMO_STATS = {
    totalRevenue: 45750.50,
    totalOrders: 127,
    totalUsers: 89,
    totalRestaurants: 12,
    ordersByStatus: [
        { _id: 'pending', count: 8 },
        { _id: 'preparation', count: 15 },
        { _id: 'on_the_way', count: 12 },
        { _id: 'delivered', count: 87 },
        { _id: 'cancelled', count: 5 }
    ],
    topRestaurants: [
        { restaurantName: 'Le Gourmet Marocain', name: 'Le Gourmet Marocain', orderCount: 45, totalRevenue: 12850.00 },
        { restaurantName: 'Pizza Royale', name: 'Pizza Royale', orderCount: 38, totalRevenue: 10200.50 },
        { restaurantName: 'Sushi Master', name: 'Sushi Master', orderCount: 32, totalRevenue: 9750.00 },
        { restaurantName: 'Burger House', name: 'Burger House', orderCount: 28, totalRevenue: 7340.00 },
        { restaurantName: 'Taj Mahal', name: 'Taj Mahal', orderCount: 24, totalRevenue: 6890.00 },
        { restaurantName: 'La Trattoria', name: 'La Trattoria', orderCount: 20, totalRevenue: 5650.00 },
        { restaurantName: 'Wok Express', name: 'Wok Express', orderCount: 18, totalRevenue: 4920.00 },
        { restaurantName: 'Le Bistrot', name: 'Le Bistrot', orderCount: 15, totalRevenue: 4250.00 },
        { restaurantName: 'Tacos King', name: 'Tacos King', orderCount: 12, totalRevenue: 3180.00 },
        { restaurantName: 'Healthy Bowl', name: 'Healthy Bowl', orderCount: 10, totalRevenue: 2650.00 }
    ],
    topLivreurs: [
        { fullName: 'Ahmed Bennani', name: 'Ahmed Bennani', deliveryCount: 156, totalEarnings: 3120.00 },
        { fullName: 'Fatima Alaoui', name: 'Fatima Alaoui', deliveryCount: 142, totalEarnings: 2840.00 },
        { fullName: 'Youssef El Idrissi', name: 'Youssef El Idrissi', deliveryCount: 128, totalEarnings: 2560.00 },
        { fullName: 'Sara Cherkaoui', name: 'Sara Cherkaoui', deliveryCount: 115, totalEarnings: 2300.00 },
        { fullName: 'Omar Tazi', name: 'Omar Tazi', deliveryCount: 98, totalEarnings: 1960.00 },
        { fullName: 'Khadija Amrani', name: 'Khadija Amrani', deliveryCount: 87, totalEarnings: 1740.00 },
        { fullName: 'Hassan Berrada', name: 'Hassan Berrada', deliveryCount: 76, totalEarnings: 1520.00 },
        { fullName: 'Nadia Fassi', name: 'Nadia Fassi', deliveryCount: 65, totalEarnings: 1300.00 },
        { fullName: 'Karim Ziani', name: 'Karim Ziani', deliveryCount: 54, totalEarnings: 1080.00 },
        { fullName: 'Leila Benjelloun', name: 'Leila Benjelloun', deliveryCount: 42, totalEarnings: 840.00 }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    loadStatistics();
});

// Charge toutes les statistiques
async function loadStatistics() {
    try {
        const data = await apiGet('/api/admin/statistics');

        if (data.success) {
            // Utilise les vraies données si disponibles, sinon DEMO
            const hasRealData = data.stats && (data.stats.totalOrders > 0 || data.stats.totalRevenue > 0);
            statsData = hasRealData ? data.stats : DEMO_STATS;

            displayMainStats();
            displayOrderDistribution();
            displayTopRestaurants();
            displayTopLivreurs();
        }
    } catch (error) {
        console.error('Erreur chargement statistiques:', error);
        // En cas d'erreur, utiliser les données DEMO
        statsData = DEMO_STATS;
        displayMainStats();
        displayOrderDistribution();
        displayTopRestaurants();
        displayTopLivreurs();
        showToast('Mode démonstration activé', 'info');
    }
}

// Affiche les statistiques principales
function displayMainStats() {
    document.getElementById('totalRevenue').textContent = formatCurrency(statsData.totalRevenue || 0);
    document.getElementById('totalOrders').textContent = formatNumber(statsData.totalOrders || 0);
    document.getElementById('totalUsers').textContent = formatNumber(statsData.totalUsers || 0);
    document.getElementById('totalRestaurants').textContent = formatNumber(statsData.totalRestaurants || 0);
}

// Affiche la répartition des commandes
function displayOrderDistribution() {
    const container = document.getElementById('orderDistribution');

    const statusMap = {
        'pending': { label: 'En attente', color: '#F59E0B', icon: 'fa-clock' },
        'preparation': { label: 'Préparation', color: '#3B82F6', icon: 'fa-fire' },
        'on_the_way': { label: 'En livraison', color: '#8BC34A', icon: 'fa-motorcycle' },
        'delivered': { label: 'Livrées', color: '#10B981', icon: 'fa-check-circle' },
        'cancelled': { label: 'Annulées', color: '#EF4444', icon: 'fa-times-circle' }
    };

    // Prépare les données
    const distribution = {};
    Object.keys(statusMap).forEach(status => {
        distribution[status] = 0;
    });

    if (statsData.ordersByStatus) {
        statsData.ordersByStatus.forEach(item => {
            if (distribution[item._id] !== undefined) {
                distribution[item._id] = item.count;
            }
        });
    }

    // Affiche les cartes
    container.innerHTML = Object.entries(statusMap).map(([status, config]) => `
        <div style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 48px; height: 48px; border-radius: 12px; background: ${config.color}15; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${config.icon}" style="color: ${config.color}; font-size: 20px;"></i>
                </div>
                <div style="font-size: 14px; color: #999; text-transform: uppercase; font-weight: 600;">${config.label}</div>
            </div>
            <div style="font-family: var(--font-display); font-size: 32px; font-weight: 600; color: var(--text-primary);">
                ${formatNumber(distribution[status])}
            </div>
        </div>
    `).join('');
}

// Affiche le top 10 des restaurants
function displayTopRestaurants() {
    const tbody = document.getElementById('topRestaurantsTable');

    if (!statsData.topRestaurants || statsData.topRestaurants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #999;">Aucune donnée disponible</td></tr>';
        return;
    }

    tbody.innerHTML = statsData.topRestaurants.slice(0, 10).map((restaurant, index) => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${getMedalColor(index)}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px;">
                        ${index + 1}
                    </div>
                </div>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                        ${(restaurant.restaurantName || restaurant.name || 'R')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${restaurant.restaurantName || restaurant.name || 'Sans nom'}</div>
                    </div>
                </div>
            </td>
            <td style="font-weight: 600;">${formatNumber(restaurant.orderCount || 0)}</td>
            <td style="font-weight: 600; color: var(--green-dark);">${formatCurrency(restaurant.totalRevenue || 0)}</td>
        </tr>
    `).join('');
}

// Affiche le top 10 des livreurs
function displayTopLivreurs() {
    const tbody = document.getElementById('topLivreursTable');

    if (!statsData.topLivreurs || statsData.topLivreurs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #999;">Aucune donnée disponible</td></tr>';
        return;
    }

    tbody.innerHTML = statsData.topLivreurs.slice(0, 10).map((livreur, index) => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${getMedalColor(index)}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px;">
                        ${index + 1}
                    </div>
                </div>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8BC34A 0%, #6FA83C 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                        ${(livreur.fullName || livreur.name || 'L')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${livreur.fullName || livreur.name || 'Sans nom'}</div>
                    </div>
                </div>
            </td>
            <td style="font-weight: 600;">${formatNumber(livreur.deliveryCount || 0)}</td>
            <td style="font-weight: 600; color: var(--green-dark);">${formatCurrency(livreur.totalEarnings || 0)}</td>
        </tr>
    `).join('');
}

// Helper : Couleur de médaille selon le rang
function getMedalColor(index) {
    if (index === 0) return '#FFD700'; // Or
    if (index === 1) return '#C0C0C0'; // Argent
    if (index === 2) return '#CD7F32'; // Bronze
    return '#8BC34A'; // Vert par défaut
}

// Exporter en PDF
function exportPDF() {
    showToast('Fonctionnalité d\'export PDF en cours de développement', 'info');
}

// Exporter en Excel
function exportExcel() {
    showToast('Fonctionnalité d\'export Excel en cours de développement', 'info');
}

// Helper : Affiche un toast premium
function showToast(message, type = 'success') {
    // Crée l'élément toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: var(--font-body);
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease-out;
    `;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `
        <span style="font-size: 20px;">${icon}</span>
        <span>${message}</span>
    `;

    // Ajoute l'animation CSS
    if (!document.querySelector('#toast-animation')) {
        const style = document.createElement('style');
        style.id = 'toast-animation';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Retire le toast après 3 secondes
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
