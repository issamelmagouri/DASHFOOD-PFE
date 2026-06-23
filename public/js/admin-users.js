/**
 * Admin Users - DashFood
 * Gestion complète des utilisateurs
 */

let allUsers = [];
let filteredUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupFilters();
});

// Charge tous les utilisateurs
async function loadUsers() {
    try {
        const data = await apiGet('/api/admin/users');

        if (data.success) {
            allUsers = data.users;
            filteredUsers = allUsers;
            displayStats();
            displayUsers(filteredUsers);
        }
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        showError('Erreur lors du chargement des utilisateurs');
    }
}

// Affiche les statistiques
function displayStats() {
    const totalUsers = allUsers.length;
    const totalClients = allUsers.filter(u => u.role === 'client').length;
    const totalLivreurs = allUsers.filter(u => u.role === 'livreur').length;
    const totalRestaurants = allUsers.filter(u => u.role === 'restaurant').length;

    document.getElementById('totalUsers').textContent = formatNumber(totalUsers);
    document.getElementById('totalClients').textContent = formatNumber(totalClients);
    document.getElementById('totalLivreurs').textContent = formatNumber(totalLivreurs);
    document.getElementById('totalRestaurants').textContent = formatNumber(totalRestaurants);
}

// Affiche les utilisateurs dans le tableau
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">Aucun utilisateur trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8BC34A 0%, #6FA83C 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                        ${(user.fullName || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${user.fullName || 'Sans nom'}</div>
                        <div style="font-size: 12px; color: #999;">#${user._id.slice(-6)}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>${user.phone || '-'}</td>
            <td>
                <span class="badge ${user.role}">${getRoleLabel(user.role)}</span>
            </td>
            <td>
                <span class="badge ${user.status || 'active'}">${getStatusLabel(user.status || 'active')}</span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser('${user._id}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${user.status === 'blocked' ? `
                        <button class="action-btn accept" onclick="unblockUser('${user._id}')" title="Débloquer">
                            <i class="fas fa-unlock"></i>
                        </button>
                    ` : `
                        <button class="action-btn block" onclick="blockUser('${user._id}')" title="Bloquer">
                            <i class="fas fa-ban"></i>
                        </button>
                    `}
                    <button class="action-btn delete" onclick="deleteUser('${user._id}')" title="Supprimer">
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
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');

    searchInput.addEventListener('input', applyFilters);
    roleFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
}

// Applique les filtres
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    filteredUsers = allUsers.filter(user => {
        // Filtre de recherche
        const matchesSearch = !searchTerm ||
            user.fullName?.toLowerCase().includes(searchTerm) ||
            user.email?.toLowerCase().includes(searchTerm);

        // Filtre de rôle
        const matchesRole = !roleFilter || user.role === roleFilter;

        // Filtre de statut
        const matchesStatus = !statusFilter || (user.status || 'active') === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
    });

    displayUsers(filteredUsers);
}

// Voir les détails d'un utilisateur
async function viewUser(userId) {
    try {
        const data = await apiGet(`/api/admin/users/${userId}`);

        if (data.success) {
            alert(`Détails utilisateur:\n\nNom: ${data.user.fullName}\nEmail: ${data.user.email}\nRôle: ${getRoleLabel(data.user.role)}\nStatut: ${getStatusLabel(data.user.status || 'active')}\nInscription: ${formatDate(data.user.createdAt)}`);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du chargement des détails');
    }
}

// Bloque un utilisateur
async function blockUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir bloquer cet utilisateur ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/users/${userId}/block`);

        if (data.success) {
            showSuccess('Utilisateur bloqué avec succès');
            loadUsers(); // Recharge la liste
        } else {
            showError(data.message || 'Erreur lors du blocage');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du blocage');
    }
}

// Débloque un utilisateur
async function unblockUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir débloquer cet utilisateur ?')) {
        return;
    }

    try {
        const data = await apiPut(`/api/admin/users/${userId}/unblock`);

        if (data.success) {
            showSuccess('Utilisateur débloqué avec succès');
            loadUsers(); // Recharge la liste
        } else {
            showError(data.message || 'Erreur lors du déblocage');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors du déblocage');
    }
}

// Supprime un utilisateur
async function deleteUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir SUPPRIMER définitivement cet utilisateur ?\n\nCette action est irréversible !')) {
        return;
    }

    try {
        const data = await apiDelete(`/api/admin/users/${userId}`);

        if (data.success) {
            showSuccess('Utilisateur supprimé avec succès');
            loadUsers(); // Recharge la liste
        } else {
            showError(data.message || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de la suppression');
    }
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

// Helper : Label du statut
function getStatusLabel(status) {
    const statuses = {
        'active': 'Actif',
        'blocked': 'Bloqué'
    };
    return statuses[status] || status;
}

// Helper : Affiche un message d'erreur
function showError(message) {
    alert('❌ ' + message);
}

// Helper : Affiche un message de succès
function showSuccess(message) {
    alert('✅ ' + message);
}
