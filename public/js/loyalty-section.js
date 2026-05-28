/*
 * ========================================
 * SECTION DASHPOINTS DYNAMIQUE - HOMEPAGE
 * ========================================
 *
 * Cette section affiche :
 * - Si utilisateur connecté : SA carte DashPoints avec ses vraies données
 * - Si utilisateur NON connecté : Carousel des 4 cartes marketing (Bronze, Silver, Gold, Platinum)
 *
 * Animation : Garde l'animation de flottage existante pour toutes les cartes
 */

// ===== CONFIGURATION =====
const CAROUSEL_INTERVAL = 5000; // 5 secondes entre chaque carte marketing
const API_DASHPOINTS_URL = '/api/dashpoints/user';

// ===== ÉTAT =====
let carouselTimer = null;
let currentCardIndex = 0;
const marketingCards = ['bronze', 'silver', 'gold', 'platinum'];
let currentMode = null; // 'CONNECTED_USER' ou 'MARKETING_CAROUSEL'
let isInitialized = false; // Protection contre double initialisation

// ===== FONCTIONS UTILITAIRES =====

/**
 * Formater le nombre de points avec séparateur de milliers
 */
function formatPoints(points) {
    return points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Formater la date "Membre depuis" (ex: "Mai 2026")
 */
function formatMemberSince(dateString) {
    const date = new Date(dateString);
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Déterminer si le nombre de points est "long" (nécessite classe spéciale)
 */
function isLongNumber(points) {
    const formatted = formatPoints(points);
    return formatted.length >= 12; // Ex: "2 000 — 5 999" = 15 caractères
}

/**
 * Calculer le niveau depuis totalPointsEarned
 */
function calculateLevel(totalPointsEarned) {
    if (totalPointsEarned >= 15000) return 'Platinum';
    if (totalPointsEarned >= 6000) return 'Gold';
    if (totalPointsEarned >= 2000) return 'Silver';
    return 'Bronze';
}

// ===== CRÉATION DE LA CARTE DASHPOINTS =====

/**
 * Créer le HTML de la carte DashPoints premium
 * @param {Object} data - Données de la carte { points, level, memberSince, isUserCard }
 */
function createDashPointsCard(data) {
    const { points, level, memberSince, isUserCard } = data;
    const levelClass = level.toLowerCase();
    const pointsText = isUserCard ? formatPoints(points) : points;
    const longClass = isLongNumber(pointsText) ? 'long' : '';

    console.log('🎴 Génération HTML carte:');
    console.log('  - Points:', pointsText);
    console.log('  - Niveau:', level, `(classe: ${levelClass})`);
    console.log('  - Membre depuis:', memberSince);
    console.log('  - Type:', isUserCard ? 'UTILISATEUR' : 'MARKETING');

    return `
        <div class="dashpoints-premium-card ${levelClass}">
            <!-- Header : Logo -->
            <div class="card-header">
                <!-- Logo DashFood (image PNG) -->
                <div class="card-logo">
                    <img src="/assets/logos/logo.png" alt="DashFood">
                </div>
            </div>

            <!-- Icône feuille verte premium (SVG minimaliste) - Positionnée en absolu -->
            <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="#8BC34A"/>
                </svg>
            </div>

            <!-- Centre : Gros nombre de points -->
            <div class="points-display">
                <div class="points-number ${longClass}">${pointsText}</div>
                <div class="points-label">DashPoints accumulés</div>
            </div>

            <!-- Bas : Footer avec NIVEAU et MEMBRE DEPUIS -->
            <div class="card-footer">
                <!-- Ligne de séparation -->
                <div class="card-footer-divider"></div>

                <!-- Contenu : 2 colonnes -->
                <div class="card-footer-content">
                    <!-- Colonne gauche : NIVEAU -->
                    <div class="footer-col">
                        <div class="footer-label">NIVEAU</div>
                        <div class="footer-value">${level}</div>
                    </div>

                    <!-- Colonne droite : MEMBRE DEPUIS -->
                    <div class="footer-col">
                        <div class="footer-label">MEMBRE DEPUIS</div>
                        <div class="footer-value">${memberSince}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== AFFICHAGE CARTE UTILISATEUR CONNECTÉ =====

/**
 * Récupérer les données DashPoints de l'utilisateur connecté
 */
async function fetchUserDashPoints() {
    try {
        // IMPORTANT : Utiliser 'dashfood_token' (clé OFFICIELLE du système DashFood)
        const token = localStorage.getItem('dashfood_token');
        if (!token) {
            console.log('❌ Pas de dashfood_token trouvé dans localStorage');
            console.log('   Clés disponibles:', Object.keys(localStorage));
            return null;
        }

        console.log('🔑 dashfood_token trouvé, appel API DashPoints...');
        console.log('   Token (premiers chars):', token.substring(0, 20) + '...');

        const response = await fetch(API_DASHPOINTS_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.warn('⚠️ API DashPoints erreur HTTP:', response.status);
            return getUserFromLocalStorage();
        }

        const data = await response.json();
        console.log('✅ Données API DashPoints reçues:', data);

        // L'API retourne les données directement ou dans un wrapper
        // On gère les deux cas
        const userData = data.user || data;

        return {
            dashPoints: userData.dashPoints || 0,
            totalPointsEarned: userData.totalPointsEarned || 0,
            loyaltyLevel: userData.loyaltyLevel || calculateLevel(userData.totalPointsEarned || 0),
            createdAt: userData.createdAt || new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des DashPoints:', error);
        // Fallback sur localStorage si API indisponible
        return getUserFromLocalStorage();
    }
}

/**
 * Récupérer les données utilisateur depuis localStorage (fallback)
 */
function getUserFromLocalStorage() {
    try {
        console.log('📦 Fallback: lecture localStorage...');
        const userStr = localStorage.getItem('dashfood_user');

        if (!userStr) {
            console.log('❌ Pas de données dashfood_user dans localStorage');
            return null;
        }

        const user = JSON.parse(userStr);
        console.log('📦 User localStorage:', user);

        const result = {
            dashPoints: user.dashPoints || 0,
            totalPointsEarned: user.totalPointsEarned || 0,
            loyaltyLevel: calculateLevel(user.totalPointsEarned || 0),
            createdAt: user.createdAt || new Date().toISOString()
        };

        console.log('✅ Données extraites localStorage:', result);
        return result;

    } catch (error) {
        console.error('❌ Erreur lecture localStorage:', error);
        return null;
    }
}

/**
 * Afficher la carte de l'utilisateur connecté
 */
async function displayUserCard() {
    console.log('═══════════════════════════════════════');
    console.log('🎯 AFFICHAGE CARTE UTILISATEUR');
    console.log('═══════════════════════════════════════');

    // Définir le mode AVANT tout
    currentMode = 'CONNECTED_USER';
    console.log('📌 MODE DÉFINI:', currentMode);

    // STOPPER IMMÉDIATEMENT le carousel s'il tourne
    if (carouselTimer) {
        clearInterval(carouselTimer);
        carouselTimer = null;
        console.log('🛑 Carousel stoppé IMMÉDIATEMENT');
    }

    const userData = await fetchUserDashPoints();

    if (!userData) {
        // Si pas de données utilisateur, afficher carousel marketing
        console.log('⚠️ Pas de données utilisateur, basculement carousel marketing');
        currentMode = 'MARKETING_CAROUSEL';
        displayMarketingCarousel();
        return;
    }

    console.log('📊 Données utilisateur récupérées:');
    console.log('  - dashPoints:', userData.dashPoints);
    console.log('  - totalPointsEarned:', userData.totalPointsEarned);
    console.log('  - loyaltyLevel:', userData.loyaltyLevel);
    console.log('  - createdAt:', userData.createdAt);

    // Créer la carte utilisateur
    const cardData = {
        points: userData.dashPoints || 0,
        level: userData.loyaltyLevel || 'Bronze',
        memberSince: formatMemberSince(userData.createdAt),
        isUserCard: true
    };

    console.log('🎴 Création carte utilisateur:');
    console.log('  - Points à afficher:', cardData.points);
    console.log('  - Niveau:', cardData.level);
    console.log('  - Membre depuis:', cardData.memberSince);

    const cardHTML = createDashPointsCard(cardData);
    const container = document.getElementById('dashpointsCardContainer');

    if (!container) {
        console.error('❌ Container dashpointsCardContainer introuvable!');
        return;
    }

    // Vider le container complètement avant injection
    container.innerHTML = '';
    console.log('🧹 Container vidé');

    // Injecter la nouvelle carte
    container.innerHTML = cardHTML;
    console.log('✅ Carte utilisateur INJECTÉE dans le DOM');

    // Vérifier que la carte est bien dans le DOM
    const injectedCard = container.querySelector('.dashpoints-premium-card');
    if (injectedCard) {
        console.log('✅ Carte trouvée dans le DOM:', injectedCard.classList.toString());
        console.log('✅ Animation CSS de flottement appliquée automatiquement');
    } else {
        console.error('❌ Carte NON trouvée dans le DOM après injection!');
    }

    // Mettre à jour le bouton CTA
    updateCTAButton(true);
    console.log('✅ Bouton CTA: "Voir mes DashPoints" → /dashpoints.html');

    console.log('═══════════════════════════════════════');
    console.log('✅ MODE FINAL:', currentMode);
    console.log('═══════════════════════════════════════');
}

// ===== CAROUSEL CARTES MARKETING (NON CONNECTÉ) =====

/**
 * Données des cartes marketing
 */
const marketingCardData = {
    bronze: {
        points: '0 — 1 999',
        level: 'Bronze',
        memberSince: '2024',
        isUserCard: false
    },
    silver: {
        points: '2 000 — 5 999',
        level: 'Silver',
        memberSince: '2024',
        isUserCard: false
    },
    gold: {
        points: '6 000 — 14 999',
        level: 'Gold',
        memberSince: '2024',
        isUserCard: false
    },
    platinum: {
        points: '15 000+',
        level: 'Platinum',
        memberSince: '2024',
        isUserCard: false
    }
};

/**
 * Afficher une carte marketing spécifique
 */
function showMarketingCard(level) {
    // Protection : Ne JAMAIS afficher si mode CONNECTED_USER
    if (currentMode === 'CONNECTED_USER') {
        console.error('🚫 REFUS affichage carte marketing : Mode CONNECTED_USER!');
        return;
    }

    console.log('📇 Affichage carte marketing:', level.toUpperCase());

    const cardData = marketingCardData[level];
    if (!cardData) {
        console.error('❌ Données carte marketing introuvables pour:', level);
        return;
    }

    console.log('  - Range points:', cardData.points);
    console.log('  - Niveau:', cardData.level);

    const cardHTML = createDashPointsCard(cardData);
    const container = document.getElementById('dashpointsCardContainer');

    if (!container) {
        console.error('❌ Container introuvable pour carte marketing');
        return;
    }

    // Fade out
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';

    setTimeout(() => {
        container.innerHTML = cardHTML;

        // Fade in
        container.style.opacity = '1';

        console.log('✅ Carte marketing affichée avec animation CSS');
    }, 300);
}

/**
 * Démarrer le carousel des cartes marketing
 */
function displayMarketingCarousel() {
    console.log('═══════════════════════════════════════');
    console.log('🎠 AFFICHAGE CAROUSEL MARKETING');
    console.log('═══════════════════════════════════════');

    // PROTECTION : Ne JAMAIS démarrer en mode CONNECTED_USER
    if (currentMode === 'CONNECTED_USER') {
        console.error('🚫 REFUS CAROUSEL : Mode CONNECTED_USER actif!');
        console.log('═══════════════════════════════════════');
        return;
    }

    // Définir le mode
    currentMode = 'MARKETING_CAROUSEL';
    console.log('📌 MODE DÉFINI:', currentMode);

    // Afficher la première carte immédiatement
    currentCardIndex = 0;
    showMarketingCard(marketingCards[currentCardIndex]);

    // Rotation toutes les 5 secondes
    if (carouselTimer) {
        clearInterval(carouselTimer);
    }

    carouselTimer = setInterval(() => {
        // Double vérification avant chaque rotation
        if (currentMode === 'CONNECTED_USER') {
            console.error('🚫 ARRÊT CAROUSEL : Utilisateur connecté détecté!');
            clearInterval(carouselTimer);
            carouselTimer = null;
            return;
        }

        currentCardIndex = (currentCardIndex + 1) % marketingCards.length;
        console.log(`🔄 Rotation carousel: ${marketingCards[currentCardIndex]}`);
        showMarketingCard(marketingCards[currentCardIndex]);
    }, CAROUSEL_INTERVAL);

    console.log('✅ Carousel démarré (rotation toutes les 5s)');

    // Mettre à jour le bouton CTA
    updateCTAButton(false);
    console.log('✅ Bouton CTA: "Rejoindre le programme" → /login');

    console.log('═══════════════════════════════════════');
}

// ===== ANIMATION DE FLOTTAGE =====
// L'animation de flottement est désormais gérée par CSS (@keyframes dashCardFloat)
// Voir style.css lignes 2644-2666

// ===== BOUTON CTA =====

/**
 * Mettre à jour le bouton CTA selon l'état de connexion
 */
function updateCTAButton(isConnected) {
    const ctaButton = document.getElementById('loyaltyCTA');
    const ctaText = document.getElementById('loyaltyCTAText');

    if (!ctaButton || !ctaText) return;

    if (isConnected) {
        // Utilisateur connecté : "Voir mes DashPoints"
        ctaText.textContent = 'Voir mes DashPoints';
        ctaButton.onclick = () => {
            window.location.href = '/dashpoints.html';
        };
    } else {
        // Utilisateur non connecté : "Rejoindre le programme"
        ctaText.textContent = 'Rejoindre le programme';
        ctaButton.onclick = () => {
            window.location.href = '/login';
        };
    }
}

// ===== DÉTECTION ÉTAT CONNEXION =====

/**
 * Vérifier si l'utilisateur est connecté
 * IMPORTANT : Utilise 'dashfood_token' et 'dashfood_user' (clés OFFICIELLES)
 */
function isUserConnected() {
    // IMPORTANT : Utiliser 'dashfood_token' et 'dashfood_user' (clés OFFICIELLES)
    const token = localStorage.getItem('dashfood_token');
    const user = localStorage.getItem('dashfood_user');

    console.log('🔍 Vérification connexion (système DashFood):');
    console.log('  - dashfood_token présent:', !!token);
    console.log('  - dashfood_user présent:', !!user);

    if (token) {
        console.log('  - Token (premiers chars):', token.substring(0, 20) + '...');
    }

    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('  - Email:', userData.email || 'N/A');
            console.log('  - Nom:', userData.nom || userData.prenom || 'N/A');
            console.log('  - Role:', userData.role || 'N/A');
            console.log('  - DashPoints:', userData.dashPoints || 0);
        } catch (e) {
            console.log('  - User data: erreur parsing', e);
        }
    }

    const isConnected = !!(token && user);
    console.log('  → Résultat:', isConnected ? '✅ CONNECTÉ' : '❌ NON CONNECTÉ');

    return isConnected;
}

// ===== INITIALISATION =====

/**
 * Initialiser la section DashPoints dynamique
 */
async function initLoyaltySection() {
    // Protection contre double initialisation
    if (isInitialized) {
        console.warn('⚠️ Section DashPoints déjà initialisée, skip');
        return;
    }
    isInitialized = true;

    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║  SECTION DASHPOINTS - INITIALISATION  ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');

    // Vérifier présence du container
    const container = document.getElementById('dashpointsCardContainer');
    if (!container) {
        console.error('❌ ERREUR: Container "dashpointsCardContainer" introuvable!');
        console.log('   Vérifiez que l\'élément existe dans index.html');
        return;
    }
    console.log('✅ Container trouvé:', container);

    // Vérifier connexion utilisateur
    const connected = isUserConnected();

    console.log('');
    console.log('─────────────────────────────────────────');
    console.log('DÉCISION:');

    if (connected) {
        console.log('✅ Utilisateur CONNECTÉ détecté');
        console.log('→ Mode: CONNECTED_USER');
        console.log('→ Action: Afficher carte personnelle');
        console.log('─────────────────────────────────────────');
        console.log('');
        await displayUserCard();
    } else {
        console.log('❌ Utilisateur NON CONNECTÉ');
        console.log('→ Mode: MARKETING_CAROUSEL');
        console.log('→ Action: Afficher carousel 4 cartes');
        console.log('─────────────────────────────────────────');
        console.log('');
        displayMarketingCarousel();
    }

    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║       INITIALISATION TERMINÉE         ║');
    console.log('║  Mode actif:', currentMode?.padEnd(23), '║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
}

// Démarrer au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoyaltySection);
} else {
    // DOM déjà chargé, démarrer immédiatement
    initLoyaltySection();
}
