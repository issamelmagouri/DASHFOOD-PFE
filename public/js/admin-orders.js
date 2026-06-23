/**
 * Admin Orders - DashFood
 * Gestion complète des commandes
 */

let allOrders = [];
let filteredOrders = [];

// Données DEMO pour présentation (si MongoDB vide)
const DEMO_ORDERS = [
    {
        _id: 'demo1',
        orderId: 'ORD2024001',
        userId: { fullName: 'Mohammed Alami', email: 'mohammed.alami@email.com' },
        restaurantId: { restaurantName: 'Le Gourmet Marocain', fullName: 'Le Gourmet Marocain' },
        totalAmount: 285.00,
        status: 'delivered',
        createdAt: new Date('2024-06-20T12:30:00'),
        updatedAt: new Date('2024-06-20T13:45:00'),
        deliveryAddress: '15 Rue Hassan II, Casablanca',
        items: [
            { name: 'Tajine Poulet Citron', quantity: 2, price: 85.00 },
            { name: 'Couscous Royal', quantity: 1, price: 115.00 }
        ]
    },
    {
        _id: 'demo2',
        orderId: 'ORD2024002',
        userId: { fullName: 'Fatima Zahra', email: 'fatima.z@email.com' },
        restaurantId: { restaurantName: 'Pizza Royale', fullName: 'Pizza Royale' },
        totalAmount: 195.50,
        status: 'on_the_way',
        createdAt: new Date('2024-06-22T19:15:00'),
        updatedAt: new Date('2024-06-22T19:50:00'),
        deliveryAddress: '42 Boulevard Anfa, Casablanca',
        items: [
            { name: 'Pizza 4 Fromages', quantity: 1, price: 125.00 },
            { name: 'Salade César', quantity: 1, price: 45.00 },
            { name: 'Tiramisu', quantity: 1, price: 25.50 }
        ]
    },
    {
        _id: 'demo3',
        orderId: 'ORD2024003',
        userId: { fullName: 'Youssef Bennani', email: 'youssef.b@email.com' },
        restaurantId: { restaurantName: 'Sushi Master', fullName: 'Sushi Master' },
        totalAmount: 420.00,
        status: 'preparation',
        createdAt: new Date('2024-06-23T14:20:00'),
        updatedAt: new Date('2024-06-23T14:20:00'),
        deliveryAddress: '8 Rue des FAR, Rabat',
        items: [
            { name: 'Sushi Mix 24 pièces', quantity: 1, price: 280.00 },
            { name: 'Soupe Miso', quantity: 2, price: 35.00 },
            { name: 'Salade Wakame', quantity: 2, price: 35.00 }
        ]
    },
    {
        _id: 'demo4',
        orderId: 'ORD2024004',
        userId: { fullName: 'Sara Idrissi', email: 'sara.idrissi@email.com' },
        restaurantId: { restaurantName: 'Burger House', fullName: 'Burger House' },
        totalAmount: 165.00,
        status: 'delivered',
        createdAt: new Date('2024-06-21T20:00:00'),
        updatedAt: new Date('2024-06-21T21:10:00'),
        deliveryAddress: '25 Avenue Mohammed V, Marrakech',
        items: [
            { name: 'Burger Bacon', quantity: 2, price: 65.00 },
            { name: 'Frites Maison', quantity: 2, price: 25.00 },
            { name: 'Milkshake Vanille', quantity: 1, price: 35.00 }
        ]
    },
    {
        _id: 'demo5',
        orderId: 'ORD2024005',
        userId: { fullName: 'Omar Tazi', email: 'omar.tazi@email.com' },
        restaurantId: { restaurantName: 'Taj Mahal', fullName: 'Taj Mahal' },
        totalAmount: 310.00,
        status: 'pending',
        createdAt: new Date('2024-06-23T18:45:00'),
        updatedAt: new Date('2024-06-23T18:45:00'),
        deliveryAddress: '12 Rue de la Liberté, Casablanca',
        items: [
            { name: 'Chicken Tikka Masala', quantity: 2, price: 95.00 },
            { name: 'Naan Fromage', quantity: 3, price: 25.00 },
            { name: 'Riz Basmati', quantity: 1, price: 30.00 }
        ]
    },
    {
        _id: 'demo6',
        orderId: 'ORD2024006',
        userId: { fullName: 'Khadija Amrani', email: 'khadija.a@email.com' },
        restaurantId: { restaurantName: 'La Trattoria', fullName: 'La Trattoria' },
        totalAmount: 245.00,
        status: 'delivered',
        createdAt: new Date('2024-06-19T13:30:00'),
        updatedAt: new Date('2024-06-19T14:40:00'),
        deliveryAddress: '7 Boulevard Zerktouni, Casablanca',
        items: [
            { name: 'Pasta Carbonara', quantity: 1, price: 95.00 },
            { name: 'Lasagne Bolognaise', quantity: 1, price: 105.00 },
            { name: 'Panna Cotta', quantity: 2, price: 22.50 }
        ]
    },
    {
        _id: 'demo7',
        orderId: 'ORD2024007',
        userId: { fullName: 'Hassan Berrada', email: 'hassan.b@email.com' },
        restaurantId: { restaurantName: 'Wok Express', fullName: 'Wok Express' },
        totalAmount: 185.00,
        status: 'delivered',
        createdAt: new Date('2024-06-18T19:00:00'),
        updatedAt: new Date('2024-06-18T20:15:00'),
        deliveryAddress: '33 Rue Allal Ben Abdellah, Rabat',
        items: [
            { name: 'Pad Thai Crevettes', quantity: 1, price: 95.00 },
            { name: 'Nems Poulet', quantity: 6, price: 45.00 },
            { name: 'Riz Cantonais', quantity: 1, price: 45.00 }
        ]
    },
    {
        _id: 'demo8',
        orderId: 'ORD2024008',
        userId: { fullName: 'Nadia Fassi', email: 'nadia.fassi@email.com' },
        restaurantId: { restaurantName: 'Le Bistrot', fullName: 'Le Bistrot' },
        totalAmount: 340.00,
        status: 'cancelled',
        createdAt: new Date('2024-06-17T12:00:00'),
        updatedAt: new Date('2024-06-17T12:25:00'),
        deliveryAddress: '5 Place Nations Unies, Casablanca',
        items: [
            { name: 'Steak Frites', quantity: 2, price: 125.00 },
            { name: 'Salade Niçoise', quantity: 1, price: 55.00 },
            { name: 'Crème Brûlée', quantity: 2, price: 35.00 }
        ]
    }
];

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    setupFilters();
});

// Charge toutes les commandes
async function loadOrders() {
    try {
        const data = await apiGet('/api/admin/orders');

        if (data.success) {
            // Utilise les vraies données si disponibles, sinon DEMO
            const hasRealData = data.orders && data.orders.length > 0;
            allOrders = hasRealData ? data.orders : DEMO_ORDERS;
            filteredOrders = allOrders;

            displayStats();
            displayOrders(filteredOrders);
        }
    } catch (error) {
        console.error('Erreur chargement commandes:', error);
        // En cas d'erreur, utiliser les données DEMO
        allOrders = DEMO_ORDERS;
        filteredOrders = allOrders;
        displayStats();
        displayOrders(filteredOrders);
        showToast('Mode démonstration activé', 'info');
    }
}

// Affiche les statistiques
function displayStats() {
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered').length;
    const totalRevenue = allOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    document.getElementById('totalOrders').textContent = formatNumber(totalOrders);
    document.getElementById('pendingOrders').textContent = formatNumber(pendingOrders);
    document.getElementById('deliveredOrders').textContent = formatNumber(deliveredOrders);
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
}

// Affiche les commandes
function displayOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">Aucune commande trouvée</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>
                <div style="font-weight: 600; color: var(--green-dark);">#${order.orderId || order._id.slice(-6).toUpperCase()}</div>
            </td>
            <td>
                <div style="font-weight: 500;">${order.userId?.fullName || 'Client inconnu'}</div>
                <div style="font-size: 12px; color: #999;">${order.userId?.email || '-'}</div>
            </td>
            <td>${order.restaurantId?.restaurantName || order.restaurantId?.fullName || '-'}</td>
            <td style="font-weight: 600;">${formatCurrency(order.totalAmount)}</td>
            <td>
                <span class="badge ${getStatusClass(order.status)}">${getStatusLabel(order.status)}</span>
            </td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewOrderDetails('${order._id}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Configure les filtres
function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    searchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
}

// Applique les filtres
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    filteredOrders = allOrders.filter(order => {
        // Filtre de recherche
        const orderId = order.orderId || order._id.slice(-6).toUpperCase();
        const matchesSearch = !searchTerm || orderId.toLowerCase().includes(searchTerm);

        // Filtre de statut
        const matchesStatus = !statusFilter || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    displayOrders(filteredOrders);
}

// Voir les détails d'une commande
async function viewOrderDetails(orderId) {
    // Cherche la commande dans les données locales
    const order = allOrders.find(o => o._id === orderId);

    if (order) {
        displayOrderModal(order);
    } else {
        // Si pas en local, tenter de charger depuis l'API
        try {
            const data = await apiGet(`/api/admin/orders/${orderId}`);
            if (data.success) {
                displayOrderModal(data.order);
            }
        } catch (error) {
            console.error('Erreur:', error);
            showToast('Erreur lors du chargement des détails', 'error');
        }
    }
}

// Affiche le modal avec les détails de la commande
function displayOrderModal(order) {
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderModalContent');

    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Info générale -->
            <div>
                <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px;">Numéro de commande</div>
                <div style="font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--green-dark);">
                    #${order.orderId || order._id.slice(-6).toUpperCase()}
                </div>
            </div>

            <!-- Statut -->
            <div>
                <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px;">Statut</div>
                <span class="badge ${getStatusClass(order.status)}">${getStatusLabel(order.status)}</span>
            </div>

            <!-- Client -->
            <div>
                <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px;">Client</div>
                <div style="font-weight: 500;">${order.userId?.fullName || 'Client inconnu'}</div>
                <div style="font-size: 14px; color: #666;">${order.userId?.email || '-'}</div>
                <div style="font-size: 14px; color: #666;">${order.userId?.phone || '-'}</div>
            </div>

            <!-- Restaurant -->
            <div>
                <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px;">Restaurant</div>
                <div style="font-weight: 500;">${order.restaurantId?.restaurantName || order.restaurantId?.fullName || '-'}</div>
            </div>

            <!-- Adresse de livraison -->
            <div>
                <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px;">Adresse de livraison</div>
                <div style="font-size: 14px; color: #666;">${order.deliveryAddress || '-'}</div>
            </div>

            <!-- Articles -->
            <div>
                <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px;">Articles commandés</div>
                <div style="background: #F7F4EC; border-radius: 8px; padding: 16px;">
                    ${(order.items || []).map(item => `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <div>
                                <div style="font-weight: 500;">${item.name || 'Article'}</div>
                                <div style="font-size: 12px; color: #999;">Quantité: ${item.quantity || 1}</div>
                            </div>
                            <div style="font-weight: 600;">${formatCurrency(item.price * (item.quantity || 1))}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Montant total -->
            <div>
                <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px;">Montant total</div>
                <div style="font-family: var(--font-display); font-size: 24px; font-weight: 600; color: var(--green-dark);">
                    ${formatCurrency(order.totalAmount)}
                </div>
            </div>

            <!-- Timeline -->
            <div>
                <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 12px;">Timeline</div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--green-light); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-check" style="color: white; font-size: 14px;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">Commande créée</div>
                            <div style="font-size: 12px; color: #999;">${formatDateTime(order.createdAt)}</div>
                        </div>
                    </div>
                    ${order.status !== 'pending' && order.status !== 'cancelled' ? `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--green-light); display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-check" style="color: white; font-size: 14px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500;">En préparation</div>
                                <div style="font-size: 12px; color: #999;">${formatDateTime(order.updatedAt)}</div>
                            </div>
                        </div>
                    ` : ''}
                    ${order.status === 'delivered' ? `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--green-light); display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-check" style="color: white; font-size: 14px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500;">Livrée</div>
                                <div style="font-size: 12px; color: #999;">${formatDateTime(order.updatedAt)}</div>
                            </div>
                        </div>
                    ` : ''}
                    ${order.status === 'cancelled' ? `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #EF4444; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-times" style="color: white; font-size: 14px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500;">Annulée</div>
                                <div style="font-size: 12px; color: #999;">${formatDateTime(order.updatedAt)}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Bouton fermer -->
            <button onclick="closeOrderModal()" style="width: 100%; padding: 14px; background: var(--green-dark); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-family: var(--font-body);">
                Fermer
            </button>
        </div>
    `;

    modal.style.display = 'flex';
}

// Ferme le modal
function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    modal.style.display = 'none';
}

// Helper : Classe CSS du statut
function getStatusClass(status) {
    const statusMap = {
        'pending': 'pending',
        'preparation': 'preparation',
        'on_the_way': 'en-livraison',
        'delivered': 'livree',
        'cancelled': 'annulee'
    };
    return statusMap[status] || 'pending';
}

// Helper : Label du statut
function getStatusLabel(status) {
    const statusMap = {
        'pending': 'En attente',
        'preparation': 'Préparation',
        'on_the_way': 'En livraison',
        'delivered': 'Livrée',
        'cancelled': 'Annulée'
    };
    return statusMap[status] || status;
}

// Helper : Affiche un toast premium
function showToast(message, type = 'success') {
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

    if (!document.querySelector('#toast-animation')) {
        const style = document.createElement('style');
        style.id = 'toast-animation';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
