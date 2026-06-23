/**
 * Admin Common - DashFood
 * Script commun pour toutes les pages admin
 * Gère : protection auth, sidebar, déconnexion
 */

// ==================== PROTECTION AUTH ADMIN ====================

(function() {
    // Récupère le token et les données utilisateur
    const token = localStorage.getItem('dashfood_token');
    const userStr = localStorage.getItem('dashfood_user');

    // Vérifie si l'utilisateur est connecté
    if (!token || !userStr) {
        window.location.href = '/admin-login.html';
        return;
    }

    try {
        const user = JSON.parse(userStr);

        // Vérifie si l'utilisateur est admin
        if (user.role !== 'admin') {
            console.error('Accès refusé : utilisateur non admin');
            localStorage.removeItem('dashfood_token');
            localStorage.removeItem('dashfood_user');
            window.location.href = '/admin-login.html';
            return;
        }

        // Affiche les informations utilisateur dans la sidebar
        displayUserInfo(user);

    } catch (error) {
        console.error('Erreur parsing user data:', error);
        localStorage.removeItem('dashfood_token');
        localStorage.removeItem('dashfood_user');
        window.location.href = '/admin-login.html';
    }
})();

// ==================== AFFICHAGE UTILISATEUR ====================

function displayUserInfo(user) {
    // Récupère les éléments de la sidebar
    const userNameElement = document.querySelector('.sidebar-user-name');
    const userAvatarElement = document.querySelector('.sidebar-user-avatar');

    if (userNameElement) {
        userNameElement.textContent = user.fullName || 'Admin DashFood';
    }

    if (userAvatarElement) {
        // Prend la première lettre du nom
        const initial = (user.fullName || 'A')[0].toUpperCase();
        userAvatarElement.textContent = initial;
    }
}

// ==================== MENU ACTIF ====================

(function() {
    // Récupère le chemin de la page actuelle
    const currentPage = window.location.pathname.split('/').pop();

    // Map des pages vers les IDs de menu
    const pageMenuMap = {
        'admin-dashboard.html': 'menu-dashboard',
        'admin-users.html': 'menu-users',
        'admin-restaurants.html': 'menu-restaurants',
        'admin-livreurs.html': 'menu-livreurs',
        'admin-orders.html': 'menu-orders',
        'admin-statistics.html': 'menu-statistics'
    };

    // Récupère l'ID du menu correspondant
    const activeMenuId = pageMenuMap[currentPage];

    if (activeMenuId) {
        const menuItem = document.getElementById(activeMenuId);
        if (menuItem) {
            menuItem.classList.add('active');
        }
    }
})();

// ==================== DÉCONNEXION ====================

function handleLogout() {
    // Supprime les données de session
    localStorage.removeItem('dashfood_token');
    localStorage.removeItem('dashfood_user');

    // Redirige vers la page de connexion admin
    window.location.href = '/admin-login.html';
}

// Attache l'événement au bouton de déconnexion
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});

// ==================== HELPER : FORMATER LA DATE ====================

function formatDate(dateString) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

function formatDateTime(dateString) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

function formatTime(dateString) {
    const options = {
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleTimeString('fr-FR', options);
}

// ==================== HELPER : FORMATER LES NOMBRES ====================

function formatNumber(number) {
    return new Intl.NumberFormat('fr-FR').format(number);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount) + ' MAD';
}

// ==================== HELPER : API CALLS ====================

async function apiGet(endpoint) {
    const token = localStorage.getItem('dashfood_token');

    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        // Token invalide ou expiré
        handleLogout();
        throw new Error('Session expirée');
    }

    return await response.json();
}

async function apiPost(endpoint, data) {
    const token = localStorage.getItem('dashfood_token');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (response.status === 401) {
        handleLogout();
        throw new Error('Session expirée');
    }

    return await response.json();
}

async function apiPut(endpoint, data) {
    const token = localStorage.getItem('dashfood_token');

    const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (response.status === 401) {
        handleLogout();
        throw new Error('Session expirée');
    }

    return await response.json();
}

async function apiDelete(endpoint) {
    const token = localStorage.getItem('dashfood_token');

    const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        handleLogout();
        throw new Error('Session expirée');
    }

    return await response.json();
}

// ==================== HELPER : AFFICHER LA DATE D'AUJOURD'HUI ====================

document.addEventListener('DOMContentLoaded', () => {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = today.toLocaleDateString('fr-FR', options);
        dateElement.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }
});
