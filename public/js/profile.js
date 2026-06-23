// ===== GESTION PROFIL UTILISATEUR =====

let currentUser = null;

// ===== INITIALISATION =====

document.addEventListener('DOMContentLoaded', () => {
    // verifie si user connecté
    checkAuth();

    // charge les donnees du profil
    loadUserProfile();

    // event listeners pour les boutons
    setupEventListeners();

    // smooth scroll pour les liens menu
    setupSmoothScroll();
});

// ===== VERIF AUTHENTIFICATION =====

function checkAuth() {
    const token = localStorage.getItem('dashfood_token');
    const user = localStorage.getItem('dashfood_user');

    if (!token || !user) {
        // redirige vers login si pas connecte
        window.location.href = '/login';
        return;
    }

    try {
        currentUser = JSON.parse(user);
        console.log('User connecté:', currentUser);
    } catch (error) {
        console.error('Erreur parse user data:', error);
        window.location.href = '/login';
    }
}

// ===== CHARGEMENT PROFIL =====

async function loadUserProfile() {
    try {
        const token = localStorage.getItem('dashfood_token');

        // appel API pour recuperer le profil complet
        const response = await fetch('/api/users/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            // met a jour localStorage
            localStorage.setItem('dashfood_user', JSON.stringify(currentUser));
            // affiche les donnees
            displayUserData();
        } else {
            console.error('Erreur chargement profil:', data.message);
        }
    } catch (error) {
        console.error('Erreur fetch profil:', error);
        // affiche quand meme les donnees du localStorage
        displayUserData();
    }
}

// ===== AFFICHAGE DONNEES =====

function displayUserData() {
    if (!currentUser) return;

    // separe prenom et nom
    let firstName = currentUser.firstName || '';
    let lastName = currentUser.lastName || '';

    if (!firstName && !lastName && currentUser.fullName) {
        const parts = currentUser.fullName.split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
    }

    // avatar initiale
    const initial = firstName.charAt(0).toUpperCase() || currentUser.email.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = initial;

    // sidebar
    document.getElementById('userName').textContent = currentUser.fullName || `${firstName} ${lastName}`;
    document.getElementById('userEmail').textContent = currentUser.email || '';

    // header nom
    document.getElementById('headerName').textContent = firstName || 'Client';

    // section infos personnelles
    document.getElementById('displayFirstName').textContent = firstName || '-';
    document.getElementById('displayLastName').textContent = lastName || '-';
    document.getElementById('displayEmail').textContent = currentUser.email || '-';
    document.getElementById('displayPhone').textContent = currentUser.phone || '-';

    // date de naissance
    // IMPORTANT: date verrouillée après enregistrement pour eviter abus bonus anniversaire
    if (currentUser.dateOfBirth) {
        const date = new Date(currentUser.dateOfBirth);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        document.getElementById('displayDateOfBirth').textContent = date.toLocaleDateString('fr-FR', options);
        // affiche le badge et message de verrouillage
        document.getElementById('birthDateLockedBadge').style.display = 'inline-block';
        document.getElementById('birthDateLockMessage').style.display = 'block';
    } else {
        document.getElementById('displayDateOfBirth').textContent = '-';
        // cache le badge si pas de date
        document.getElementById('birthDateLockedBadge').style.display = 'none';
        document.getElementById('birthDateLockMessage').style.display = 'none';
    }

    document.getElementById('displayCity').textContent = currentUser.city || '-';

    // section adresse de livraison
    if (currentUser.deliveryAddress && currentUser.deliveryAddress.address) {
        // Affiche deliveryAddress si disponible
        const label = currentUser.deliveryAddress.label || 'Mon adresse';
        const address = currentUser.deliveryAddress.address || '-';
        const lat = currentUser.deliveryAddress.latitude;
        const lng = currentUser.deliveryAddress.longitude;

        document.getElementById('displayAddressLabel').textContent = label;
        document.getElementById('displayAddress').textContent = address;

        // Affiche coordonnées GPS si disponibles
        if (lat && lng) {
            document.getElementById('displayCoordinates').textContent = `📍 Coordonnées: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            document.getElementById('displayCoordinates').style.display = 'block';
        } else {
            document.getElementById('displayCoordinates').style.display = 'none';
        }
    } else {
        // Fallback sur ancienne adresse si deliveryAddress pas encore défini
        const addressText = currentUser.address || '-';
        const cityText = currentUser.city || '';
        document.getElementById('displayAddressLabel').textContent = 'Mon adresse';
        document.getElementById('displayAddress').innerHTML = `${addressText}<br>${cityText}`;
        document.getElementById('displayCoordinates').style.display = 'none';
    }

    // preferences switches
    if (currentUser.preferences) {
        document.getElementById('prefNotifications').checked = currentUser.preferences.notifications !== false;
        document.getElementById('prefPromotions').checked = currentUser.preferences.promotions !== false;
        document.getElementById('prefNewsletter').checked = currentUser.preferences.newsletter === true;
        document.getElementById('prefAnalytics').checked = currentUser.preferences.analytics !== false;
    }
}

// ===== EVENT LISTENERS =====

function setupEventListeners() {
    // bouton modifier infos
    document.getElementById('editInfoBtn').addEventListener('click', enterEditModeInfo);
    document.getElementById('cancelInfoBtn').addEventListener('click', cancelEditInfo);
    document.getElementById('saveInfoBtn').addEventListener('click', savePersonalInfo);

    // bouton modifier adresse
    document.getElementById('editAddressBtn').addEventListener('click', enterEditModeAddress);
    document.getElementById('cancelAddressBtn').addEventListener('click', cancelEditAddress);
    document.getElementById('saveAddressBtn').addEventListener('click', saveAddress);

    // bouton geolocalisation
    document.getElementById('getLocationBtn').addEventListener('click', getCurrentLocation);

    // switches preferences
    document.getElementById('prefNotifications').addEventListener('change', updatePreference);
    document.getElementById('prefPromotions').addEventListener('change', updatePreference);
    document.getElementById('prefNewsletter').addEventListener('change', updatePreference);
    document.getElementById('prefAnalytics').addEventListener('change', updatePreference);

    // logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // suppression compte
    document.getElementById('deleteAccountBtn').addEventListener('click', deleteAccount);
}

// ===== MODE EDITION INFOS =====

function enterEditModeInfo() {
    // affiche mode edition
    document.getElementById('infoReadMode').style.display = 'none';
    document.getElementById('infoEditMode').style.display = 'block';

    // remplit les inputs avec les valeurs actuelles
    let firstName = currentUser.firstName || '';
    let lastName = currentUser.lastName || '';

    if (!firstName && !lastName && currentUser.fullName) {
        const parts = currentUser.fullName.split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
    }

    document.getElementById('editFirstName').value = firstName;
    document.getElementById('editLastName').value = lastName;
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editPhone').value = currentUser.phone || '';
    document.getElementById('editCity').value = currentUser.city || '';

    // date de naissance au format YYYY-MM-DD
    const birthDateInput = document.getElementById('editDateOfBirth');
    if (currentUser.dateOfBirth) {
        // date existe deja: verrouiller le champ (securité bonus anniversaire)
        const date = new Date(currentUser.dateOfBirth);
        const formattedDate = date.toISOString().split('T')[0];
        birthDateInput.value = formattedDate;
        birthDateInput.disabled = true;
        birthDateInput.style.opacity = '0.6';
        birthDateInput.style.cursor = 'not-allowed';
        // affiche le label verrouillé
        document.getElementById('birthDateLockedLabel').style.display = 'inline';
        document.getElementById('birthDateEditMessage').style.display = 'none';
    } else {
        // date pas encore definie: autorise saisie une seule fois
        birthDateInput.disabled = false;
        birthDateInput.style.opacity = '1';
        birthDateInput.style.cursor = 'text';
        document.getElementById('birthDateLockedLabel').style.display = 'none';
        // affiche message d'avertissement
        document.getElementById('birthDateEditMessage').style.display = 'block';
    }
}

function cancelEditInfo() {
    // retour mode lecture
    document.getElementById('infoReadMode').style.display = 'block';
    document.getElementById('infoEditMode').style.display = 'none';
}

async function savePersonalInfo() {
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const dateOfBirth = document.getElementById('editDateOfBirth').value;
    const city = document.getElementById('editCity').value.trim();

    if (!firstName || !lastName || !email || !phone) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    // prepare le body de la requete
    const updateData = {
        firstName,
        lastName,
        email,
        phone,
        city
    };

    // n'envoie la date de naissance que si elle n'existe pas deja
    // securité: eviter tentative de modification pour le bonus anniversaire
    if (!currentUser.dateOfBirth && dateOfBirth) {
        updateData.dateOfBirth = dateOfBirth;
    }

    try {
        const token = localStorage.getItem('dashfood_token');

        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (data.success) {
            // met a jour le user local
            currentUser = data.user;
            localStorage.setItem('dashfood_user', JSON.stringify(currentUser));

            // affiche les nouvelles donnees
            displayUserData();

            // retour mode lecture
            cancelEditInfo();

            alert('Profil mis à jour avec succès!');
        } else {
            // affiche message d'erreur du backend (ex: tentative modification date verrouillée)
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur sauvegarde profil:', error);
        alert('Une erreur est survenue lors de la mise à jour');
    }
}

// ===== MODE EDITION ADRESSE =====

let currentLatitude = null;
let currentLongitude = null;

function enterEditModeAddress() {
    document.getElementById('addressReadMode').style.display = 'none';
    document.getElementById('addressEditMode').style.display = 'block';

    // Remplit les inputs avec deliveryAddress si disponible, sinon ancienne adresse
    if (currentUser.deliveryAddress && currentUser.deliveryAddress.address) {
        document.getElementById('editAddressLabel').value = currentUser.deliveryAddress.label || 'Mon adresse';
        document.getElementById('editAddress').value = currentUser.deliveryAddress.address || '';
        currentLatitude = currentUser.deliveryAddress.latitude || null;
        currentLongitude = currentUser.deliveryAddress.longitude || null;

        // Affiche les coordonnées si disponibles
        if (currentLatitude && currentLongitude) {
            document.getElementById('coordinatesDisplay').style.display = 'block';
            document.getElementById('displayLatLng').value = `Lat: ${currentLatitude.toFixed(6)}, Lng: ${currentLongitude.toFixed(6)}`;
        } else {
            document.getElementById('coordinatesDisplay').style.display = 'none';
        }
    } else {
        // Fallback sur ancienne adresse
        document.getElementById('editAddressLabel').value = 'Mon adresse';
        document.getElementById('editAddress').value = currentUser.address || '';
        currentLatitude = null;
        currentLongitude = null;
        document.getElementById('coordinatesDisplay').style.display = 'none';
    }
}

function cancelEditAddress() {
    document.getElementById('addressReadMode').style.display = 'block';
    document.getElementById('addressEditMode').style.display = 'none';
    // Reset coordonnées temporaires
    currentLatitude = null;
    currentLongitude = null;
}

// ===== GEOLOCALISATION =====

function getCurrentLocation() {
    const btn = document.getElementById('getLocationBtn');
    const btnText = document.getElementById('locationBtnText');

    // Vérifie si la géolocalisation est supportée
    if (!navigator.geolocation) {
        alert('La géolocalisation n\'est pas supportée par votre navigateur');
        return;
    }

    // Change le texte du bouton
    btnText.textContent = 'Localisation en cours...';
    btn.disabled = true;

    // Options pour la géolocalisation
    const options = {
        enableHighAccuracy: true, // Précision maximale
        timeout: 10000, // Timeout de 10 secondes
        maximumAge: 0 // Ne pas utiliser le cache
    };

    // Demande la position
    navigator.geolocation.getCurrentPosition(
        // Succès
        (position) => {
            currentLatitude = position.coords.latitude;
            currentLongitude = position.coords.longitude;

            // Affiche les coordonnées
            document.getElementById('coordinatesDisplay').style.display = 'block';
            document.getElementById('displayLatLng').value = `Lat: ${currentLatitude.toFixed(6)}, Lng: ${currentLongitude.toFixed(6)}`;

            // Restaure le bouton
            btnText.textContent = '✓ Position obtenue';
            setTimeout(() => {
                btnText.textContent = 'Ma position';
                btn.disabled = false;
            }, 2000);

            console.log('Position obtenue:', currentLatitude, currentLongitude);
        },
        // Erreur
        (error) => {
            let errorMessage = 'Impossible d\'obtenir votre position';

            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Vous avez refusé l\'accès à votre position. Veuillez autoriser la géolocalisation dans les paramètres de votre navigateur.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Informations de localisation non disponibles.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'La demande de localisation a expiré.';
                    break;
            }

            alert(errorMessage);
            console.error('Erreur géolocalisation:', error);

            // Restaure le bouton
            btnText.textContent = 'Ma position';
            btn.disabled = false;
        },
        options
    );
}

async function saveAddress() {
    const label = document.getElementById('editAddressLabel').value.trim();
    const address = document.getElementById('editAddress').value.trim();

    if (!address) {
        alert('Veuillez remplir l\'adresse');
        return;
    }

    if (!label) {
        alert('Veuillez donner un nom à cette adresse (ex: Domicile, Bureau)');
        return;
    }

    try {
        const token = localStorage.getItem('dashfood_token');

        // Prépare les données à envoyer
        const addressData = {
            label: label,
            address: address,
            latitude: currentLatitude,
            longitude: currentLongitude
        };

        // Appel à la nouvelle route PUT /api/users/me/address
        const response = await fetch('/api/users/me/address', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressData)
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('dashfood_user', JSON.stringify(currentUser));

            displayUserData();
            cancelEditAddress();

            alert('Adresse de livraison mise à jour avec succès!');
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur sauvegarde adresse:', error);
        alert('Une erreur est survenue lors de la mise à jour de l\'adresse');
    }
}

// ===== PREFERENCES =====

async function updatePreference(e) {
    const prefName = e.target.id.replace('pref', '').toLowerCase();
    const value = e.target.checked;

    try {
        const token = localStorage.getItem('dashfood_token');

        const response = await fetch('/api/users/preferences', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                [prefName]: value
            })
        });

        const data = await response.json();

        if (data.success) {
            // met a jour preferences locales
            if (!currentUser.preferences) {
                currentUser.preferences = {};
            }
            currentUser.preferences[prefName] = value;
            localStorage.setItem('dashfood_user', JSON.stringify(currentUser));

            console.log(`Préférence ${prefName} mise à jour:`, value);
        } else {
            // revert le switch si erreur
            e.target.checked = !value;
            alert('Erreur mise à jour préférence');
        }
    } catch (error) {
        console.error('Erreur update preference:', error);
        e.target.checked = !value;
    }
}

// ===== LOGOUT =====

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        // supprime les donnees de session
        localStorage.removeItem('dashfood_token');
        localStorage.removeItem('dashfood_user');

        // redirige vers accueil
        window.location.href = '/';
    }
}

// ===== SUPPRESSION COMPTE =====

function deleteAccount() {
    const confirmation = confirm('⚠️ ATTENTION ⚠️\n\nLa suppression de votre compte est DÉFINITIVE.\n\nVous perdrez:\n- Toutes vos informations personnelles\n- Votre historique de commandes\n- Vos DashPoints accumulés\n- Vos préférences\n\nÊtes-vous absolument certain de vouloir continuer?');

    if (!confirmation) return;

    const doubleConfirmation = prompt('Pour confirmer la suppression, veuillez taper "SUPPRIMER" en majuscules:');

    if (doubleConfirmation !== 'SUPPRIMER') {
        alert('Suppression annulée');
        return;
    }

    // TODO: implementer route DELETE /api/users/account
    alert('Fonctionnalité de suppression de compte à implémenter côté backend');
}

// ===== SMOOTH SCROLL =====

function setupSmoothScroll() {
    // tous les liens qui commencent par #
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // scroll vers la section
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // met a jour le menu actif
                document.querySelectorAll('.menu-item').forEach(item => {
                    item.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
}
