// Model MongoDB pour les messages de contact
// Enregistre les demandes des utilisateurs via le formulaire contact

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    // nom complet de l'utilisateur
    fullName: {
        type: String,
        required: [true, 'Le nom complet est requis'],
        trim: true
    },

    // adresse email
    email: {
        type: String,
        required: [true, 'L\'adresse e-mail est requise'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Veuillez entrer une adresse e-mail valide']
    },

    // sujet du message
    subject: {
        type: String,
        required: [true, 'Le sujet est requis'],
        trim: true
    },

    // contenu du message
    message: {
        type: String,
        required: [true, 'Le message est requis'],
        trim: true
    },

    // statut du message (nouveau, lu, traité, résolu)
    status: {
        type: String,
        enum: ['new', 'read', 'processed', 'resolved'],
        default: 'new'
    },

    // date de creation
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// index pour rechercher rapidement par email ou statut
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
