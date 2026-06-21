/**
 * Gestion de la page "Devenir Restaurant Partenaire"
 * - Vérifie si l'utilisateur est connecté
 * - Redirige selon le rôle
 * - Soumet le formulaire de candidature restaurant
 */

// Vérifier le statut de connexion et le rôle au chargement
document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus();
    setupForm();
});

/**
 * Vérifie le statut de l'utilisateur et redirige si nécessaire
 */
function checkUserStatus() {
    const token = localStorage.getItem('dashfood_token');
    const userStr = localStorage.getItem('dashfood_user');

    // Si non connecté, rediriger vers login
    if (!token || !userStr) {
        window.location.href = '/login';
        return;
    }

    try {
        const user = JSON.parse(userStr);

        // Si déjà restaurant, rediriger vers dashboard
        if (user.role === 'restaurant') {
            window.location.href = '/restaurant-dashboard.html';
            return;
        }

        // Si livreur, bloquer l'accès
        if (user.role === 'livreur') {
            showMessage('error', 'Vous possédez déjà un compte livreur. L\'espace restaurant est réservé aux établissements partenaires.');
            disableForm();
            return;
        }

        // Si admin, bloquer l'accès
        if (user.role === 'admin') {
            showMessage('info', 'Vous êtes connecté en tant qu\'administrateur. Cette page est destinée aux candidats restaurants.');
            disableForm();
            return;
        }

        // Si client, autoriser l'accès
        if (user.role === 'client') {
            console.log('Client connecté, accès au formulaire autorisé');
        }

    } catch (error) {
        console.error('Erreur lors de la vérification du statut:', error);
        localStorage.removeItem('dashfood_token');
        localStorage.removeItem('dashfood_user');
        window.location.href = '/login';
    }
}

/**
 * Désactive le formulaire
 */
function disableForm() {
    const form = document.getElementById('restaurantForm');
    if (form) {
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }
}

/**
 * Configure le formulaire de candidature
 */
function setupForm() {
    const form = document.getElementById('restaurantForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageBanner = document.getElementById('messageBanner');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Récupérer les données du formulaire
        const formData = {
            restaurantName: document.getElementById('restaurantName').value.trim(),
            cuisineType: document.getElementById('cuisineType').value,
            city: document.getElementById('city').value.trim(),
            address: document.getElementById('address').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            openingHours: document.getElementById('openingHours').value.trim(),
            description: document.getElementById('description').value.trim()
        };

        // Validation basique
        if (!formData.restaurantName || !formData.cuisineType || !formData.city ||
            !formData.address || !formData.phone || !formData.email ||
            !formData.openingHours || !formData.description) {
            showMessage('error', 'Tous les champs sont obligatoires');
            return;
        }

        // Validation email
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(formData.email)) {
            showMessage('error', 'Veuillez entrer une adresse e-mail valide');
            return;
        }

        // Masquer les messages précédents
        messageBanner.style.display = 'none';

        // Afficher le loading
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const token = localStorage.getItem('dashfood_token');

            const response = await fetch('/api/restaurant-partner/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                showMessage('success', data.message + ' Notre équipe examinera votre candidature sous 48h et vous contactera par e-mail.');
                // Réinitialiser le formulaire
                form.reset();

                // Rediriger vers la page d'accueil après 4 secondes
                setTimeout(() => {
                    window.location.href = '/';
                }, 4000);
            } else {
                showMessage('error', data.message || 'Une erreur est survenue');
            }

        } catch (error) {
            console.error('Erreur lors de l\'envoi de la candidature:', error);
            showMessage('error', 'Erreur de connexion au serveur. Veuillez réessayer.');
        } finally {
            // Retirer le loading
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
}

/**
 * Affiche un message dans la bannière
 */
function showMessage(type, message) {
    const messageBanner = document.getElementById('messageBanner');
    messageBanner.textContent = message;
    messageBanner.className = `message-banner ${type}`;
    messageBanner.style.display = 'block';

    // Faire défiler vers le message
    messageBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
