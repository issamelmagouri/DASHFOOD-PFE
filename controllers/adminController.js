/**
 * Admin Controller - DashFood
 * Gestion de l'authentification et des operations admin
 */

const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Generer un token JWT
const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Veuillez fournir un email et un mot de passe'
            });
        }

        // Verifier si l'admin existe (avec le password)
        const admin = await Admin.findOne({ email }).select('+password');

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Verifier si le compte est actif
        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Votre compte a été désactivé. Contactez le support.'
            });
        }

        // Verifier le mot de passe
        const isPasswordValid = await admin.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Mettre a jour la derniere connexion
        await admin.updateLastLogin();

        // Generer le token
        const token = generateToken(admin._id, admin.role);

        // Reponse avec les donnees admin (sans le password)
        const adminData = admin.toJSON();

        res.status(200).json({
            success: true,
            message: 'Connexion réussie',
            token,
            admin: adminData
        });

    } catch (error) {
        console.error('Erreur login admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la connexion'
        });
    }
};


exports.createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont requis'
            });
        }

        // Verifier si l'email existe deja
        const existingAdmin = await Admin.findOne({ email });

        if (existingAdmin) {
            return res.status(409).json({
                success: false,
                message: 'Un administrateur avec cet email existe déjà'
            });
        }

        // Creer le nouvel admin
        const admin = await Admin.create({
            name,
            email,
            password,
            role: 'admin'
        });

        res.status(201).json({
            success: true,
            message: 'Administrateur créé avec succès',
            admin: admin.toJSON()
        });

    } catch (error) {
        console.error('Erreur creation admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création de l\'administrateur'
        });
    }
};


exports.getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Administrateur non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            admin: admin.toJSON()
        });

    } catch (error) {
        console.error('Erreur get profile admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};


exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;

        const admin = await Admin.findById(req.user.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Administrateur non trouvé'
            });
        }

        // Mettre a jour les champs
        if (name) admin.name = name;
        if (email) admin.email = email;

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Profil mis à jour avec succès',
            admin: admin.toJSON()
        });

    } catch (error) {
        console.error('Erreur update profile admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};


exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont requis'
            });
        }

        const admin = await Admin.findById(req.user.id).select('+password');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Administrateur non trouvé'
            });
        }

        // Verifier l'ancien mot de passe
        const isPasswordValid = await admin.comparePassword(currentPassword);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }

        // Mettre a jour le mot de passe
        admin.password = newPassword;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Mot de passe modifié avec succès'
        });

    } catch (error) {
        console.error('Erreur change password admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};


exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: admins.length,
            admins
        });

    } catch (error) {
        console.error('Erreur get all admins:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
