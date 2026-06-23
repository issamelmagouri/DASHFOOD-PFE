/**
 * Admin Livreurs - DashFood
 * Gestion des candidatures et livreurs actifs
 */

let allLivreurs = [];
let filteredLivreurs = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDeliveryRequests();
    loadLivreurs();
    setupFilters();
});

// Charge les candidatures en attente
async function loadDeliveryRequests() {
    try {
        const data = await apiGet('/api/admin/livreurs/requests');

        if (data.success) {
            displayDeliveryRequests(data.requests);
            updatePendingCount(data.requests.length);
        }
    } catch (error) {
        console.error('Erreur chargement candidatures:', error);
        showError('Erreur lors du chargement des candidatures');
    }
}

// Charge tous les livreurs actifs
async function loadLivreurs() {
    try {
        const data = await apiGet('/api/admin/livreurs');

        if (data.success) {
            allLivreurs = data.livreurs;
            filteredLivreurs = allLivreurs;
            displayStats();
            displayLivreurs(filteredLivreurs);
        }
    } catch (error) {
        console.error('Erreur chargement livreurs:', error);
        showError('Erreur lors du chargement des livreurs');
    }
}

// Affiche les statistiques
function displayStats() {
    const totalLivreurs = allLivreurs.length;
    const activeLivreurs = allLivreurs.filter(l => (l.status || 'active') === 'active').length;
    const suspendedLivreurs = allLivreurs.filter(l => l.status === 'suspended').length;

    document.getElementById('totalLivreurs').textContent = formatNumber(totalLivreurs);
    document.getElementById('activeLivreurs').textContent = formatNumber(activeLivreurs);
    document.getElementById('suspendedLivreurs').textContent = formatNumber(suspendedLivreurs);
}

// Met à jour le compteur de candidatures en attente
function updatePendingCount(count) {
    document.getElementById('pendingLivreurs').textContent = formatNumber(count);
}

// Affiche les candidatures en attente
function displayDeliveryRequests(requests) {
    const tbody = document.getElementById('requestsTableBody');

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">Aucune candidature en attente</td></tr>';
        return;
    }

    tbody.innerHTML = requests.map(request => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8BC34A 0%, #6FA83C 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                        ${(request.fullName || 'L')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${request.fullName || 'Sans nom'}</div>
                        <div style="font-size: 12px; color: #999;">#${request._id.slice(-6)}</div>
                    </div>
                </div>
            </td>
            <td>${request.email}</td>
            <td>${request.phone || '-'}</td>
            <td>${request.vehicleType || '-'}</td>
            <td>${formatDate(request.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewDeliveryRequest('${request._id}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn accept" onclick="acceptDeliveryRequest('${request._id}')" title="Accepter">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn reject" onclick="rejectDeliveryRequest('${request._id}')" title="Refuser">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Affiche les livreurs actifs
function displayLivreurs(livreurs) {
    const tbody = document.getElementById('livreursTableBody');

    if (livreurs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">Aucun livreur trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = livreurs.map(livreur => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8BC34A 0%, #6FA83C 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                        ${(livreur.fullName || 'L')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${livreur.fullName || 'Sans nom'}</div>
                        <div style="font-size: 12px; color: #999;">#${livreur._id.slice(-6)}</div>
                    </div>
                </div>
            </td>
            <td>${livreur.email}</td>
            <td>${livreur.phone || '-'}</td>
            <td>${livreur.vehicleType || '-'}</td>
            <td>
                <span class="badge ${livreur.status === 'suspended' ? 'blocked' : 'active'}">
                    ${livreur.status === 'suspended' ? 'Suspendu' : 'Actif'}
                </span>
            </td>
            <td>${formatDate(livreur.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewLivreur('${livreur._id}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${livreur.status === 'suspended' ? `
                        <button class="action-btn accept" onclick="activateLivreur('${livreur._id}')" title="Activer">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    ` : `
                        <button class="action-btn block" onclick="suspendLivreur('${livreur._id}')" title="Suspendre">
                            <i class="fas fa-pause-circle"></i>
                        </button>
                    `}
                    <button class="action-btn delete" onclick="deleteLivreur('${livreur._id}')" title="Supprimer">
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

    filteredLivreurs = allLivreurs.filter(livreur => {
        // Filtre de recherche
        const matchesSearch = !searchTerm ||
            livreur.fullName?.toLowerCase().includes(searchTerm) ||
            livreur.email?.toLowerCase().includes(searchTerm);

        // Filtre de statut
        const matchesStatus = !statusFilter || (livreur.status || 'active') === statusFilter;

        return matchesSearch && matchesStatus;
    });

    displayLivreurs(filteredLivreurs);
}

// Voir les détails d'une candidature
async function viewDeliveryRequest(requestId) {
    try {
        const data = await apiGet(`/api/admin/livreurs/requests`);

        if (data.success) {
            const request = data.requests.find(r => r._id === requestId);
            if (request) {
                alert(`Détails candidature:\n\nNom: ${request.fullName}\nEmail: ${request.email}\nTéléphone: ${request.phone || '-'}\nVéhicule: ${request.vehicleType || '-'}\nPermis: ${request.driverLicense || '-'}\nDate: ${formatDate(request.createdAt)}`);
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du chargement des détails');
    }
}

// Accepter une candidature
async function acceptDeliveryRequest(userId) {
    if (!confirm('Êtes-vous sûr de vouloir accepter cette candidature ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/livreurs/requests/${userId}/accept`);

        if (data.success) {
            showSuccess('Candidature acceptée avec succès');
            loadDeliveryRequests();
            loadLivreurs();
        } else {
            showError(data.message || 'Erreur lors de l\'acceptation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de l\'acceptation');
    }
}

// Refuser une candidature
async function rejectDeliveryRequest(userId) {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette candidature ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/livreurs/requests/${userId}/reject`);

        if (data.success) {
            showSuccess('Candidature refusée');
            loadDeliveryRequests();
        } else {
            showError(data.message || 'Erreur lors du refus');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du refus');
    }
}

// Voir les détails d'un livreur
async function viewLivreur(livreurId) {
    try {
        const data = await apiGet(`/api/admin/livreurs/${livreurId}`);

        if (data.success) {
            alert(`Détails livreur:\n\nNom: ${data.livreur.fullName}\nEmail: ${data.livreur.email}\nTéléphone: ${data.livreur.phone || '-'}\nVéhicule: ${data.livreur.vehicleType || '-'}\nStatut: ${data.livreur.status === 'suspended' ? 'Suspendu' : 'Actif'}\nInscription: ${formatDate(data.livreur.createdAt)}`);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du chargement des détails');
    }
}

// Suspendre un livreur
async function suspendLivreur(livreurId) {
    if (!confirm('Êtes-vous sûr de vouloir suspendre ce livreur ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/livreurs/${livreurId}/suspend`);

        if (data.success) {
            showSuccess('Livreur suspendu avec succès');
            loadLivreurs();
        } else {
            showError(data.message || 'Erreur lors de la suspension');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de la suspension');
    }
}

// Activer un livreur
async function activateLivreur(livreurId) {
    if (!confirm('Êtes-vous sûr de vouloir activer ce livreur ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/livreurs/${livreurId}/activate`);

        if (data.success) {
            showSuccess('Livreur activé avec succès');
            loadLivreurs();
        } else {
            showError(data.message || 'Erreur lors de l\'activation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de l\'activation');
    }
}

// Supprimer un livreur
async function deleteLivreur(livreurId) {
    if (!confirm('Êtes-vous sûr de vouloir SUPPRIMER définitivement ce livreur ?\n\nCette action est irréversible !')) {
        return;
    }

    try {
        const data = await apiDelete(`/api/admin/livreurs/${livreurId}`);

        if (data.success) {
            showSuccess('Livreur supprimé avec succès');
            loadLivreurs();
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
