/**
 * Page Restaurants - DashFood
 * Affiche et filtre les restaurants partenaires
 */

// Mode démo : affiche des restaurants fictifs si aucune donnée réelle
const DEMO_MODE = true;

let allRestaurants = [];
let filteredRestaurants = [];
let currentFilters = {
    search: '',
    city: 'all',
    category: 'all',
    minRating: 0
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

/**
 * Initialise la page restaurants
 */
function initPage() {
    setupEventListeners();
    loadRestaurants();
    updateCartCount();
}

/**
 * Configure tous les event listeners
 */
function setupEventListeners() {
    // Hero search
    const heroSearchBtn = document.getElementById('heroSearchBtn');
    const heroSearchInput = document.getElementById('heroSearchInput');

    if (heroSearchBtn) {
        heroSearchBtn.addEventListener('click', () => performSearch(heroSearchInput.value));
    }

    if (heroSearchInput) {
        heroSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(heroSearchInput.value);
            }
        });
    }

    // Quick filter chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const category = chip.dataset.category;
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilters.category = category;
            applyFilters();
        });
    });

    // Apply filters button
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', handleFilterApply);
    }

    // Category cards
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            currentFilters.category = category;
            applyFilters();

            // Scroll to restaurants section
            document.getElementById('restaurantsGrid').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

/**
 * Effectue une recherche
 */
function performSearch(query) {
    currentFilters.search = query;
    applyFilters();
}

/**
 * Gère l'application des filtres
 */
function handleFilterApply() {
    const filterSearch = document.getElementById('filterSearch').value;
    const filterCity = document.getElementById('filterCity').value;
    const filterCategory = document.getElementById('filterCategory').value;
    const filterRating = document.getElementById('filterRating').value;

    currentFilters.search = filterSearch;
    currentFilters.city = filterCity;
    currentFilters.category = filterCategory;
    currentFilters.minRating = parseFloat(filterRating);

    applyFilters();
}

/**
 * Applique les filtres aux restaurants
 */
function applyFilters() {
    filteredRestaurants = allRestaurants.filter(restaurant => {
        // Filtre par recherche (nom, cuisine, description)
        if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            const matchName = restaurant.name.toLowerCase().includes(searchLower);
            const matchCuisine = restaurant.cuisineType.toLowerCase().includes(searchLower);
            const matchCategory = restaurant.category.toLowerCase().includes(searchLower);

            if (!matchName && !matchCuisine && !matchCategory) {
                return false;
            }
        }

        // Filtre par ville
        if (currentFilters.city && currentFilters.city !== 'all') {
            if (restaurant.city !== currentFilters.city) {
                return false;
            }
        }

        // Filtre par catégorie
        if (currentFilters.category && currentFilters.category !== 'all') {
            if (restaurant.category !== currentFilters.category) {
                return false;
            }
        }

        // Filtre par note minimale
        if (currentFilters.minRating > 0) {
            if (restaurant.rating < currentFilters.minRating) {
                return false;
            }
        }

        return true;
    });

    displayRestaurants(filteredRestaurants);
}

/**
 * Charge les restaurants depuis l'API
 */
async function loadRestaurants() {
    const loadingState = document.getElementById('loadingState');
    const restaurantsGrid = document.getElementById('restaurantsGrid');
    const emptyState = document.getElementById('emptyState');

    // Afficher le loading
    loadingState.style.display = 'block';
    restaurantsGrid.style.display = 'none';
    emptyState.style.display = 'none';

    try {
        const response = await fetch('/api/restaurants');
        const data = await response.json();

        if (data.success) {
            allRestaurants = data.restaurants || [];

            // Si mode démo activé et aucun restaurant réel, utiliser les données de démonstration
            if (DEMO_MODE && allRestaurants.length === 0) {
                console.log('Mode démo activé : affichage de restaurants de démonstration');
                allRestaurants = getDemoRestaurants();
            }

            if (allRestaurants.length === 0) {
                loadingState.style.display = 'none';
                emptyState.style.display = 'block';
            } else {
                filteredRestaurants = [...allRestaurants];
                loadingState.style.display = 'none';
                restaurantsGrid.style.display = 'grid';
                displayRestaurants(filteredRestaurants);
            }
        } else {
            throw new Error(data.message || 'Erreur lors du chargement des restaurants');
        }

    } catch (error) {
        console.error('Error loading restaurants:', error);

        // En cas d'erreur, utiliser les données demo si mode démo activ é
        if (DEMO_MODE) {
            console.log('Erreur API - Basculement sur les données de démonstration');
            allRestaurants = getDemoRestaurants();
            filteredRestaurants = [...allRestaurants];
            loadingState.style.display = 'none';
            restaurantsGrid.style.display = 'grid';
            displayRestaurants(filteredRestaurants);
        } else {
            loadingState.style.display = 'none';
            emptyState.style.display = 'block';
        }
    }
}

/**
 * Affiche les restaurants dans la grille
 */
function displayRestaurants(restaurants) {
    const restaurantsGrid = document.getElementById('restaurantsGrid');
    const emptyState = document.getElementById('emptyState');

    if (restaurants.length === 0) {
        restaurantsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    restaurantsGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    restaurantsGrid.innerHTML = restaurants.map(restaurant => createRestaurantCard(restaurant)).join('');

    // Attacher les événements
    attachCardEvents();
}

/**
 * Crée le HTML d'une carte restaurant
 */
function createRestaurantCard(restaurant) {
    const deliveryFeeText = restaurant.freeDelivery ? 'Offerte' : `${restaurant.deliveryFee.toFixed(2)} €`;

    return `
        <div class="restaurant-card" data-restaurant-id="${restaurant._id}">
            <div class="card-image-wrapper">
                ${restaurant.image && restaurant.image !== '/assets/restaurants/placeholder.jpg'
                    ? `<img src="${restaurant.image}" alt="${restaurant.name}" class="card-image">`
                    : `<div class="image-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                        </svg>
                        <p>Photo</p>
                        <span>or browse files</span>
                    </div>`
                }

                <div class="card-badges">
                    ${restaurant.isPopular
                        ? `<div class="badge badge-popular">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            POPULAIRE
                        </div>`
                        : '<div></div>'
                    }
                    ${restaurant.freeDelivery
                        ? `<div class="badge badge-delivery">Livraison offerte</div>`
                        : ''
                    }
                </div>
            </div>

            <div class="card-content">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${restaurant.name}</h3>
                        <p class="card-cuisine">${restaurant.cuisineType}</p>
                    </div>
                    <div class="card-rating">
                        <svg viewBox="0 0 24 24">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        <span>${restaurant.rating.toFixed(1)}</span>
                    </div>
                </div>

                <div class="card-info">
                    <div class="info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        ${restaurant.deliveryTime}
                    </div>
                    <div class="info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        ${deliveryFeeText}
                    </div>
                </div>

                <button class="card-btn view-menu-btn" data-restaurant-id="${restaurant._id}">
                    Voir le menu
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

/**
 * Attache les événements aux cartes
 */
function attachCardEvents() {
    const viewMenuButtons = document.querySelectorAll('.view-menu-btn');

    viewMenuButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const restaurantId = btn.dataset.restaurantId;
            viewRestaurantMenu(restaurantId);
        });
    });
}

/**
 * Redirige vers la page menu du restaurant
 */
function viewRestaurantMenu(restaurantId) {
    window.location.href = `/restaurant-menu.html?id=${encodeURIComponent(restaurantId)}`;
}

/**
 * Met à jour le compteur du panier
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('dashfood_cart') || '[]');
    const cartCount = document.getElementById('cartCount');

    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

/**
 * Génère des restaurants de démonstration
 * Utilisé uniquement si DEMO_MODE === true et aucun restaurant réel
 */
function getDemoRestaurants() {
    return [
        {
            _id: 'demo-1',
            name: 'Le Comptoir d\'Or',
            cuisineType: 'Gastronomique · Français',
            category: 'Français',
            city: 'Casablanca',
            address: 'Boulevard Anfa, Casablanca',
            description: 'Restaurant gastronomique français haut de gamme',
            image: '/assets/restaurants/placeholder.jpg',
            rating: 4.9,
            reviewCount: 847,
            deliveryTime: '20-25 min',
            deliveryFee: 0,
            freeDelivery: true,
            isPopular: true,
            isFeatured: true,
            isActive: true
        },
        {
            _id: 'demo-2',
            name: 'Sushi Maison',
            cuisineType: 'Sushi · Japonais',
            category: 'Sushi',
            city: 'Casablanca',
            address: 'Maarif, Casablanca',
            description: 'Sushi japonais authentique',
            image: '/assets/restaurants/placeholder.jpg',
            rating: 4.8,
            reviewCount: 623,
            deliveryTime: '20-25 min',
            deliveryFee: 2.50,
            freeDelivery: false,
            isPopular: true,
            isFeatured: true,
            isActive: true
        },
        {
            _id: 'demo-3',
            name: 'Pizzeria Toscana',
            cuisineType: 'Pizza · Italien',
            category: 'Pizza',
            city: 'Casablanca',
            address: 'Gauthier, Casablanca',
            description: 'Pizzeria italienne traditionnelle',
            image: '/assets/restaurants/placeholder.jpg',
            rating: 4.7,
            reviewCount: 912,
            deliveryTime: '25 min',
            deliveryFee: 0,
            freeDelivery: true,
            isPopular: false,
            isFeatured: true,
            isActive: true
        },
        {
            _id: 'demo-4',
            name: 'Burger Atelier',
            cuisineType: 'Burgers · Street food',
            category: 'Burgers',
            city: 'Rabat',
            address: 'Agdal, Rabat',
            description: 'Burgers artisanaux et frites maison',
            image: '/assets/restaurants/placeholder.jpg',
            rating: 4.8,
            reviewCount: 1024,
            deliveryTime: '15-20 min',
            deliveryFee: 1.90,
            freeDelivery: false,
            isPopular: true,
            isFeatured: true,
            isActive: true
        },
        {
            _id: 'demo-5',
            name: 'Casa Maroc',
            cuisineType: 'Tajine · Marocain',
            category: 'Marocain',
            city: 'Marrakech',
            address: 'Guéliz, Marrakech',
            description: 'Cuisine marocaine authentique',
            image: '/assets/restaurants/placeholder.jpg',
            rating: 4.9,
            reviewCount: 756,
            deliveryTime: '20 min',
            deliveryFee: 0,
            freeDelivery: true,
            isPopular: true,
            isFeatured: true,
            isActive: true
        },
        {
            _id: 'demo-6',
            name: 'Green Garden',
            cuisineType: 'Healthy · Végétarien',
            category: 'Healthy',
            city: 'Casablanca',
            address: 'Ain Diab, Casablanca',
            description: 'Cuisine saine et végétarienne',
            image: '/assets/restaurants/placeholder.jpg',
            rating: 4.7,
            reviewCount: 489,
            deliveryTime: '18 min',
            deliveryFee: 2.00,
            freeDelivery: false,
            isPopular: false,
            isFeatured: false,
            isActive: true
        }
    ];
}
