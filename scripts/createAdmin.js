/**
 * Script pour créer un compte administrateur
 * Usage: node scripts/createAdmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createAdminAccount = async () => {
    try {
        // Connexion à MongoDB
        console.log('🔌 Connexion à MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connecté à MongoDB\n');

        // Données du compte admin
        const adminData = {
            fullName: 'Administrateur DashFood',
            firstName: 'Admin',
            lastName: 'DashFood',
            email: 'admin@dashfood.ma',
            phone: '+212600000000',
            address: 'Siège DashFood, Casablanca',
            city: 'Casablanca',
            password: 'Admin@2024',
            role: 'admin'
        };

        // Vérifier si un admin existe déjà avec cet email
        const existingAdmin = await User.findOne({ email: adminData.email });

        if (existingAdmin) {
            console.log('⚠️  Un compte avec cet email existe déjà');
            console.log('📧 Email:', existingAdmin.email);
            console.log('👤 Nom:', existingAdmin.fullName);
            console.log('🎭 Rôle:', existingAdmin.role);
            console.log('\n🔄 Mise à jour du rôle vers "admin"...');

            // Mettre à jour le rôle
            existingAdmin.role = 'admin';
            await existingAdmin.save();

            console.log('✅ Rôle mis à jour avec succès!\n');
            console.log('='.repeat(50));
            console.log('📋 INFORMATIONS DE CONNEXION');
            console.log('='.repeat(50));
            console.log('🌐 URL: http://localhost:3000/admin-login.html');
            console.log('📧 Email:', adminData.email);
            console.log('🔒 Mot de passe: [votre mot de passe actuel]');
            console.log('='.repeat(50));
        } else {
            console.log('🔨 Création du compte administrateur...\n');

            // Hash du mot de passe
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminData.password, salt);

            // Créer le nouvel admin
            const admin = new User({
                fullName: adminData.fullName,
                firstName: adminData.firstName,
                lastName: adminData.lastName,
                email: adminData.email.toLowerCase(),
                phone: adminData.phone,
                address: adminData.address,
                city: adminData.city,
                password: hashedPassword,
                role: 'admin',
                preferences: {
                    notifications: true,
                    promotions: true,
                    newsletter: true,
                    analytics: true
                }
            });

            await admin.save();

            console.log('✅ Compte administrateur créé avec succès!\n');
            console.log('='.repeat(50));
            console.log('📋 INFORMATIONS DE CONNEXION');
            console.log('='.repeat(50));
            console.log('🌐 URL: http://localhost:3000/admin-login.html');
            console.log('📧 Email:', adminData.email);
            console.log('🔒 Mot de passe:', adminData.password);
            console.log('🎭 Rôle:', admin.role);
            console.log('='.repeat(50));
            console.log('\n⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!\n');
        }

        // Vérification finale
        const savedAdmin = await User.findOne({ email: adminData.email });
        console.log('\n✅ Vérification finale:');
        console.log('   - ID:', savedAdmin._id);
        console.log('   - Email:', savedAdmin.email);
        console.log('   - Rôle:', savedAdmin.role);
        console.log('   - Type du rôle:', typeof savedAdmin.role);

    } catch (error) {
        console.error('❌ Erreur lors de la création du compte admin:', error);
    } finally {
        // Fermer la connexion
        await mongoose.connection.close();
        console.log('\n🔌 Connexion MongoDB fermée');
        process.exit(0);
    }
};

// Exécuter le script
createAdminAccount();
