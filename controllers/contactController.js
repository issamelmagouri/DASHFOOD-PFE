// Controller pour les messages de contact
// Gere la creation et la sauvegarde des messages clients

const Contact = require('../models/Contact');

// POST /api/contact - Creer un nouveau message de contact
exports.createContactMessage = async (req, res) => {
    try {
        // recupere les donnees du formulaire
        const { fullName, email, subject, message } = req.body;

        // validation: verifie que tous les champs sont remplis
        if (!fullName || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont obligatoires'
            });
        }

        // validation rapide de l'email
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Adresse e-mail invalide'
            });
        }

        // cree le nouveau message dans MongoDB
        const contactMessage = await Contact.create({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            subject: subject.trim(),
            message: message.trim()
        });

        // log pour debug
        console.log('Nouveau message de contact reçu:', {
            id: contactMessage._id,
            email: contactMessage.email,
            subject: contactMessage.subject
        });

        // retourne le succes
        res.status(201).json({
            success: true,
            message: 'Message envoyé avec succès ! Nous vous répondrons sous 24 heures.',
            data: {
                id: contactMessage._id,
                fullName: contactMessage.fullName,
                email: contactMessage.email,
                subject: contactMessage.subject,
                createdAt: contactMessage.createdAt
            }
        });

    } catch (error) {
        console.error('Erreur création message contact:', error);

        // gestion des erreurs de validation Mongoose
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        // erreur serveur generique
        res.status(500).json({
            success: false,
            message: 'Une erreur est survenue. Veuillez réessayer.'
        });
    }
};

// GET /api/contact - Recuperer tous les messages (pour admin futur)
exports.getAllContactMessages = async (req, res) => {
    try {
        // recupere tous les messages triés du plus recent au plus ancien
        const messages = await Contact.find()
            .sort({ createdAt: -1 })
            .select('-__v');

        res.json({
            success: true,
            count: messages.length,
            data: messages
        });

    } catch (error) {
        console.error('Erreur récupération messages:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// GET /api/contact/:id - Recuperer un message specifique
exports.getContactMessageById = async (req, res) => {
    try {
        const message = await Contact.findById(req.params.id);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message non trouvé'
            });
        }

        res.json({
            success: true,
            data: message
        });

    } catch (error) {
        console.error('Erreur récupération message:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// PUT /api/contact/:id/status - Mettre a jour le statut (pour admin)
exports.updateContactStatus = async (req, res) => {
    try {
        const { status } = req.body;

        // verifie que le statut est valide
        const validStatuses = ['new', 'read', 'processed', 'resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Statut invalide'
            });
        }

        const message = await Contact.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Statut mis à jour',
            data: message
        });

    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
