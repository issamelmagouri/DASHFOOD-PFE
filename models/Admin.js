/**
 * Admin Model - DashFood
 * Schema pour les administrateurs de la plateforme
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Le nom est requis'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'L\'email est requis'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    password: {
        type: String,
        required: [true, 'Le mot de passe est requis'],
        minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
        select: false
    },
    role: {
        type: String,
        enum: ['admin'],
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password avant sauvegarde
adminSchema.pre('save', async function(next) {
    // Ne hasher que si le mot de passe est modifié
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Methode pour comparer les mots de passe
adminSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Methode pour mettre a jour la derniere connexion
adminSchema.methods.updateLastLogin = async function() {
    this.lastLogin = Date.now();
    await this.save({ validateBeforeSave: false });
};

// Ne pas renvoyer le mot de passe dans les reponses JSON
adminSchema.methods.toJSON = function() {
    const admin = this.toObject();
    delete admin.password;
    return admin;
};

module.exports = mongoose.model('Admin', adminSchema);
