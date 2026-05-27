/**
 * ====================================
 * DASHPOINTS - PROGRAMME DE FIDÉLITÉ
 * Animations premium, compteurs dynamiques, gestion des récompenses
 * ====================================
 */

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashPointsData();
});

/**
 * Vérifie si l'utilisateur est connecté
 * Redirige vers login si non connecté
 */
function checkAuth() {
    const token = localStorage.getItem('dashfood_token');
    const userStr = localStorage.getItem('dashfood_user');

    if (!token || !userStr) {
        window.location.href = '/login';
        return;
    }

    try {
        const user = JSON.parse(userStr);

        // Seuls les clients peuvent accéder à cette page
        if (user.role !== 'client') {
            alert('Cette page est réservée aux clients DashFood');
            window.location.href = '/';
            return;
        }
    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        window.location.href = '/login';
    }
}

/**
 * Charge les données DashPoints depuis le backend
 */
async function loadDashPointsData() {
    try {
        const token = localStorage.getItem('dashfood_token');

        const response = await fetch('/api/dashpoints/user', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Mettre à jour l'interface avec les données
            updateUI(data.data);

            // Animer le compteur de points
            animateCounter(data.data.dashPoints);

            // Afficher l'historique
            displayHistory(data.data.pointsHistory);

            // Mettre à jour les boutons de récompense
            updateRewardButtons(data.data.dashPoints);

        } else {
            console.error('Erreur:', data.message);
            // Afficher des données par défaut en cas d'erreur
            showDefaultData();
        }

    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        showDefaultData();
    }
}

/**
 * Met à jour l'interface avec les données utilisateur
 */
function updateUI(data) {
    // ===== APPLIQUER LA CLASSE DYNAMIQUE À LA CARTE PRINCIPALE =====
    // IMPORTANT : La carte principale change de couleur selon le niveau
    applyCardLevelStyle(data.loyaltyLevel || 'Bronze');

    // ===== NIVEAU DE FIDÉLITÉ (Footer) =====
    const footerLevel = document.getElementById('footerLevel');
    if (footerLevel) {
        footerLevel.textContent = data.loyaltyLevel || 'Bronze';
    }

    // ===== MEMBRE DEPUIS (Footer) =====
    const memberSince = document.getElementById('memberSince');
    if (memberSince && data.createdAt) {
        memberSince.textContent = formatMemberSince(data.createdAt);
    }

    // ===== STATISTIQUES =====
    const totalEarned = document.getElementById('totalEarned');
    if (totalEarned) {
        animateCounter(data.totalPointsEarned || 0, totalEarned);
    }

    const totalOrders = document.getElementById('totalOrders');
    if (totalOrders) {
        totalOrders.textContent = data.totalOrders || 0;
    }

    const totalSpent = document.getElementById('totalSpent');
    if (totalSpent) {
        totalSpent.textContent = `${(data.totalSpent || 0).toLocaleString()} MAD`;
    }

    // ===== MARQUER LE NIVEAU ACTUEL =====
    markActiveLevel(data.loyaltyLevel || 'Bronze');
}

/**
 * Formate la date d'inscription pour afficher "Mois Année" (ex: "Mai 2026")
 */
function formatMemberSince(dateString) {
    const date = new Date(dateString);

    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${month} ${year}`;
}

/**
 * Anime le compteur de points (compteur qui monte)
 */
function animateCounter(targetValue, element = document.getElementById('pointsNumber')) {
    if (!element) return;

    const duration = 2000; // 2 secondes
    const start = 0;
    const increment = targetValue / (duration / 16); // 60fps
    let current = 0;

    const timer = setInterval(() => {
        current += increment;

        if (current >= targetValue) {
            current = targetValue;
            clearInterval(timer);
        }

        // Formater le nombre avec espaces et ajouter "+" si > 1000
        const formattedNumber = Math.floor(current).toLocaleString('fr-FR');
        const displayText = targetValue >= 1000 ? `${formattedNumber}+` : formattedNumber;

        element.textContent = displayText;
    }, 16);
}

/**
 * Affiche l'historique des points
 */
function displayHistory(history) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    // Si pas d'historique, afficher message vide
    if (!history || history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <p>Aucune transaction pour le moment</p>
            </div>
        `;
        return;
    }

    // Construire le HTML de l'historique
    let html = '';

    // Limiter à 10 dernières transactions
    const recentHistory = history.slice(0, 10);

    recentHistory.forEach(item => {
        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const isEarned = item.type === 'earned';
        const pointsClass = isEarned ? 'earned' : 'redeemed';
        const pointsSign = isEarned ? '+' : '-';
        const pointsAmount = Math.abs(item.amount);

        html += `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">${item.description}</div>
                    <div class="history-date">${dateStr}</div>
                </div>
                <div class="history-points ${pointsClass}">
                    ${pointsSign}${pointsAmount}
                </div>
            </div>
        `;
    });

    historyList.innerHTML = html;
}

/**
 * Met à jour les boutons de récompense selon les points disponibles
 */
function updateRewardButtons(availablePoints) {
    const rewardCards = document.querySelectorAll('.reward-card');

    rewardCards.forEach(card => {
        const cost = parseInt(card.getAttribute('data-cost'));
        const button = card.querySelector('.reward-btn');

        if (availablePoints < cost) {
            // Pas assez de points
            button.disabled = true;
            button.textContent = 'Insuffisant';
            card.classList.add('locked');
        } else {
            // Assez de points
            button.disabled = false;
            button.textContent = 'Échanger';
            card.classList.remove('locked');
        }
    });
}

/**
 * Applique le style de niveau à la carte principale DashPoints
 * IMPORTANT : Change la couleur de la carte selon le niveau du client
 *
 * @param {String} level - Niveau actuel (Bronze, Silver, Gold, Platinum)
 */
function applyCardLevelStyle(level) {
    const mainCard = document.querySelector('.dashpoints-premium-card');

    if (!mainCard) {
        console.warn('Carte principale DashPoints introuvable');
        return;
    }

    // ===== RETIRER TOUTES LES CLASSES DE NIVEAU =====
    mainCard.classList.remove('bronze', 'silver', 'gold', 'platinum');

    // ===== AJOUTER LA CLASSE CORRESPONDANT AU NIVEAU ACTUEL =====
    const levelClass = level.toLowerCase();
    mainCard.classList.add(levelClass);

    console.log(`✅ Carte principale mise à jour : niveau ${level}`);

    // NOTE : Les couleurs de texte (blanc pour Bronze/Platinum, noir pour Silver/Gold)
    // sont automatiquement gérées par le CSS via les classes .silver et .gold
}

/**
 * Marque visuellement le niveau actuel dans la section niveaux
 */
function markActiveLevel(level) {
    // Retirer la classe active de tous les niveaux
    document.querySelectorAll('.level-card').forEach(card => {
        card.classList.remove('active');
    });

    // Ajouter la classe active au niveau actuel
    const levelId = `level${level}`;
    const levelCard = document.getElementById(levelId);

    if (levelCard) {
        levelCard.classList.add('active');
    }
}

/**
 * Échange des points contre une récompense
 */
async function redeemReward(cost, description) {
    // Confirmation
    const confirm = window.confirm(
        `Êtes-vous sûr de vouloir échanger ${cost} DashPoints contre :\n\n"${description}"`
    );

    if (!confirm) return;

    try {
        const token = localStorage.getItem('dashfood_token');

        const response = await fetch('/api/dashpoints/redeem', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pointsCost: cost,
                rewardDescription: description
            })
        });

        const data = await response.json();

        if (data.success) {
            // Succès : afficher message et recharger les données
            alert(`✅ Récompense échangée avec succès !\n\nVous avez reçu : ${description}`);

            // Recharger les données pour mettre à jour l'interface
            loadDashPointsData();

        } else {
            alert(`❌ Erreur : ${data.message}`);
        }

    } catch (error) {
        console.error('Erreur lors de l\'échange:', error);
        alert('❌ Une erreur est survenue lors de l\'échange');
    }
}

/**
 * Affiche des données par défaut en cas d'erreur de chargement
 */
function showDefaultData() {
    // Afficher 0 points par défaut
    const pointsNumber = document.getElementById('pointsNumber');
    if (pointsNumber) {
        pointsNumber.textContent = '0';
    }

    // Désactiver tous les boutons de récompense
    document.querySelectorAll('.reward-btn').forEach(btn => {
        btn.disabled = true;
        btn.textContent = 'Insuffisant';
    });

    document.querySelectorAll('.reward-card').forEach(card => {
        card.classList.add('locked');
    });
}

// Exposer la fonction redeemReward globalement pour les onclick
window.redeemReward = redeemReward;
