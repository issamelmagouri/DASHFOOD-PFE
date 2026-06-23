/**
 * Admin Login - DashFood
 * Gestion de la connexion administrateur
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const errorMessage = document.getElementById('errorMessage');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loginBtn = document.getElementById('loginBtn');

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            const icon = togglePassword.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Hide error message
            hideError();

            // Get form data
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // Validation
            if (!email || !password) {
                showError('Veuillez remplir tous les champs');
                return;
            }

            // Email format validation
            if (!isValidEmail(email)) {
                showError('Veuillez entrer un email valide');
                return;
            }

            // Show loading
            showLoading();
            disableForm();

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Check if user is admin
                    if (data.user.role !== 'admin') {
                        hideLoading();
                        enableForm();
                        showError('Accès réservé aux administrateurs uniquement');
                        return;
                    }

                    // Store token and user data
                    localStorage.setItem('dashfood_token', data.token);
                    localStorage.setItem('dashfood_user', JSON.stringify(data.user));

                    // Success feedback
                    showSuccess();

                    // Redirect to admin dashboard
                    setTimeout(() => {
                        window.location.href = '/admin-dashboard.html';
                    }, 1000);
                } else {
                    // Show error message
                    hideLoading();
                    enableForm();
                    showError(data.message || 'Email ou mot de passe incorrect');
                }
            } catch (error) {
                console.error('Erreur connexion:', error);
                hideLoading();
                enableForm();
                showError('Une erreur est survenue. Veuillez réessayer.');
            }
        });
    }

    // Helper functions
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'flex';
        }
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    function disableForm() {
        if (emailInput) emailInput.disabled = true;
        if (passwordInput) passwordInput.disabled = true;
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.6';
            loginBtn.style.cursor = 'not-allowed';
        }
    }

    function enableForm() {
        if (emailInput) emailInput.disabled = false;
        if (passwordInput) passwordInput.disabled = false;
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.style.opacity = '1';
            loginBtn.style.cursor = 'pointer';
        }
    }

    function showSuccess() {
        // Add success animation to button
        if (loginBtn) {
            const originalText = loginBtn.innerHTML;
            loginBtn.innerHTML = `
                <span class="btn-text">
                    <i class="fas fa-check-circle"></i>
                    Connexion réussie
                </span>
            `;
            loginBtn.style.background = '#2E7D32';
        }
    }

    // Check if already logged in as admin
    const token = localStorage.getItem('dashfood_token');
    const userStr = localStorage.getItem('dashfood_user');

    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.role === 'admin') {
                // Already logged in, redirect to dashboard
                window.location.href = '/admin-dashboard.html';
            }
        } catch (error) {
            console.error('Erreur parsing user data:', error);
        }
    }
});
