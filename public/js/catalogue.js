const CATALOGUE_CATEGORY_LABELS = {
    entrees: 'Entrées',
    'plats-principaux': 'Plats principaux',
    burgers: 'Burgers',
    pizzas: 'Pizzas',
    desserts: 'Desserts',
    boissons: 'Boissons'
};

function filterCatalogueItems(items, search = '', category = 'all') {
    const normalizedSearch = String(search).trim().toLocaleLowerCase('fr');
    return items.filter((item) => {
        const matchesCategory = category === 'all' || item.category === category;
        const matchesSearch = !normalizedSearch || String(item.name || '').toLocaleLowerCase('fr').includes(normalizedSearch);
        return matchesCategory && matchesSearch;
    });
}

function addCatalogueItemToCart(cart, item) {
    const nextCart = Array.isArray(cart) ? cart.map((entry) => ({ ...entry })) : [];
    const existing = nextCart.find((entry) => String(entry.id) === String(item._id));
    if (existing) {
        existing.quantity = Number(existing.quantity || 0) + 1;
    } else {
        nextCart.push({
            id: item._id,
            name: item.name,
            price: Number(item.price),
            quantity: 1,
            image: item.image,
            category: item.category,
            restaurantId: item.restaurant?._id || item.restaurant,
            restaurantName: item.restaurant?.name || 'Restaurant DashFood',
            deliveryFee: Number(item.restaurant?.deliveryFee || 0),
            freeDelivery: Boolean(item.restaurant?.freeDelivery)
        });
    }
    return nextCart;
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const state = { items: [], category: 'all', search: '' };
        const grid = document.getElementById('menuItemsGrid');
        const count = document.getElementById('catalogueCount');
        const heading = document.getElementById('catalogueHeading');
        const searchInput = document.getElementById('catalogueSearch');
        const message = document.getElementById('catalogueMessage');
        const toast = document.getElementById('catalogueToast');
        const cartCount = document.getElementById('cartCount');
        let toastTimer;

        const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
        const safeImage = (value) => {
            const image = String(value || '');
            return image.startsWith('/') || /^https?:\/\//i.test(image)
                ? escapeHtml(image)
                : '/assets/images/restaurant-kitchen.png';
        };
        const formatPrice = (value) => `${Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

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

        async function addItem(item) {
            const token = localStorage.getItem('dashfood_token');
            let cart = getCart();
            const restaurantId = String(item.restaurant?._id || item.restaurant || '');
            const hasAnotherRestaurant = cart.some((entry) => entry.restaurantId && String(entry.restaurantId) !== restaurantId);
            if (hasAnotherRestaurant) {
                if (!confirm('Votre panier contient un autre restaurant. Le remplacer par ce nouveau plat ?')) return false;
                cart = [];
                if (token) await fetch('/api/cart/clear', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            }

            if (token) {
                const response = await fetch('/api/cart/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ menuItemId: item._id, quantity: 1 })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Impossible d’ajouter ce plat');
                localStorage.setItem('dashfood_cart', JSON.stringify(mirrorServerCart(data.cart)));
            } else {
                localStorage.setItem('dashfood_cart', JSON.stringify(addCatalogueItemToCart(cart, item)));
            }
            return true;
        }

        function updateCartCount() {
            const total = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            cartCount.textContent = total;
            cartCount.style.display = total > 0 ? 'flex' : 'none';
        }

        function showToast(text) {
            clearTimeout(toastTimer);
            toast.textContent = text;
            toast.hidden = false;
            toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
        }

        function render() {
            const filtered = filterCatalogueItems(state.items, state.search, state.category);
            count.textContent = `${filtered.length} repas disponible${filtered.length > 1 ? 's' : ''}`;
            heading.textContent = state.category === 'all' ? 'Tous les repas' : CATALOGUE_CATEGORY_LABELS[state.category];

            if (!filtered.length) {
                grid.innerHTML = `<div class="catalogue-empty"><h3>Aucun repas trouvé</h3><p>Essayez une autre recherche ou une autre catégorie.</p></div>`;
                return;
            }

            grid.innerHTML = filtered.map((item) => `
                <article class="meal-card">
                    <div class="meal-image-wrap">
                        <img class="meal-image" src="${safeImage(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">
                        <span class="meal-category-label">${escapeHtml(CATALOGUE_CATEGORY_LABELS[item.category] || item.category)}</span>
                    </div>
                    <div class="meal-content">
                        <p class="meal-restaurant">${escapeHtml(item.restaurant?.name || 'Restaurant DashFood')}</p>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p class="meal-description">${escapeHtml(item.description)}</p>
                        <div class="meal-footer">
                            <strong class="meal-price">${formatPrice(item.price)}</strong>
                            <button class="meal-add" type="button" data-add-item="${escapeHtml(item._id)}">Ajouter</button>
                        </div>
                    </div>
                </article>`).join('');

            grid.querySelectorAll('[data-add-item]').forEach((button) => button.addEventListener('click', async () => {
                const item = state.items.find((entry) => entry._id === button.dataset.addItem);
                if (!item) return;
                try {
                    if (!(await addItem(item))) return;
                    updateCartCount();
                    button.textContent = 'Ajouté ✓';
                    button.classList.add('added');
                    setTimeout(() => { button.textContent = 'Ajouter'; button.classList.remove('added'); }, 1200);
                    showToast(`${item.name} ajouté au panier`);
                } catch (error) { showToast(error.message); }
            }));
        }

        async function loadMenuItems() {
            try {
                const response = await fetch('/api/menuitems');
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Impossible de charger le catalogue');
                state.items = data.menuItems || [];
                message.hidden = true;
                render();
                if (!state.items.length) {
                    message.textContent = 'Le catalogue est vide. Exécutez npm run seed:menuitems pour ajouter les plats de démonstration.';
                    message.hidden = false;
                }
            } catch (error) {
                count.textContent = 'Catalogue indisponible';
                grid.innerHTML = '<div class="catalogue-empty"><h3>La cuisine est momentanément indisponible.</h3></div>';
                message.textContent = error.message;
                message.hidden = false;
            }
        }

        document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
            document.querySelectorAll('[data-category]').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            state.category = button.dataset.category;
            render();
        }));
        searchInput.addEventListener('input', () => { state.search = searchInput.value; render(); });

        updateCartCount();
        loadMenuItems();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CATALOGUE_CATEGORY_LABELS, filterCatalogueItems, addCatalogueItemToCart };
}
