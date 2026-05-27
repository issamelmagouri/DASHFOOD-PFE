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

    // ===== Hero Search - Uber Eats Style =====
    const locationInput = document.querySelector('.location-input');
    const confirmBtn = document.querySelector('.confirm-btn');

    if (confirmBtn && locationInput) {
        confirmBtn.addEventListener('click', function() {
            const address = locationInput.value.trim();
            if (address) {
                window.location.href = `/restaurants.html?address=${encodeURIComponent(address)}`;
            } else {
                showToast('Veuillez entrer une adresse de livraison', 'warning');
            }
        });

        locationInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const address = this.value.trim();
                if (address) {
                    window.location.href = `/restaurants.html?address=${encodeURIComponent(address)}`;
                } else {
                    showToast('Veuillez entrer une adresse de livraison', 'warning');
                }
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
