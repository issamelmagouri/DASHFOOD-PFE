/**
 * Admin Restaurants - DashFood
 * Gestion des candidatures et restaurants partenaires
 */

let allRestaurants = [];
let filteredRestaurants = [];

document.addEventListener('DOMContentLoaded', () => {
    loadRestaurantRequests();
    loadRestaurants();
    setupFilters();
});

// Charge les candidatures en attente
async function loadRestaurantRequests() {
    try {
        const data = await apiGet('/api/admin/restaurants/requests');

        if (data.success) {
            displayRestaurantRequests(data.requests);
            updatePendingCount(data.requests.length);
        }
    } catch (error) {
        console.error('Erreur chargement candidatures:', error);
        showError('Erreur lors du chargement des candidatures');
    }
}

// Charge tous les restaurants partenaires
async function loadRestaurants() {
    try {
        const data = await apiGet('/api/admin/restaurants');

        if (data.success) {
            allRestaurants = data.restaurants;
            filteredRestaurants = allRestaurants;
            displayStats();
            displayRestaurants(filteredRestaurants);
        }
    } catch (error) {
        console.error('Erreur chargement restaurants:', error);
        showError('Erreur lors du chargement des restaurants');
    }
}

// Affiche les statistiques
function displayStats() {
    const totalRestaurants = allRestaurants.length;
    const activeRestaurants = allRestaurants.filter(r => (r.status || 'active') === 'active').length;
    const suspendedRestaurants = allRestaurants.filter(r => r.status === 'suspended').length;

    document.getElementById('totalRestaurants').textContent = formatNumber(totalRestaurants);
    document.getElementById('activeRestaurants').textContent = formatNumber(activeRestaurants);
    document.getElementById('suspendedRestaurants').textContent = formatNumber(suspendedRestaurants);
}

// Met à jour le compteur de candidatures en attente
function updatePendingCount(count) {
    document.getElementById('pendingRestaurants').textContent = formatNumber(count);
}

// Affiche les candidatures en attente
function displayRestaurantRequests(requests) {
    const tbody = document.getElementById('requestsTableBody');

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">Aucune candidature en attente</td></tr>';
        return;
    }

    tbody.innerHTML = requests.map(request => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                        ${(request.restaurantName || request.fullName || 'R')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${request.restaurantName || request.fullName || 'Sans nom'}</div>
                        <div style="font-size: 12px; color: #999;">#${request._id.slice(-6)}</div>
                    </div>
                </div>
            </td>
            <td>${request.email}</td>
            <td>${request.phone || '-'}</td>
            <td>${request.restaurantAddress || '-'}</td>
            <td>${formatDate(request.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewRestaurantRequest('${request._id}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn accept" onclick="acceptRestaurantRequest('${request._id}')" title="Accepter">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn reject" onclick="rejectRestaurantRequest('${request._id}')" title="Refuser">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Affiche les restaurants partenaires
function displayRestaurants(restaurants) {
    const tbody = document.getElementById('restaurantsTableBody');

    if (restaurants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">Aucun restaurant trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = restaurants.map(restaurant => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                        ${(restaurant.restaurantName || restaurant.fullName || 'R')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${restaurant.restaurantName || restaurant.fullName || 'Sans nom'}</div>
                        <div style="font-size: 12px; color: #999;">#${restaurant._id.slice(-6)}</div>
                    </div>
                </div>
            </td>
            <td>${restaurant.email}</td>
            <td>${restaurant.phone || '-'}</td>
            <td>${restaurant.restaurantAddress || '-'}</td>
            <td>
                <span class="badge ${restaurant.status === 'suspended' ? 'blocked' : 'active'}">
                    ${restaurant.status === 'suspended' ? 'Suspendu' : 'Actif'}
                </span>
            </td>
            <td>${formatDate(restaurant.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewRestaurant('${restaurant._id}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${restaurant.status === 'suspended' ? `
                        <button class="action-btn accept" onclick="activateRestaurant('${restaurant._id}')" title="Activer">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    ` : `
                        <button class="action-btn block" onclick="suspendRestaurant('${restaurant._id}')" title="Suspendre">
                            <i class="fas fa-pause-circle"></i>
                        </button>
                    `}
                    <button class="action-btn delete" onclick="deleteRestaurant('${restaurant._id}')" title="Supprimer">
                        <i class="fas fa-trash"></i>
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

    filteredRestaurants = allRestaurants.filter(restaurant => {
        // Filtre de recherche
        const matchesSearch = !searchTerm ||
            restaurant.restaurantName?.toLowerCase().includes(searchTerm) ||
            restaurant.fullName?.toLowerCase().includes(searchTerm) ||
            restaurant.email?.toLowerCase().includes(searchTerm);

        // Filtre de statut
        const matchesStatus = !statusFilter || (restaurant.status || 'active') === statusFilter;

        return matchesSearch && matchesStatus;
    });

    displayRestaurants(filteredRestaurants);
}

// Voir les détails d'une candidature
async function viewRestaurantRequest(requestId) {
    try {
        const data = await apiGet(`/api/admin/restaurants/requests`);

        if (data.success) {
            const request = data.requests.find(r => r._id === requestId);
            if (request) {
                alert(`Détails candidature:\n\nNom: ${request.restaurantName || request.fullName}\nEmail: ${request.email}\nTéléphone: ${request.phone || '-'}\nAdresse: ${request.restaurantAddress || '-'}\nDate: ${formatDate(request.createdAt)}`);
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du chargement des détails');
    }
}

// Accepter une candidature
async function acceptRestaurantRequest(userId) {
    if (!confirm('Êtes-vous sûr de vouloir accepter cette candidature ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/restaurants/requests/${userId}/accept`);

        if (data.success) {
            showSuccess('Candidature acceptée avec succès');
            loadRestaurantRequests();
            loadRestaurants();
        } else {
            showError(data.message || 'Erreur lors de l\'acceptation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de l\'acceptation');
    }
}

// Refuser une candidature
async function rejectRestaurantRequest(userId) {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette candidature ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/restaurants/requests/${userId}/reject`);

        if (data.success) {
            showSuccess('Candidature refusée');
            loadRestaurantRequests();
        } else {
            showError(data.message || 'Erreur lors du refus');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du refus');
    }
}

// Voir les détails d'un restaurant
async function viewRestaurant(restaurantId) {
    try {
        const data = await apiGet(`/api/admin/restaurants/${restaurantId}`);

        if (data.success) {
            alert(`Détails restaurant:\n\nNom: ${data.restaurant.restaurantName || data.restaurant.fullName}\nEmail: ${data.restaurant.email}\nTéléphone: ${data.restaurant.phone || '-'}\nAdresse: ${data.restaurant.restaurantAddress || '-'}\nStatut: ${data.restaurant.status === 'suspended' ? 'Suspendu' : 'Actif'}\nInscription: ${formatDate(data.restaurant.createdAt)}`);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du chargement des détails');
    }
}

// Suspendre un restaurant
async function suspendRestaurant(restaurantId) {
    if (!confirm('Êtes-vous sûr de vouloir suspendre ce restaurant ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/restaurants/${restaurantId}/suspend`);

        if (data.success) {
            showSuccess('Restaurant suspendu avec succès');
            loadRestaurants();
        } else {
            showError(data.message || 'Erreur lors de la suspension');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de la suspension');
    }
}

// Activer un restaurant
async function activateRestaurant(restaurantId) {
    if (!confirm('Êtes-vous sûr de vouloir activer ce restaurant ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/restaurants/${restaurantId}/activate`);

        if (data.success) {
            showSuccess('Restaurant activé avec succès');
            loadRestaurants();
        } else {
            showError(data.message || 'Erreur lors de l\'activation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de l\'activation');
    }
}

// Supprimer un restaurant
async function deleteRestaurant(restaurantId) {
    if (!confirm('Êtes-vous sûr de vouloir SUPPRIMER définitivement ce restaurant ?\n\nCette action est irréversible !')) {
        return;
    }

    try {
        const data = await apiDelete(`/api/admin/restaurants/${restaurantId}`);

        if (data.success) {
            showSuccess('Restaurant supprimé avec succès');
            loadRestaurants();
        } else {
            showError(data.message || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de la suppression');
    }
}

// Helper : Affiche un message d'erreur
function showError(message) {
    alert('❌ ' + message);
}

// Helper : Affiche un message de succès
function showSuccess(message) {
    alert('✅ ' + message);
}
