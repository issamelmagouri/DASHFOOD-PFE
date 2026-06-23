// Gestion de l'authentification
// Login.. logout.... vérification de session, token JWT

//  Auth State Management 

// Vérifier si l utilisateur est connecté
function isLoggedIn() {
    // La page de connexion enregistre le JWT sous cette clé.
    return Boolean(localStorage.getItem('dashfood_token'));
}

// Récupérer utilisateur connecté
function getCurrentUser() {
    const userStr = localStorage.getItem('dashfood_user');

    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Données utilisateur invalides dans localStorage:', error);
        return null;
    }
}

// Sauvegarder les informations de utilisateur
function saveAuthData(token, user) {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   SAUVEGARDE DONNÉES AUTHENTIFICATION  ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('🔑 Token JWT (premiers chars):', token ? token.substring(0, 30) + '...' : 'NULL');
    console.log('👤 User email:', user?.email || 'N/A');
    console.log('👤 User nom:', user?.nom || user?.prenom || 'N/A');
    console.log('💰 DashPoints:', user?.dashPoints || 0);

    localStorage.setItem('dashfood_token', token);
    localStorage.setItem('dashfood_user', JSON.stringify(user));

    // Vérification immédiate
    const savedToken = localStorage.getItem('dashfood_token');
    const savedUser = localStorage.getItem('dashfood_user');

    console.log('✅ Sauvegarde localStorage:');
    console.log('  - dashfood_token sauvegardé:', !!savedToken);
    console.log('  - dashfood_user sauvegardé:', !!savedUser);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
}

// Déconnexion
function logout() {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║          DÉCONNEXION EN COURS          ║');
    console.log('╚════════════════════════════════════════╝');

    localStorage.removeItem('dashfood_token');
    localStorage.removeItem('dashfood_user');

    console.log('✅ dashfood_token supprimé');
    console.log('✅ dashfood_user supprimé');
    console.log('→ Redirection vers homepage...');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    window.location.href = '/';
}

// ===== Protected Links Handler =====
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer tous les liens/boutons qui nécessitent une authentification
    const protectedElements = document.querySelectorAll('[data-auth-required="true"]');

    protectedElements.forEach(element => {
        element.addEventListener('click', function(e) {
            // Vérifier si l'utilisateur est connecté
            if (!isLoggedIn()) {
                e.preventDefault();

                // Afficher un message
                showToast('Vous devez être connecté pour accéder à cette fonctionnalité', 'warning');

                // Mémoriser la destination demandée pour y revenir après connexion.
                const destination = element instanceof HTMLAnchorElement
                    ? element.pathname + element.search + element.hash
                    : window.location.pathname + window.location.search;
                localStorage.setItem('redirectAfterLogin', destination);

                // Rediriger vers la page de connexion après un court délai
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);

                return false;
            }
        });
    });

    // Mettre à jour l'interface selon l'état de connexion
    updateNavbarForAuthState();

    // Mettre à jour le compteur du panier
    updateCartCount();
});

// ===== Update Navbar Based on Auth State =====
function updateNavbarForAuthState() {
    const user = getCurrentUser();
    const navbarActions = document.querySelector('.navbar-actions');

    if (!navbarActions) return;

    if (user) {
        // Utilisateur connecté - afficher profil et déconnexion
        const loginBtn = navbarActions.querySelector('.btn-outline');
        const registerBtn = navbarActions.querySelector('.btn-primary');

        if (loginBtn && registerBtn) {
            // Remplacer les boutons par un menu utilisateur
            loginBtn.textContent = user.prenom || user.nom || 'Mon compte';
            loginBtn.href = getUserDashboardUrl(user.role);

            registerBtn.textContent = 'Déconnexion';
            registerBtn.href = '#';
            registerBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
                    logout();
                }
            });
        }
    }
}

// Obtenir l'URL du dashboard selon le rôle
function getUserDashboardUrl(role) {
    switch(role) {
        case 'admin':
            return '/admin-dashboard.html';
        case 'restaurant':
            return '/restaurant-dashboard.html';
        case 'livreur':
            return '/livreur-dashboard.html';
        default:
            return '/panier.html';
    }
}

// ===== Cart Management =====

// Récupérer le panier
function getCart() {
    const cartStr = localStorage.getItem('cart');
    return cartStr ? JSON.parse(cartStr) : [];
}

// Sauvegarder le panier
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// Mettre à jour le compteur du panier
function updateCartCount() {
    const cart = getCart();
    const cartCountElement = document.getElementById('cart-count');

    if (cartCountElement) {
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        cartCountElement.textContent = totalItems;

        // Afficher ou masquer le badge
        if (totalItems > 0) {
            cartCountElement.style.display = 'flex';
        } else {
            cartCountElement.style.display = 'none';
        }
    }
}

// Ajouter un article au panier
function addToCart(item) {
    if (!isLoggedIn()) {
        showToast('Vous devez être connecté pour ajouter des articles au panier', 'warning');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
        return false;
    }

    const cart = getCart();

    // Vérifier si l'article existe déjà
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);

    if (existingItemIndex !== -1) {
        cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 1) + 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    saveCart(cart);
    showToast('Article ajouté au panier', 'success');
    return true;
}

// Retirer un article du panier
function removeFromCart(itemId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== itemId);
    saveCart(cart);
    showToast('Article retiré du panier', 'info');
}

// Vider le panier
function clearCart() {
    localStorage.removeItem('cart');
    updateCartCount();
}
