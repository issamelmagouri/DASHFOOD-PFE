const RESTAURANT_MENU_LABELS = {
    entrees: 'Entrées',
    'plats-principaux': 'Plats principaux',
    burgers: 'Burgers',
    pizzas: 'Pizzas',
    desserts: 'Desserts',
    boissons: 'Boissons',
    promotions: 'Promotions'
};

function filterRestaurantMenu(items, category = 'all') {
    if (category === 'all') return items;
    if (category === 'promotions') return items.filter((item) => item.badge === 'promo');
    return items.filter((item) => item.category === category);
}

function addRestaurantItemToCart(cart, item, quantity) {
    const nextCart = Array.isArray(cart) ? cart.map((entry) => ({ ...entry })) : [];
    const parsedQuantity = Math.max(1, Math.min(99, Number(quantity) || 1));
    const existing = nextCart.find((entry) => String(entry.id) === String(item._id));
    if (existing) existing.quantity = Number(existing.quantity || 0) + parsedQuantity;
    else nextCart.push({
        id: item._id,
        name: item.name,
        price: Number(item.price),
        quantity: parsedQuantity,
        image: item.image,
        category: item.category,
        restaurantId: item.restaurant?._id || item.restaurant,
        restaurantName: item.restaurant?.name || 'Restaurant DashFood',
        deliveryFee: Number(item.restaurant?.deliveryFee || 0),
        freeDelivery: Boolean(item.restaurant?.freeDelivery)
    });
    return nextCart;
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const restaurantId = new URLSearchParams(location.search).get('id')
            || new URLSearchParams(location.search).get('restaurantId');
        const state = { restaurant: null, items: [], category: 'all', quantities: new Map() };
        const sections = document.getElementById('restaurantMenuSections');
        const count = document.getElementById('menuCount');
        const title = document.getElementById('menuTitle');
        const errorMessage = document.getElementById('restaurantMenuMessage');
        const cartCount = document.getElementById('cartCount');
        const floatingCart = document.getElementById('floatingCart');
        const floatingCartCount = document.getElementById('floatingCartCount');
        const toast = document.getElementById('restaurantMenuToast');
        let toastTimer;

        const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
        const safeImage = (value) => {
            const image = String(value || '');
            if (image.includes('placeholder')) return '/assets/images/restaurant-kitchen.png';
            return image.startsWith('/') || /^https?:\/\//i.test(image) ? escapeHtml(image) : '/assets/images/restaurant-kitchen.png';
        };
        const money = (value) => `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
        const badgeLabel = (badge) => ({ nouveau: 'Nouveau', populaire: 'Populaire', promo: 'Promo' }[badge] || '');

        function getCart() {
            try { return JSON.parse(localStorage.getItem('dashfood_cart') || '[]'); }
            catch (_) { return []; }
        }

        function mirrorServerCart(cart) {
            return (cart.items || []).map((item) => ({
                id: item.menuItem,
                cartItemId: item._id,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                restaurantId: item.restaurant,
                restaurantName: item.restaurantName,
                deliveryFee: cart.deliveryFee,
                freeDelivery: Number(cart.deliveryFee) === 0
            }));
        }

        async function persistAddedItem(item, quantity) {
            const token = localStorage.getItem('dashfood_token');
            let cart = getCart();
            const itemRestaurantId = String(item.restaurant?._id || item.restaurant || restaurantId);
            const hasAnotherRestaurant = cart.some((entry) => entry.restaurantId && String(entry.restaurantId) !== itemRestaurantId);
            if (hasAnotherRestaurant) {
                if (!confirm('Votre panier contient un autre restaurant. Le remplacer par ce menu ?')) return false;
                cart = [];
                if (token) await fetch('/api/cart/clear', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            }

            if (token) {
                const response = await fetch('/api/cart/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ menuItemId: item._id, quantity })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Impossible d’ajouter ce plat');
                localStorage.setItem('dashfood_cart', JSON.stringify(mirrorServerCart(data.cart)));
            } else {
                localStorage.setItem('dashfood_cart', JSON.stringify(addRestaurantItemToCart(cart, item, quantity)));
            }
            return true;
        }

        function updateCart() {
            const total = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            cartCount.textContent = total;
            cartCount.style.display = total ? 'flex' : 'none';
            floatingCart.hidden = total === 0;
            floatingCartCount.textContent = `${total} article${total > 1 ? 's' : ''}`;
        }

        function showToast(text) {
            clearTimeout(toastTimer);
            toast.textContent = text;
            toast.hidden = false;
            toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
        }

        function showError(text) {
            errorMessage.textContent = text;
            errorMessage.hidden = false;
            sections.innerHTML = `<div class="restaurant-menu-empty"><h3>Menu indisponible</h3><p>${escapeHtml(text)}</p><p><a href="/restaurants">Retour aux restaurants</a></p></div>`;
            count.textContent = '0 plat';
        }

        function renderRestaurant(restaurant) {
            document.title = `${restaurant.name} - Menu - DashFood`;
            document.getElementById('restaurantName').textContent = restaurant.name;
            document.getElementById('restaurantCuisine').textContent = restaurant.cuisine || restaurant.cuisineType || restaurant.category || 'Cuisine DashFood';
            document.getElementById('restaurantRating').textContent = `★ ${Number(restaurant.rating || 0).toFixed(1)} (${Number(restaurant.reviewCount || 0)} avis)`;
            document.getElementById('restaurantDeliveryTime').textContent = restaurant.deliveryTime || '30-45 min';
            document.getElementById('restaurantDeliveryFee').textContent = restaurant.freeDelivery || Number(restaurant.deliveryFee || 0) === 0
                ? 'Livraison offerte' : `Livraison ${money(restaurant.deliveryFee)}`;
            document.getElementById('restaurantAddress').textContent = restaurant.address || 'Adresse indisponible';
            const status = document.getElementById('restaurantStatus');
            const isOpen = restaurant.isOpen !== false;
            status.textContent = isOpen ? 'OUVERT MAINTENANT' : 'FERMÉ ACTUELLEMENT';
            status.classList.toggle('closed', !isOpen);
            const heroImage = safeImage(restaurant.image);
            document.getElementById('restaurantHero').style.backgroundImage = `url("${heroImage.replaceAll('"', '')}")`;
        }

        function updateCategoryVisibility() {
            document.querySelectorAll('[data-category]').forEach((button) => {
                const category = button.dataset.category;
                if (category === 'all') return;
                button.hidden = filterRestaurantMenu(state.items, category).length === 0;
            });
        }

        function dishCard(item) {
            const quantity = state.quantities.get(item._id) || 1;
            const badge = badgeLabel(item.badge);
            return `<article class="restaurant-dish-card">
                <div class="restaurant-dish-image-wrap">
                    <img class="restaurant-dish-image" src="${safeImage(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='/assets/images/restaurant-kitchen.png'">
                    ${badge ? `<span class="restaurant-dish-badge ${escapeHtml(item.badge)}">${escapeHtml(badge)}</span>` : ''}
                </div>
                <div class="restaurant-dish-content">
                    <h4>${escapeHtml(item.name)}</h4>
                    <p class="restaurant-dish-description">${escapeHtml(item.description || 'Une création savoureuse préparée à la commande.')}</p>
                    <div class="restaurant-dish-bottom">
                        <strong class="restaurant-dish-price">${money(item.price)}</strong>
                        <div class="restaurant-dish-actions">
                            <div class="restaurant-quantity">
                                <button type="button" data-quantity-action="decrease" data-item-id="${escapeHtml(item._id)}" aria-label="Diminuer la quantité">−</button>
                                <span data-quantity-value="${escapeHtml(item._id)}">${quantity}</span>
                                <button type="button" data-quantity-action="increase" data-item-id="${escapeHtml(item._id)}" aria-label="Augmenter la quantité">+</button>
                            </div>
                            <button class="restaurant-add-button" type="button" data-add-item="${escapeHtml(item._id)}">Ajouter +</button>
                        </div>
                    </div>
                </div>
            </article>`;
        }

        function renderMenu() {
            const filtered = filterRestaurantMenu(state.items, state.category);
            title.textContent = state.category === 'all' ? 'Toutes les envies' : RESTAURANT_MENU_LABELS[state.category];
            count.textContent = `${filtered.length} plat${filtered.length > 1 ? 's' : ''}`;
            if (!filtered.length) {
                sections.innerHTML = '<div class="restaurant-menu-empty"><h3>Aucun plat dans cette catégorie.</h3><p>Découvrez les autres créations du restaurant.</p></div>';
                bindMenuActions();
                return;
            }

            const categories = state.category === 'all'
                ? Object.keys(RESTAURANT_MENU_LABELS).filter((category) => category !== 'promotions')
                : [state.category];
            sections.innerHTML = categories.map((category) => {
                const items = filterRestaurantMenu(filtered, category);
                if (!items.length) return '';
                return `<section class="menu-category-section" id="menu-${category}">
                    <div class="menu-category-heading"><h3>${escapeHtml(RESTAURANT_MENU_LABELS[category])}</h3><span>${items.length} plat${items.length > 1 ? 's' : ''}</span></div>
                    <div class="restaurant-dishes-grid">${items.map(dishCard).join('')}</div>
                </section>`;
            }).join('');
            bindMenuActions();
        }

        function bindMenuActions() {
            sections.querySelectorAll('[data-quantity-action]').forEach((button) => button.addEventListener('click', () => {
                const id = button.dataset.itemId;
                const current = state.quantities.get(id) || 1;
                const next = button.dataset.quantityAction === 'increase' ? Math.min(99, current + 1) : Math.max(1, current - 1);
                state.quantities.set(id, next);
                const value = sections.querySelector(`[data-quantity-value="${CSS.escape(id)}"]`);
                if (value) value.textContent = next;
            }));
            sections.querySelectorAll('[data-add-item]').forEach((button) => button.addEventListener('click', async () => {
                const item = state.items.find((entry) => entry._id === button.dataset.addItem);
                if (!item) return;
                const quantity = state.quantities.get(item._id) || 1;
                try {
                    if (!(await persistAddedItem(item, quantity))) return;
                    state.quantities.set(item._id, 1);
                    updateCart();
                    button.textContent = 'Ajouté ✓';
                    button.classList.add('added');
                    setTimeout(() => { button.textContent = 'Ajouter +'; button.classList.remove('added'); renderMenu(); }, 900);
                    showToast(`${quantity} × ${item.name} ajouté au panier`);
                } catch (error) { showToast(error.message); }
            }));
        }

        async function loadPage() {
            if (!restaurantId) {
                showError('Aucun restaurant n’a été sélectionné.');
                return;
            }
            try {
                const [restaurantResponse, menuResponse] = await Promise.all([
                    fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}`),
                    fetch(`/api/menuitems?restaurant=${encodeURIComponent(restaurantId)}`)
                ]);
                const restaurantData = await restaurantResponse.json();
                const menuData = await menuResponse.json();
                if (!restaurantResponse.ok) throw new Error(restaurantData.message || 'Restaurant introuvable');
                if (!menuResponse.ok) throw new Error(menuData.message || 'Menu indisponible');

                state.restaurant = restaurantData.restaurant;
                state.items = menuData.menuItems || [];
                if (!state.items.length) {
                    const fallbackResponse = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/menu`);
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackResponse.ok) state.items = fallbackData.menuItems || [];
                }
                renderRestaurant(state.restaurant);
                updateCategoryVisibility();
                renderMenu();
                if (!state.items.length) {
                    errorMessage.textContent = 'Ce restaurant prépare encore son menu.';
                    errorMessage.hidden = false;
                }
            } catch (error) { showError(error.message); }
        }

        document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
            document.querySelectorAll('[data-category]').forEach((categoryButton) => categoryButton.classList.remove('active'));
            button.classList.add('active');
            state.category = button.dataset.category;
            renderMenu();
            document.querySelector('.restaurant-menu-main').scrollIntoView({ behavior: 'smooth' });
        }));

        updateCart();
        loadPage();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RESTAURANT_MENU_LABELS, filterRestaurantMenu, addRestaurantItemToCart };
}
