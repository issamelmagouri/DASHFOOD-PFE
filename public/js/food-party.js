(() => {
    'use strict';

    const token = localStorage.getItem('dashfood_token');
    if (!token) return;

    const state = { selectedRestaurant: null, party: null, profileDelivery: null, refreshTimer: null, alertTimer: null };
    const byId = (id) => document.getElementById(id);
    const el = {
        workspace: byId('foodPartyWorkspace'), openWorkspace: byId('openFoodPartyWorkspace'), alert: byId('foodPartyAlert'),
        start: byId('foodPartyStart'), selectedText: byId('selectedRestaurantText'), chooseRestaurant: byId('chooseRestaurantButton'),
        createParty: byId('createPartyButton'), createAddress: byId('createDeliveryAddress'), createConfirmed: byId('createAddressConfirmed'),
        createProfileLink: byId('createAddressProfileLink'), joinForm: byId('joinPartyForm'), joinCode: byId('joinCodeInput'),
        joinAddress: byId('joinDeliveryAddress'), joinConfirmed: byId('joinAddressConfirmed'), joinButton: byId('joinPartyButton'),
        joinProfileLink: byId('joinAddressProfileLink'),
        picker: byId('restaurantPicker'), closePicker: byId('closeRestaurantPicker'), restaurantLoading: byId('restaurantLoading'),
        restaurantGrid: byId('restaurantGrid'), activeParty: byId('activeParty'), inviteCode: byId('inviteCode'),
        copyLink: byId('copyInviteLink'), restaurantName: byId('partyRestaurantName'), cancelParty: byId('cancelPartyButton'),
        participantCount: byId('participantCount'), participantList: byId('participantList'), menuGrid: byId('menuGrid'),
        cartCount: byId('cartCount'), cartItems: byId('cartItems'), total: byId('partyTotal'),
        addressGroup: byId('deliveryAddressGroup'), address: byId('deliveryAddress'), activeConfirmed: byId('activeAddressConfirmed'),
        confirmAddress: byId('confirmAddressButton'), addressStatus: byId('addressStatus'), checkout: byId('checkoutPartyButton'),
        activeProfileLink: byId('activeAddressProfileLink'), hostNote: byId('hostOnlyNote')
    };
    let currentUser = {};
    try { currentUser = JSON.parse(localStorage.getItem('dashfood_user') || '{}'); } catch (_) { currentUser = {}; }

    const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    const getId = (value) => String(value?._id || value?.id || value || '');
    const isMe = (value) => getId(value) === String(currentUser.id || currentUser._id || '');
    const money = (value) => `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
    const safeImage = (value) => {
        const url = String(value || '');
        return url.startsWith('/') || /^https?:\/\//i.test(url) ? escapeHtml(url) : '/assets/images/restaurant-kitchen.png';
    };

    function redirectToLogin() {
        localStorage.removeItem('dashfood_token');
        localStorage.removeItem('dashfood_user');
        localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        window.location.replace('/login');
    }

    async function api(path, options = {}) {
        const response = await fetch(path, {
            ...options,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
        });
        let data;
        try { data = await response.json(); } catch (_) { data = { message: 'Réponse serveur invalide' }; }
        if (response.status === 401) {
            redirectToLogin();
            throw new Error('Session expirée');
        }
        if (!response.ok) {
            const error = new Error(data.message || 'Une erreur est survenue');
            error.data = data;
            throw error;
        }
        return data;
    }

    function message(text, type = 'success', persistent = false) {
        clearTimeout(state.alertTimer);
        el.alert.textContent = text;
        el.alert.classList.toggle('is-error', type === 'error');
        el.alert.hidden = false;
        if (!persistent) state.alertTimer = setTimeout(() => { el.alert.hidden = true; }, 4500);
    }

    function busy(button, active, label) {
        if (active) {
            button.dataset.label = button.textContent;
            button.textContent = label;
            button.disabled = true;
        } else {
            button.textContent = button.dataset.label || button.textContent;
            button.disabled = false;
        }
    }

    function updateCreateAvailability() {
        el.createParty.disabled = !state.selectedRestaurant || !state.profileDelivery;
    }

    function applyProfileDelivery(user) {
        const delivery = user?.deliveryAddress;
        const address = String(delivery?.address || '').trim();
        state.profileDelivery = address ? {
            address,
            latitude: Number.isFinite(delivery?.latitude) ? delivery.latitude : null,
            longitude: Number.isFinite(delivery?.longitude) ? delivery.longitude : null
        } : null;

        [el.createAddress, el.joinAddress].forEach((field) => {
            field.value = state.profileDelivery?.address || 'Aucune adresse enregistrée';
            field.readOnly = true;
        });
        [el.createConfirmed, el.joinConfirmed].forEach((checkbox) => {
            checkbox.checked = Boolean(state.profileDelivery);
            checkbox.disabled = true;
        });
        el.createProfileLink.hidden = Boolean(state.profileDelivery);
        el.joinProfileLink.hidden = Boolean(state.profileDelivery);
        el.joinButton.disabled = !state.profileDelivery;
        updateCreateAvailability();
    }

    async function loadProfileDelivery() {
        try {
            const data = await api('/api/users/me');
            currentUser = data.user || currentUser;
            applyProfileDelivery(data.user);
        } catch (error) {
            applyProfileDelivery(null);
            if (error.message !== 'Session expirée') message(error.message, 'error', true);
        }
    }

    async function loadRestaurants() {
        el.picker.hidden = false;
        el.restaurantLoading.hidden = false;
        el.restaurantLoading.textContent = 'Chargement des restaurants…';
        el.restaurantGrid.innerHTML = '';
        try {
            const response = await fetch('/api/restaurants');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Impossible de charger les restaurants');
            el.restaurantLoading.hidden = true;
            renderRestaurants(data.restaurants || []);
        } catch (error) {
            el.restaurantLoading.textContent = error.message;
            message(error.message, 'error');
        }
    }

    function renderRestaurants(restaurants) {
        if (!restaurants.length) {
            el.restaurantGrid.innerHTML = '<p class="food-party-empty">Aucun restaurant disponible pour le moment.</p>';
            return;
        }
        el.restaurantGrid.innerHTML = restaurants.map((restaurant) => `
            <article class="food-party-restaurant-card">
                <img src="${safeImage(restaurant.image)}" alt="${escapeHtml(restaurant.name)}" loading="lazy">
                <div class="food-party-restaurant-card-content"><h4>${escapeHtml(restaurant.name)}</h4>
                    <p>${escapeHtml(restaurant.cuisineType || restaurant.category || 'Cuisine variée')}</p>
                    <div class="food-party-card-footer"><span>★ ${Number(restaurant.rating || 0).toFixed(1)}</span>
                        <button class="food-party-button food-party-button-small" type="button" data-restaurant="${escapeHtml(restaurant._id)}">Choisir</button>
                    </div>
                </div>
            </article>`).join('');
        el.restaurantGrid.querySelectorAll('[data-restaurant]').forEach((button) => button.addEventListener('click', () => {
            state.selectedRestaurant = restaurants.find((item) => item._id === button.dataset.restaurant);
            el.selectedText.textContent = `${state.selectedRestaurant.name} — ${state.selectedRestaurant.cuisineType || state.selectedRestaurant.category}`;
            updateCreateAvailability();
            el.picker.hidden = true;
            el.start.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }));
    }

    async function createParty() {
        if (!state.selectedRestaurant || !state.profileDelivery) {
            message('Ajoutez une adresse de livraison dans votre profil avant de créer une Food Party.', 'error');
            return;
        }
        busy(el.createParty, true, 'Création…');
        try {
            const data = await api('/api/food-party/create', {
                method: 'POST',
                body: JSON.stringify({
                    restaurantId: state.selectedRestaurant._id,
                    deliveryAddress: state.profileDelivery.address,
                    latitude: state.profileDelivery.latitude,
                    longitude: state.profileDelivery.longitude,
                    addressConfirmed: true
                })
            });
            setParty(data.party);
            message(data.message);
        } catch (error) {
            if (error.data?.party) setParty(error.data.party);
            message(error.message, 'error');
        } finally { busy(el.createParty, false); updateCreateAvailability(); }
    }

    async function joinParty(code, silent = false) {
        const normalized = String(code || '').trim().toUpperCase();
        if (!normalized) return;
        if (!state.profileDelivery) {
            message('Ajoutez une adresse de livraison dans votre profil avant de rejoindre la Food Party.', 'error', true);
            return;
        }
        try {
            const data = await api(`/api/food-party/${encodeURIComponent(normalized)}/join`, {
                method: 'POST',
                body: JSON.stringify({
                    deliveryAddress: state.profileDelivery.address,
                    latitude: state.profileDelivery.latitude,
                    longitude: state.profileDelivery.longitude,
                    addressConfirmed: true
                })
            });
            setParty(data.party);
            if (!silent) message(data.message);
            history.replaceState({}, '', `${location.pathname}?code=${encodeURIComponent(normalized)}`);
        } catch (error) { message(error.message, 'error', true); }
    }

    function setParty(party) {
        state.party = party;
        el.start.hidden = Boolean(party);
        el.picker.hidden = true;
        el.activeParty.hidden = !party;
        if (!party) return stopRefresh();
        renderParty();
        party.status === 'active' ? startRefresh() : stopRefresh();
    }

    function renderParty() {
        const party = state.party;
        const isHost = isMe(party.host);
        const active = party.status === 'active';
        el.inviteCode.textContent = party.inviteCode;
        el.restaurantName.textContent = `${party.restaurant?.name || 'Restaurant'} · ${party.restaurant?.cuisineType || ''}`;
        el.copyLink.disabled = !active;
        el.cancelParty.hidden = !isHost || !active;
        el.checkout.hidden = !isHost || !active;
        el.addressGroup.hidden = !active;
        const deliveries = party.participantDeliveries || [];
        const allAddressesConfirmed = (party.participants || []).every((participant) =>
            deliveries.some((delivery) => getId(delivery.user) === getId(participant) && delivery.addressConfirmed)
        );
        el.hostNote.hidden = !active || (isHost && allAddressesConfirmed);
        el.hostNote.textContent = isHost
            ? 'Tous les participants doivent confirmer leur adresse avant de créer les livraisons.'
            : 'Seul l’hôte peut créer les livraisons.';
        const myDelivery = deliveries.find((delivery) => isMe(delivery.user));
        const profileAddress = state.profileDelivery?.address || '';
        const addressSynced = Boolean(myDelivery?.addressConfirmed && profileAddress && myDelivery.deliveryAddress === profileAddress);
        el.address.value = profileAddress || 'Aucune adresse enregistrée';
        el.address.readOnly = true;
        el.activeConfirmed.checked = Boolean(state.profileDelivery);
        el.activeConfirmed.disabled = true;
        el.confirmAddress.disabled = !state.profileDelivery || addressSynced;
        el.activeProfileLink.hidden = Boolean(state.profileDelivery);
        el.addressStatus.textContent = addressSynced
            ? 'Adresse du profil confirmée pour votre livraison.'
            : (state.profileDelivery ? 'Confirmez l’adresse actuelle de votre profil.' : 'Aucune adresse enregistrée dans votre profil.');
        el.addressStatus.classList.toggle('is-confirmed', addressSynced);
        renderParticipants(party.participants || [], party.host, deliveries);
        renderMenu(party.restaurant?.menuItems || [], active);
        renderCart(party.items || [], active);
        if (!active) {
            const ordered = party.status === 'ordered';
            message(ordered ? 'Cette Food Party a été commandée. Le panier est maintenant verrouillé.' : 'Cette Food Party a été annulée.', ordered ? 'success' : 'error', true);
        }
    }

    function renderParticipants(participants, host, deliveries) {
        el.participantCount.textContent = participants.length;
        el.participantList.innerHTML = participants.map((person) => {
            const name = person.fullName || person.email || 'Participant';
            const hostLabel = getId(person) === getId(host) ? ' · Hôte' : '';
            const delivery = deliveries.find((entry) => getId(entry.user) === getId(person));
            const addressLabel = delivery?.addressConfirmed ? ' ✓ Adresse confirmée' : ' · Adresse à confirmer';
            return `<span class="food-party-participant"><span class="food-party-avatar">${escapeHtml(name.trim().charAt(0).toUpperCase())}</span>${escapeHtml(name + hostLabel + addressLabel)}</span>`;
        }).join('');
    }

    function renderMenu(items, active) {
        const available = items.filter((item) => item.isAvailable !== false);
        if (!available.length) {
            el.menuGrid.innerHTML = '<p class="food-party-empty">Le menu de ce restaurant ne contient encore aucun plat disponible.</p>';
            return;
        }
        el.menuGrid.innerHTML = available.map((item) => `
            <article class="food-party-menu-card"><img src="${safeImage(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">
                <div class="food-party-menu-card-content"><h4>${escapeHtml(item.name)}</h4>
                    <p>${escapeHtml(item.description || item.category || 'Une belle assiette à partager.')}</p>
                    <div class="food-party-card-footer"><strong>${money(item.price)}</strong>
                        <button class="food-party-button" type="button" data-add="${escapeHtml(item._id)}" ${active ? '' : 'disabled'}>Ajouter</button>
                    </div>
                </div>
            </article>`).join('');
        el.menuGrid.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => addItem(button.dataset.add, button)));
    }

    function renderCart(items, active) {
        el.cartCount.textContent = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        el.total.textContent = money(state.party.totalPrice);
        if (!items.length) {
            el.cartItems.innerHTML = '<p class="food-party-empty">Le panier attend sa première envie.</p>';
            el.checkout.disabled = true;
            return;
        }
        const allAddressesConfirmed = (state.party.participants || []).every((participant) =>
            (state.party.participantDeliveries || []).some((delivery) => getId(delivery.user) === getId(participant) && delivery.addressConfirmed)
        );
        el.checkout.disabled = !active || !allAddressesConfirmed;
        el.cartItems.innerHTML = items.map((item) => {
            const editable = active && isMe(item.addedBy);
            return `<div class="food-party-cart-item">
                <div class="food-party-cart-item-main"><div><strong>${escapeHtml(item.name)}</strong><small>Ajouté par ${escapeHtml(item.addedBy?.fullName || item.addedBy?.email || 'un participant')}</small></div><strong>${money(item.price * item.quantity)}</strong></div>
                <div class="food-party-cart-item-actions"><div class="food-party-quantity">
                    <button type="button" data-update="${escapeHtml(item._id)}" data-quantity="${item.quantity - 1}" ${editable && item.quantity > 1 ? '' : 'disabled'} aria-label="Diminuer">−</button>
                    <span>${Number(item.quantity)}</span>
                    <button type="button" data-update="${escapeHtml(item._id)}" data-quantity="${item.quantity + 1}" ${editable && item.quantity < 99 ? '' : 'disabled'} aria-label="Augmenter">+</button>
                </div>${editable ? `<button class="food-party-remove" type="button" data-remove="${escapeHtml(item._id)}">Supprimer</button>` : ''}</div>
            </div>`;
        }).join('');
        el.cartItems.querySelectorAll('[data-update]').forEach((button) => button.addEventListener('click', () => updateItem(button.dataset.update, Number(button.dataset.quantity))));
        el.cartItems.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => deleteItem(button.dataset.remove)));
    }

    async function addItem(menuItemId, button) {
        busy(button, true, 'Ajout…');
        try {
            const data = await api(`/api/food-party/${state.party.inviteCode}/items`, {
                method: 'POST', body: JSON.stringify({ menuItemId, quantity: 1 })
            });
            state.party = data.party; renderParty(); message(data.message);
        } catch (error) { message(error.message, 'error'); }
        finally { busy(button, false); }
    }

    async function updateItem(itemId, quantity) {
        try {
            const data = await api(`/api/food-party/${state.party.inviteCode}/items/${itemId}`, {
                method: 'PUT', body: JSON.stringify({ quantity })
            });
            state.party = data.party; renderParty();
        } catch (error) { message(error.message, 'error'); }
    }

    async function deleteItem(itemId) {
        try {
            const data = await api(`/api/food-party/${state.party.inviteCode}/items/${itemId}`, { method: 'DELETE' });
            state.party = data.party; renderParty(); message(data.message);
        } catch (error) { message(error.message, 'error'); }
    }

    async function copyLink() {
        const url = `${location.origin}${location.pathname}?code=${encodeURIComponent(state.party.inviteCode)}`;
        try { await navigator.clipboard.writeText(url); }
        catch (_) {
            const input = document.createElement('textarea');
            input.value = url; input.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(input);
            input.select(); document.execCommand('copy'); input.remove();
        }
        message('Lien d’invitation copié');
    }

    async function confirmAddress() {
        if (!state.profileDelivery) {
            message('Ajoutez d’abord une adresse de livraison dans votre profil.', 'error');
            return;
        }
        busy(el.confirmAddress, true, 'Confirmation…');
        try {
            const data = await api(`/api/food-party/${state.party.inviteCode}/address`, {
                method: 'PUT',
                body: JSON.stringify({
                    deliveryAddress: state.profileDelivery.address,
                    latitude: state.profileDelivery.latitude,
                    longitude: state.profileDelivery.longitude,
                    addressConfirmed: true
                })
            });
            state.party = data.party;
            renderParty();
            message(data.message);
        } catch (error) { message(error.message, 'error'); }
        finally {
            busy(el.confirmAddress, false);
            const myDelivery = state.party?.participantDeliveries?.find((delivery) => isMe(delivery.user));
            el.confirmAddress.disabled = !state.profileDelivery || Boolean(myDelivery?.addressConfirmed && myDelivery.deliveryAddress === state.profileDelivery.address);
        }
    }

    async function checkout() {
        if (!confirm('Créer une livraison séparée pour chaque participant ? Le panier sera ensuite verrouillé.')) return;
        busy(el.checkout, true, 'Validation…');
        try {
            const data = await api(`/api/food-party/${state.party.inviteCode}/checkout`, {
                method: 'POST', body: JSON.stringify({})
            });
            state.party = data.party; renderParty();
            message(data.message, 'success', true);
        } catch (error) { message(error.message, 'error'); }
        finally { busy(el.checkout, false); }
    }

    async function cancelParty() {
        if (!confirm('Annuler cette Food Party pour tous les participants ?')) return;
        try {
            const data = await api(`/api/food-party/${state.party.inviteCode}/cancel`, { method: 'POST' });
            state.party = data.party; renderParty(); message(data.message, 'error', true);
        } catch (error) { message(error.message, 'error'); }
    }

    function startRefresh() {
        stopRefresh();
        state.refreshTimer = setInterval(async () => {
            if (document.hidden || !state.party) return;
            try {
                const data = await api(`/api/food-party/${state.party.inviteCode}`);
                state.party = data.party; renderParty();
                if (data.party.status !== 'active') stopRefresh();
            } catch (_) { /* A transient polling error must not interrupt current actions. */ }
        }, 5000);
    }
    function stopRefresh() { if (state.refreshTimer) clearInterval(state.refreshTimer); state.refreshTimer = null; }

    async function initialize() {
        await loadProfileDelivery();
        const code = new URLSearchParams(location.search).get('code');
        try {
            if (code) {
                el.joinCode.value = code.toUpperCase();
                el.workspace.scrollIntoView({ block: 'start' });
                message(
                    state.profileDelivery
                        ? 'Votre adresse de profil est prête. Confirmez pour rejoindre cette Food Party.'
                        : 'Ajoutez une adresse dans votre profil avant de rejoindre cette Food Party.',
                    state.profileDelivery ? 'success' : 'error',
                    true
                );
            }
            else {
                const data = await api('/api/food-party/my');
                if (data.party) setParty(data.party);
            }
        } catch (error) { message(error.message, 'error'); }
    }

    el.openWorkspace.addEventListener('click', () => { el.workspace.scrollIntoView({ behavior: 'smooth' }); if (!state.party) loadRestaurants(); });
    el.chooseRestaurant.addEventListener('click', loadRestaurants);
    el.closePicker.addEventListener('click', () => { el.picker.hidden = true; });
    el.createParty.addEventListener('click', createParty);
    el.joinForm.addEventListener('submit', (event) => { event.preventDefault(); joinParty(el.joinCode.value); });
    el.copyLink.addEventListener('click', copyLink);
    el.confirmAddress.addEventListener('click', confirmAddress);
    el.checkout.addEventListener('click', checkout);
    el.cancelParty.addEventListener('click', cancelParty);
    window.addEventListener('beforeunload', stopRefresh);
    initialize();
})();
