// DashFood - Main JavaScript
// Premium design functionality

document.addEventListener('DOMContentLoaded', function() {
    // ===== Navbar Scroll Effect =====
    const navbar = document.getElementById('navbar');

    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // ===== Mobile Menu Toggle =====
    const mobileToggle = document.getElementById('mobile-toggle');
    const navbarMenu = document.getElementById('navbar-menu');

    if (mobileToggle && navbarMenu) {
        mobileToggle.addEventListener('click', function() {
            navbarMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileToggle.contains(e.target) && !navbarMenu.contains(e.target)) {
                navbarMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            }
        });

        // Close menu when clicking on a link
        const navLinks = navbarMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navbarMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            });
        });
    }

    // ===== Hero Food Slider =====
    const sliderImages = document.querySelectorAll('.slider-img');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    let sliderInterval;

    function showSlide(index) {
        // Remove active class from all
        sliderImages.forEach(img => img.classList.remove('active'));
        indicators.forEach(ind => ind.classList.remove('active'));

        // Add active class to current
        if (sliderImages[index]) {
            sliderImages[index].classList.add('active');
        }
        if (indicators[index]) {
            indicators[index].classList.add('active');
        }

        currentSlide = index;
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % sliderImages.length;
        showSlide(currentSlide);
    }

    function startSlider() {
        sliderInterval = setInterval(nextSlide, 4500);
    }

    function stopSlider() {
        clearInterval(sliderInterval);
    }

    // Initialize slider
    if (sliderImages.length > 0 && indicators.length > 0) {
        showSlide(0);
        startSlider();

        // Click on indicators
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', function() {
                stopSlider();
                showSlide(index);
                startSlider();
            });
        });

        // Pause on hover
        const sliderWrapper = document.querySelector('.slider-wrapper');
        if (sliderWrapper) {
            sliderWrapper.addEventListener('mouseenter', stopSlider);
            sliderWrapper.addEventListener('mouseleave', startSlider);
        }
    }

    // ===== Hero Search - Address Bar avec Géolocalisation =====
    const homeAddressInput = document.getElementById('homeAddressInput');
    const homeLocationBtn = document.getElementById('homeLocationBtn');
    const homeLocationBtnText = document.getElementById('homeLocationBtnText');
    const homeConfirmAddressBtn = document.getElementById('homeConfirmAddressBtn');

    // Variables pour stocker la position GPS
    let currentHomeLatitude = null;
    let currentHomeLongitude = null;

    // ===== Fonction Reverse Geocoding =====
    async function reverseGeocode(latitude, longitude) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'DashFood/1.0' // Nominatim requiert un User-Agent
                }
            });

            if (!response.ok) {
                throw new Error('Erreur reverse geocoding');
            }

            const data = await response.json();
            console.log('Reverse geocoding response:', data);

            // Extraction adresse courte - Priorité : road > pedestrian > footway > neighbourhood > suburb > city
            const address = data.address || {};

            let shortAddress =
                address.road ||
                address.pedestrian ||
                address.footway ||
                address.neighbourhood ||
                address.suburb ||
                address.city ||
                address.town ||
                address.village ||
                'Adresse détectée';

            console.log('Adresse courte extraite:', shortAddress);
            return shortAddress;

        } catch (error) {
            console.error('Erreur reverse geocoding:', error);
            return 'Adresse détectée'; // Fallback en cas d'erreur
        }
    }

    // ===== Bouton "Ma position" - Géolocalisation =====
    if (homeLocationBtn) {
        homeLocationBtn.addEventListener('click', function() {
            console.log('Bouton Ma position cliqué');

            // Vérifie si l'utilisateur est connecté
            const token = localStorage.getItem('dashfood_token');
            if (!token) {
                showToast('Veuillez vous connecter pour enregistrer votre position', 'warning');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            // Vérifie si la géolocalisation est supportée
            if (!navigator.geolocation) {
                showToast('La géolocalisation n\'est pas supportée par votre navigateur', 'error');
                return;
            }

            // Change le texte du bouton
            homeLocationBtnText.textContent = 'Localisation...';
            homeLocationBtn.disabled = true;

            // Options pour la géolocalisation
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            // Demande la position
            navigator.geolocation.getCurrentPosition(
                // Succès
                async (position) => {
                    currentHomeLatitude = position.coords.latitude;
                    currentHomeLongitude = position.coords.longitude;

                    console.log('Position récupérée', currentHomeLatitude, currentHomeLongitude);

                    // Conversion latitude/longitude en adresse courte
                    homeLocationBtnText.textContent = 'Récupération...';
                    const shortAddress = await reverseGeocode(currentHomeLatitude, currentHomeLongitude);

                    // Remplit l'input avec l'adresse courte (ex: "Rue de Fès")
                    homeAddressInput.value = shortAddress;
                    console.log('Adresse affichée:', shortAddress);

                    // Enregistre automatiquement l'adresse via l'API
                    try {
                        const response = await fetch('/api/users/me/address', {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                label: 'Domicile',
                                address: shortAddress, // Adresse courte (ex: "Rue de Fès")
                                latitude: currentHomeLatitude,
                                longitude: currentHomeLongitude
                            })
                        });

                        const data = await response.json();

                        if (data.success) {
                            showToast('Position enregistrée avec succès', 'success');
                            homeLocationBtnText.textContent = '✓ Enregistrée';

                            // Met à jour le localStorage
                            localStorage.setItem('dashfood_user', JSON.stringify(data.user));

                            setTimeout(() => {
                                homeLocationBtnText.textContent = 'Ma position';
                                homeLocationBtn.disabled = false;
                            }, 2000);
                        } else {
                            showToast('Erreur lors de l\'enregistrement: ' + data.message, 'error');
                            homeLocationBtnText.textContent = 'Ma position';
                            homeLocationBtn.disabled = false;
                        }
                    } catch (error) {
                        console.error('Erreur enregistrement adresse:', error);
                        showToast('Erreur lors de l\'enregistrement', 'error');
                        homeLocationBtnText.textContent = 'Ma position';
                        homeLocationBtn.disabled = false;
                    }
                },
                // Erreur
                (error) => {
                    let errorMessage = 'Impossible d\'obtenir votre position';

                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Autorisation de localisation refusée';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Informations de localisation non disponibles';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'La demande de localisation a expiré';
                            break;
                    }

                    console.error('Erreur géolocalisation:', error);
                    showToast(errorMessage, 'error');
                    homeLocationBtnText.textContent = 'Ma position';
                    homeLocationBtn.disabled = false;
                },
                options
            );
        });
    }

    // ===== Bouton "Confirmer" - Enregistrement adresse manuelle =====
    if (homeConfirmAddressBtn && homeAddressInput) {
        homeConfirmAddressBtn.addEventListener('click', async function() {
            console.log('Bouton Confirmer cliqué');
            const address = homeAddressInput.value.trim();

            if (!address) {
                showToast('Veuillez entrer une adresse de livraison', 'warning');
                return;
            }

            // Vérifie si l'utilisateur est connecté
            const token = localStorage.getItem('dashfood_token');
            if (!token) {
                // Si pas connecté, redirige simplement vers restaurants.html
                window.location.href = `/restaurants.html?address=${encodeURIComponent(address)}`;
                return;
            }

            // Si connecté, enregistre l'adresse via l'API
            try {
                const response = await fetch('/api/users/me/address', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        label: 'Domicile',
                        address: address,
                        latitude: currentHomeLatitude,  // null si pas de géolocalisation
                        longitude: currentHomeLongitude  // null si pas de géolocalisation
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showToast('Adresse enregistrée avec succès', 'success');

                    // Met à jour le localStorage
                    localStorage.setItem('dashfood_user', JSON.stringify(data.user));

                    // Redirige vers restaurants.html après 1 seconde
                    setTimeout(() => {
                        window.location.href = `/restaurants.html?address=${encodeURIComponent(address)}`;
                    }, 1000);
                } else {
                    showToast('Erreur lors de l\'enregistrement: ' + data.message, 'error');
                    // Redirige quand même
                    setTimeout(() => {
                        window.location.href = `/restaurants.html?address=${encodeURIComponent(address)}`;
                    }, 1500);
                }
            } catch (error) {
                console.error('Erreur enregistrement adresse:', error);
                showToast('Erreur lors de l\'enregistrement', 'error');
                // Redirige quand même
                setTimeout(() => {
                    window.location.href = `/restaurants.html?address=${encodeURIComponent(address)}`;
                }, 1500);
            }
        });

        // Enter key sur l'input
        homeAddressInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                homeConfirmAddressBtn.click();
            }
        });
    }

    // ===== Active Link Highlight =====
    const currentPath = window.location.pathname;
    const allNavLinks = document.querySelectorAll('.nav-link');

    allNavLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = new URL(link.href).pathname;

        if (linkPath === currentPath || (currentPath === '/' && linkPath === '/')) {
            link.classList.add('active');
        }
    });

    // ===== Loyalty Section Scroll Animation =====
    const loyaltySection = document.querySelector('.loyalty-section');
    if (loyaltySection) {
        const loyaltyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.2 });
        loyaltyObserver.observe(loyaltySection);
    }

    // ===== Smooth Scroll Animations =====
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements
    const animatedElements = document.querySelectorAll('.testimonial-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// ===== Toast Notification Function =====
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ===== Format Price Function =====
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}
