/**
 * ====================================
 * NAVBAR DYNAMIQUE - DASHFOOD
 * Style Glovo/Uber Eats - Gestion intelligente des rôles
 * ====================================
 */

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    setupDropdownHandlers();
});

/**
 * Initialise la navbar selon le statut de connexion et le rôle
 */
function initNavbar() {
    const token = localStorage.getItem('dashfood_token');
    const userStr = localStorage.getItem('dashfood_user');

    // Récupérer les éléments de la navbar
    const guestActions = document.getElementById('guestActions');
    const clientProfile = document.getElementById('clientProfile');

    // Si l'utilisateur n'est pas connecté
    if (!token || !userStr) {
        // Afficher les boutons connexion/inscription
        if (guestActions) guestActions.style.display = 'flex';
        if (clientProfile) clientProfile.style.display = 'none';
        return;
    }

    try {
        const user = JSON.parse(userStr);

        // Si l'utilisateur est connecté mais n'est PAS un client
        // (admin, livreur, restaurant ne doivent pas voir index.html)
        if (user.role !== 'client') {
            // Rediriger vers leur dashboard respectif
            redirectToDashboard(user.role);
            return;
        }

        // Si l'utilisateur est un CLIENT connecté
        // Cacher les boutons connexion/inscription
        if (guestActions) guestActions.style.display = 'none';

        // Afficher le bouton profil
        if (clientProfile) clientProfile.style.display = 'block';

        // Remplir les informations du profil
        populateProfileData(user);

    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la navbar:', error);
        // En cas d'erreur, afficher les boutons connexion/inscription
        if (guestActions) guestActions.style.display = 'flex';
        if (clientProfile) clientProfile.style.display = 'none';
    }
}

/**
 * Redirige l'utilisateur vers son dashboard selon son rôle
 */
function redirectToDashboard(role) {
    const dashboardUrls = {
        'admin': '/admin-dashboard.html',
        'livreur': '/livreur-dashboard.html',
        'restaurant': '/restaurant-dashboard.html'
    };

    const url = dashboardUrls[role];
    if (url && window.location.pathname === '/' || window.location.pathname === '/index.html') {
        // Rediriger uniquement si on est sur la page d'accueil
        window.location.href = url;
    }
}

/**
 * Remplit les données du profil dans la navbar et le dropdown
 */
function populateProfileData(user) {
    // Extraire le prénom du fullName (premier mot avant l'espace)
    const firstName = extractFirstName(user.fullName);

    // Mettre à jour le nom dans le bouton profil
    const profileName = document.getElementById('profileName');
    if (profileName) {
        profileName.textContent = firstName;
    }

    // Mettre à jour le nom complet dans le dropdown
    const dropdownFullName = document.getElementById('dropdownFullName');
    if (dropdownFullName) {
        dropdownFullName.textContent = user.fullName;
    }

    // Mettre à jour l'email dans le dropdown
    const dropdownEmail = document.getElementById('dropdownEmail');
    if (dropdownEmail) {
        dropdownEmail.textContent = user.email;
    }
}

/**
 * Extrait le prénom du nom complet
 * Exemple: "Issam El Magouri" → "Issam"
 */
function extractFirstName(fullName) {
    if (!fullName) return 'Client';

    // Séparer par espace et prendre le premier mot
    const parts = fullName.trim().split(' ');
    return parts[0] || 'Client';
}

/**
 * Configure les handlers pour le dropdown (ouverture/fermeture)
 */
function setupDropdownHandlers() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!profileBtn || !profileDropdown) return;

    // Toggle du dropdown au clic sur le bouton profil
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    // Fermer le dropdown si on clique en dehors
    document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
            closeDropdown();
        }
    });

    // Empêcher la fermeture si on clique dans le dropdown
    profileDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Handler pour la déconnexion
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Toggle l'affichage du dropdown
 */
function toggleDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (!profileBtn || !profileDropdown) return;

    const isOpen = profileDropdown.classList.contains('show');

    if (isOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

/**
 * Ouvre le dropdown
 */
function openDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (!profileBtn || !profileDropdown) return;

    profileBtn.classList.add('active');
    profileDropdown.classList.add('show');
}

/**
 * Ferme le dropdown
 */
function closeDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (!profileBtn || !profileDropdown) return;

    profileBtn.classList.remove('active');
    profileDropdown.classList.remove('show');
}

/**
 * Gère la déconnexion complète de l'utilisateur
 * Supprime toutes les données de session et redirige vers l'accueil
 */
function handleLogout(e) {
    e.preventDefault();

    // Confirmation de déconnexion
    const confirmLogout = confirm('Êtes-vous sûr de vouloir vous déconnecter ?');

    if (confirmLogout) {
        // ===== ÉTAPE 1 : Supprimer le token JWT =====
        // Le token permet l'authentification auprès du backend
        localStorage.removeItem('dashfood_token');

        // ===== ÉTAPE 2 : Supprimer les données utilisateur =====
        // Contient : fullName, email, role, etc.
        localStorage.removeItem('dashfood_user');

        // ===== ÉTAPE 3 : Vérifier et nettoyer sessionStorage =====
        // Par précaution, supprimer aussi les données de sessionStorage
        sessionStorage.removeItem('dashfood_token');
        sessionStorage.removeItem('dashfood_user');

        // ===== ÉTAPE 4 : Fermer le dropdown =====
        closeDropdown();

        // ===== ÉTAPE 5 : Log de déconnexion =====
        console.log('✅ Déconnexion réussie - Session complètement supprimée');

        // ===== ÉTAPE 6 : Redirection vers la page d'accueil =====
        // L'utilisateur arrive sur index.html avec la navbar par défaut
        // (boutons Connexion/Inscription visibles)
        window.location.href = '/';
    }
}

/**
 * Utilitaire : Fermer le dropdown avec la touche Escape
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDropdown();
    }
});
