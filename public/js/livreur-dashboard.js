/**
 * Tableau de bord livreur
 * Gestion des statistiques, commandes disponibles et livraisons en cours
 */

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setupLogout();
});

/**
 * Initialise le tableau de bord
 */
function initDashboard() {
    const userStr = localStorage.getItem('dashfood_user');

    if (userStr) {
        try {
            const user = JSON.parse(userStr);

            // Afficher le nom du livreur dans le message de bienvenue
            const welcomeMessage = document.getElementById('welcomeMessage');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Bienvenue, ${user.fullName}`;
            }

            // Charger les statistiques
            loadStats();

            // Charger les commandes disponibles
            loadAvailableOrders();

            // Charger la livraison en cours
            loadCurrentDelivery();

        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
        }
    }
}

/**
 * Charge les statistiques du livreur
 */
async function loadStats() {
    try {
        const token = localStorage.getItem('dashfood_token');

        // TODO: Implémenter l'API pour récupérer les stats réelles
        // Pour l'instant, afficher des données fictives

        // Simuler des données
        const stats = {
            todayDeliveries: 3,
            totalDeliveries: 127,
            todayEarnings: 45.50,
            avgRating: 4.8
        };

        // Mettre à jour l'interface
        document.getElementById('todayDeliveries').textContent = stats.todayDeliveries;
        document.getElementById('totalDeliveries').textContent = stats.totalDeliveries;
        document.getElementById('todayEarnings').textContent = stats.todayEarnings.toFixed(2) + '€';
        document.getElementById('avgRating').textContent = stats.avgRating.toFixed(1);

    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

/**
 * Charge les commandes disponibles
 */
async function loadAvailableOrders() {
    const container = document.getElementById('availableOrdersContainer');
    const badge = document.getElementById('availableCount');

    try {
        const token = localStorage.getItem('dashfood_token');

        // TODO: Implémenter l'API pour récupérer les commandes disponibles
        // Pour l'instant, afficher un état vide

        const orders = [];

        badge.textContent = orders.length;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>Aucune commande disponible pour le moment</p>
                    <p style="font-size: 12px; color: #9E9E9E; margin-top: 8px;">Les nouvelles commandes apparaîtront ici automatiquement</p>
                </div>
            `;
        } else {
            // Afficher les commandes disponibles
            displayAvailableOrders(orders);
        }

    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p>Erreur lors du chargement des commandes</p>
            </div>
        `;
    }
}

/**
 * Charge la livraison en cours
 */
async function loadCurrentDelivery() {
    const container = document.getElementById('currentDeliveryContainer');

    try {
        const token = localStorage.getItem('dashfood_token');

        // TODO: Implémenter l'API pour récupérer la livraison en cours
        // Pour l'instant, afficher un état vide

        const currentDelivery = null;

        if (!currentDelivery) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p>Aucune livraison en cours</p>
                </div>
            `;
        } else {
            // Afficher la livraison en cours
            displayCurrentDelivery(currentDelivery);
        }

    } catch (error) {
        console.error('Erreur lors du chargement de la livraison:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p>Erreur lors du chargement de la livraison</p>
            </div>
        `;
    }
}

/**
 * Configure le bouton de déconnexion du livreur
 * Supprime complètement la session et redirige vers l'accueil
 */
function setupLogout() {
    const logoutBtn = document.getElementById('livreurLogout');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Confirmation avant déconnexion
            if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {

                // ===== ÉTAPE 1 : Supprimer le token JWT =====
                // Le token JWT permet l'authentification auprès du backend
                localStorage.removeItem('dashfood_token');

                // ===== ÉTAPE 2 : Supprimer les données utilisateur =====
                // Données contenant : fullName, email, role, etc.
                localStorage.removeItem('dashfood_user');

                // ===== ÉTAPE 3 : Nettoyer sessionStorage =====
                // Par précaution, supprimer aussi les données de sessionStorage
                sessionStorage.removeItem('dashfood_token');
                sessionStorage.removeItem('dashfood_user');

                // ===== ÉTAPE 4 : Log de déconnexion =====
                console.log('✅ Déconnexion livreur réussie - Session supprimée');

                // ===== ÉTAPE 5 : Redirection vers la page d'accueil =====
                // L'utilisateur arrive sur index.html avec navbar par défaut
                window.location.href = '/';
            }
        });
    }
}

/**
 * Affiche les commandes disponibles (à implémenter)
 */
function displayAvailableOrders(orders) {
    // TODO: Implémenter l'affichage des commandes disponibles
    console.log('Affichage des commandes:', orders);
}

/**
 * Affiche la livraison en cours (à implémenter)
 */
function displayCurrentDelivery(delivery) {
    // TODO: Implémenter l'affichage de la livraison en cours
    console.log('Affichage de la livraison:', delivery);
}
