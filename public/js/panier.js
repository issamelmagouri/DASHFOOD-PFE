function calculateLocalCart(items) {
    const safeItems = Array.isArray(items) ? items : [];
    const subtotal = safeItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
    const firstItem = safeItems[0];
    const deliveryFee = safeItems.length && !firstItem?.freeDelivery ? Number(firstItem?.deliveryFee || 0) : 0;
    return {
        items: safeItems,
        subtotal: Math.round((subtotal + Number.EPSILON) * 100) / 100,
        deliveryFee,
        total: Math.round((subtotal + deliveryFee + Number.EPSILON) * 100) / 100
    };
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const token = localStorage.getItem('dashfood_token');
        const state = { authenticated: Boolean(token), cart: calculateLocalCart([]), addressAvailable: false };
        const itemsContainer = document.getElementById('cartItems');
        const layout = document.getElementById('cartLayout');
        const empty = document.getElementById('emptyCart');
        const notice = document.getElementById('cartNotice');
        const checkout = document.getElementById('checkoutButton');
        const toast = document.getElementById('cartToast');
        let toastTimer;

        const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
        const safeImage = (value) => {
            const image = String(value || '');
            return image.startsWith('/') || /^https?:\/\//i.test(image) ? escapeHtml(image) : '/assets/images/restaurant-kitchen.png';
        };
        const money = (value) => `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

        function localItems() {
            try { return JSON.parse(localStorage.getItem('dashfood_cart') || '[]'); }
            catch (_) { return []; }
        }

        function saveLocalMirror(cart) {
            const items = (cart.items || []).map((item) => ({
                id: item.menuItem || item.id,
                cartItemId: item._id,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                restaurantId: item.restaurant?._id || item.restaurant || item.restaurantId,
                restaurantName: item.restaurantName || item.restaurant?.name,
                deliveryFee: cart.deliveryFee,
                freeDelivery: Number(cart.deliveryFee) === 0
            }));
            localStorage.setItem('dashfood_cart', JSON.stringify(items));
        }

        async function api(path, options = {}) {
            const response = await fetch(path, {
                ...options,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
            });
            let data;
            try { data = await response.json(); } catch (_) { data = { message: 'Réponse serveur invalide' }; }
            if (response.status === 401) {
                localStorage.removeItem('dashfood_token');
                localStorage.removeItem('dashfood_user');
                state.authenticated = false;
                throw new Error('Votre session a expiré. Reconnectez-vous.');
            }
            if (!response.ok) throw new Error(data.message || 'Une erreur est survenue');
            return data;
        }

        function showNotice(text) { notice.textContent = text; notice.hidden = false; }
        function showToast(text) {
            clearTimeout(toastTimer);
            toast.textContent = text;
            toast.hidden = false;
            toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
        }

        function updateNavbarCount() {
            const totalItems = (state.cart.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const badge = document.getElementById('cartCount');
            badge.textContent = totalItems;
            badge.style.display = totalItems ? 'flex' : 'none';
        }

        function render() {
            const hasItems = Boolean(state.cart.items?.length);
            layout.hidden = !hasItems;
            empty.hidden = hasItems;
            updateNavbarCount();
            document.getElementById('cartSubtotal').textContent = money(state.cart.subtotal);
            document.getElementById('cartDeliveryFee').textContent = Number(state.cart.deliveryFee) === 0 ? 'Offerte' : money(state.cart.deliveryFee);
            document.getElementById('cartTotal').textContent = money(state.cart.total);
            checkout.disabled = state.authenticated && !state.addressAvailable;
            if (!hasItems) return;

            itemsContainer.innerHTML = state.cart.items.map((item) => {
                const itemId = item._id || item.cartItemId || item.id;
                return `<article class="cart-item-card">
                    <img class="cart-item-image" src="${safeImage(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.src='/assets/images/restaurant-kitchen.png'">
                    <div class="cart-item-content"><div><p class="cart-item-restaurant">${escapeHtml(item.restaurantName || item.restaurant?.name || 'Restaurant DashFood')}</p><h3>${escapeHtml(item.name)}</h3><p class="cart-unit-price">${money(item.price)} l’unité</p></div>
                    <div class="cart-item-controls"><div class="cart-quantity"><button type="button" data-decrease="${escapeHtml(itemId)}" aria-label="Diminuer">−</button><span>${Number(item.quantity)}</span><button type="button" data-increase="${escapeHtml(itemId)}" aria-label="Augmenter">+</button></div><strong class="cart-line-total">${money(item.price * item.quantity)}</strong><button class="cart-remove" type="button" data-remove="${escapeHtml(itemId)}" aria-label="Supprimer ${escapeHtml(item.name)}">Supprimer</button></div></div>
                </article>`;
            }).join('');
            bindItemActions();
        }

        function findItem(itemId) {
            return state.cart.items.find((item) => String(item._id || item.cartItemId || item.id) === String(itemId));
        }

        async function changeQuantity(itemId, delta) {
            const item = findItem(itemId);
            if (!item) return;
            const nextQuantity = Number(item.quantity) + delta;
            if (nextQuantity < 1) return removeItem(itemId);
            try {
                if (state.authenticated) {
                    const data = await api(`/api/cart/item/${encodeURIComponent(itemId)}`, { method: 'PUT', body: JSON.stringify({ quantity: nextQuantity }) });
                    state.cart = data.cart;
                    saveLocalMirror(state.cart);
                } else {
                    item.quantity = nextQuantity;
                    localStorage.setItem('dashfood_cart', JSON.stringify(state.cart.items));
                    state.cart = calculateLocalCart(state.cart.items);
                }
                render();
            } catch (error) { showNotice(error.message); }
        }

        async function removeItem(itemId) {
            try {
                if (state.authenticated) {
                    const data = await api(`/api/cart/item/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
                    state.cart = data.cart;
                    saveLocalMirror(state.cart);
                } else {
                    state.cart.items = state.cart.items.filter((item) => String(item.id || item.cartItemId) !== String(itemId));
                    localStorage.setItem('dashfood_cart', JSON.stringify(state.cart.items));
                    state.cart = calculateLocalCart(state.cart.items);
                }
                render();
                showToast('Article supprimé du panier');
            } catch (error) { showNotice(error.message); }
        }

        function bindItemActions() {
            itemsContainer.querySelectorAll('[data-increase]').forEach((button) => button.addEventListener('click', () => changeQuantity(button.dataset.increase, 1)));
            itemsContainer.querySelectorAll('[data-decrease]').forEach((button) => button.addEventListener('click', () => changeQuantity(button.dataset.decrease, -1)));
            itemsContainer.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => removeItem(button.dataset.remove)));
        }

        async function loadAddress() {
            if (!state.authenticated) {
                document.getElementById('deliveryAddressTitle').textContent = 'Connexion requise';
                document.getElementById('deliveryAddressText').textContent = 'Connectez-vous pour utiliser votre adresse enregistrée.';
                return;
            }
            try {
                const data = await api('/api/users/me');
                const address = String(data.user?.deliveryAddress?.address || '').trim();
                state.addressAvailable = Boolean(address);
                document.getElementById('deliveryAddressText').textContent = address || 'Veuillez ajouter une adresse dans votre profil';
                document.getElementById('profileAddressLink').hidden = Boolean(address);
                if (!address) showNotice('Veuillez ajouter une adresse dans votre profil avant de commander.');
            } catch (error) { showNotice(error.message); }
        }

        async function syncAndLoadCart() {
            if (!state.authenticated) {
                state.cart = calculateLocalCart(localItems());
                render();
                return;
            }
            try {
                let data = await api('/api/cart');
                const pendingLocalItems = localItems();
                if (!data.cart.items.length && pendingLocalItems.length) {
                    for (const item of pendingLocalItems) {
                        try {
                            await api('/api/cart/add', { method: 'POST', body: JSON.stringify({ menuItemId: item.id, quantity: item.quantity || 1 }) });
                        } catch (error) {
                            showNotice(error.message);
                            break;
                        }
                    }
                    data = await api('/api/cart');
                }
                state.cart = data.cart;
                saveLocalMirror(state.cart);
                render();
            } catch (error) {
                showNotice(error.message);
                state.cart = calculateLocalCart(localItems());
                render();
            }
        }

        document.getElementById('clearCartButton').addEventListener('click', async () => {
            if (!confirm('Vider entièrement votre panier ?')) return;
            try {
                if (state.authenticated) await api('/api/cart/clear', { method: 'DELETE' });
                localStorage.removeItem('dashfood_cart');
                state.cart = calculateLocalCart([]);
                render();
            } catch (error) { showNotice(error.message); }
        });

        checkout.addEventListener('click', async () => {
            if (!state.authenticated) {
                localStorage.setItem('redirectAfterLogin', '/panier');
                location.href = '/login';
                return;
            }
            if (!state.addressAvailable || !state.cart.items.length) return;
            checkout.disabled = true;
            checkout.textContent = 'Création de la commande…';
            try {
                const data = await api('/api/orders/create', {
                    method: 'POST',
                    body: JSON.stringify({ paymentMethod: document.getElementById('paymentMethod').value })
                });
                localStorage.removeItem('dashfood_cart');
                state.cart = calculateLocalCart([]);
                render();
                showToast(`${data.message}. Redirection vers vos commandes…`);
                setTimeout(() => { location.href = '/orders'; }, 1400);
            } catch (error) {
                showNotice(error.message);
                checkout.disabled = false;
                checkout.textContent = 'Passer la commande';
            }
        });

        Promise.all([loadAddress(), syncAndLoadCart()]).then(render);
    });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { calculateLocalCart };
