// ===== GESTION FORMULAIRE CONTACT DASHFOOD =====

document.addEventListener('DOMContentLoaded', () => {
    // recupere le formulaire
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }
});

// ===== GESTION SOUMISSION FORMULAIRE =====

async function handleFormSubmit(e) {
    e.preventDefault();

    // recupere les valeurs du formulaire
    const formData = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value.trim()
    };

    // validation basique
    if (!formData.fullName || !formData.email || !formData.subject || !formData.message) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'error');
        return;
    }

    // validation email
    if (!isValidEmail(formData.email)) {
        showToast('Veuillez entrer une adresse e-mail valide.', 'error');
        return;
    }

    // desactive le bouton pendant l'envoi
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.querySelector('.submit-text').textContent;
    submitBtn.disabled = true;
    submitBtn.querySelector('.submit-text').textContent = 'ENVOI...';
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';

    try {
        // envoi du formulaire vers l'API backend
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            // succes
            showToast(data.message, 'success');

            // reset le formulaire
            contactForm.reset();

            // log pour debug
            console.log('Message de contact enregistré:', data.data);
        } else {
            // erreur retournee par le serveur
            showToast(data.message || 'Une erreur est survenue.', 'error');
        }

    } catch (error) {
        console.error('Erreur envoi formulaire:', error);
        showToast('Erreur de connexion au serveur. Veuillez réessayer.', 'error');
    } finally {
        // reactive le bouton
        submitBtn.disabled = false;
        submitBtn.querySelector('.submit-text').textContent = originalText;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
}

// ===== VALIDATION EMAIL =====

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===== AFFICHAGE TOAST =====

function showToast(message, type = 'success') {
    const toast = document.getElementById('contactToast');

    if (!toast) return;

    // configure le toast
    toast.textContent = message;
    toast.className = `contact-toast ${type}`;
    toast.style.display = 'block';

    // masque apres 5 secondes
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}
