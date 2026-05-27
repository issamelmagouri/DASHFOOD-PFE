/**
 * Gestion de la page "Devenir Livreur"
 * - Vérifie si l'utilisateur est connecté
 * - Redirige selon le rôle
 * - Soumet le formulaire de candidature
 */

// Vérifier le statut de connexion et le rôle au chargement de la page
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

        // Si livreur, rediriger vers livreur-dashboard
        if (user.role === 'livreur') {
            window.location.href = '/livreur-dashboard.html';
            return;
        }

        // Si restaurant, afficher un message et empêcher l'accès
        if (user.role === 'restaurant') {
            showMessage('error', 'Vous possédez déjà un compte restaurant. L\'espace livreur est réservé aux partenaires de livraison DashFood.');
            // Désactiver le formulaire
            disableForm();
            return;
        }

        // Si admin, afficher un message
        if (user.role === 'admin') {
            showMessage('info', 'Vous êtes connecté en tant qu\'administrateur. Cette page est destinée aux candidats livreurs.');
            // Désactiver le formulaire
            disableForm();
            return;
        }

        // Si client, laisser accéder au formulaire
        if (user.role === 'client') {
            // Formulaire accessible
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
    const form = document.getElementById('applicationForm');
    if (form) {
        const inputs = form.querySelectorAll('input, select, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }
}

/**
 * Configure le formulaire de candidature
 */
function setupForm() {
    const form = document.getElementById('applicationForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageBanner = document.getElementById('messageBanner');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Récupérer les données du formulaire
        const formData = {
            city: document.getElementById('city').value.trim(),
            age: document.getElementById('age').value,
            transportType: document.getElementById('transportType').value,
            experience: document.getElementById('experience').value,
            availability: document.getElementById('availability').value
        };

        // Validation
        if (!formData.city || !formData.age || !formData.transportType || !formData.experience || !formData.availability) {
            showMessage('error', 'Tous les champs sont requis');
            return;
        }

        if (formData.age < 18) {
            showMessage('error', 'Vous devez avoir au moins 18 ans pour devenir livreur');
            return;
        }

        // Afficher le loading
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        messageBanner.style.display = 'none';

        try {
            const token = localStorage.getItem('dashfood_token');

            const response = await fetch('/api/delivery/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                showMessage('success', data.message + ' Notre équipe examinera votre candidature sous 48h.');
                // Réinitialiser le formulaire
                form.reset();

                // Rediriger vers la page d'accueil après 3 secondes
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            } else {
                showMessage('error', data.message || 'Une erreur est survenue');
            }

        } catch (error) {
            console.error('Erreur lors de l\'envoi de la candidature:', error);
            showMessage('error', 'Erreur de connexion au serveur');
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
