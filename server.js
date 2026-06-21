// Point d entrée du serveur Express
// Configuration du serveur middlewares etroutes et Socket.io

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const dashpointsRoutes = require('./routes/dashpointsRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const restaurantPartnerRoutes = require('./routes/restaurantPartnerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Configuration
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/delivery', deliveryRoutes); // Routes pour les demandes de livreur
app.use('/api/dashpoints', dashpointsRoutes); // Routes pour le programme de fidélité
app.use('/api/users', userRoutes); // Routes pour le profil utilisateur
app.use('/api/contact', contactRoutes); // Routes pour les messages de contact
app.use('/api/restaurant-partner', restaurantPartnerRoutes); // Routes pour les candidatures restaurant
app.use('/api/orders', orderRoutes); // Routes pour les commandes
app.use('/api/restaurants', restaurantRoutes); // Routes pour les restaurants partenaires

// Routes pour servir les pages HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/devenir-livreur', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'devenir-livreur.html'));
});

app.get('/devenir-livreur.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'devenir-livreur.html'));
});

app.get('/devenir-restaurant', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'devenir-restaurant.html'));
});

app.get('/devenir-restaurant.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'devenir-restaurant.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Routes livreur
app.get('/livreur-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'livreur-dashboard.html'));
});

app.get('/livreur-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'livreur-dashboard.html'));
});

app.get('/livreur-livraisons', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'livreur-livraisons.html'));
});

app.get('/livreur-livraisons.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'livreur-livraisons.html'));
});








// Route DashPoints (le Programme de fidelite)
app.get('/dashpoints', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashpoints.html'));
});

app.get('/dashpoints.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashpoints.html'));
});

// Route profil utilisateur
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// Route contact
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

// Route mes commandes
app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'orders.html'));
});

app.get('/orders.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'orders.html'));
});

// Route restaurants
app.get('/restaurants', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'restaurants.html'));
});

app.get('/restaurants.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'restaurants.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur DashFood démarré sur http://localhost:${PORT}`);
});
