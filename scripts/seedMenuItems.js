require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

const seedItems = [
  ['Bruschetta tomate basilic', 'Pain grillé, tomates fraîches, basilic et huile d’olive.', 38, 'entrees', '/assets/images/platanimation1.png'],
  ['Salade fraîcheur', 'Jeunes pousses, avocat, concombre et vinaigrette citronnée.', 42, 'entrees', '/assets/images/platanimation2.png'],
  ['Croquettes de fromage', 'Croquettes dorées au cœur fondant, sauce maison.', 45, 'entrees', '/assets/images/platannimation3.png'],
  ['Poulet aux herbes', 'Suprême de poulet, légumes rôtis et jus aux herbes.', 92, 'plats-principaux', '/assets/images/chefprepare .png'],
  ['Pavé de saumon', 'Saumon grillé, purée légère et légumes de saison.', 118, 'plats-principaux', '/assets/images/platanimation1.png'],
  ['Tagliatelles crémeuses', 'Pâtes fraîches, champignons et parmesan affiné.', 85, 'plats-principaux', '/assets/images/platanimation2.png'],
  ['Classic Dash Burger', 'Bœuf grillé, cheddar, salade et sauce DashFood.', 72, 'burgers', '/assets/images/platannimation3.png'],
  ['Smoky Burger', 'Bœuf, fromage fumé, oignons confits et sauce barbecue.', 82, 'burgers', '/assets/images/platanimation1.png'],
  ['Green Burger', 'Galette végétale, avocat, crudités et sauce citronnée.', 68, 'burgers', '/assets/images/platanimation2.png'],
  ['Pizza Margherita', 'Tomate, mozzarella, basilic frais et huile d’olive.', 65, 'pizzas', '/assets/images/platanimation1.png'],
  ['Pizza Burrata', 'Tomate, burrata crémeuse, roquette et pesto.', 88, 'pizzas', '/assets/images/platannimation3.png'],
  ['Pizza Méditerranéenne', 'Poivrons, olives, mozzarella et herbes fraîches.', 76, 'pizzas', '/assets/images/platanimation2.png'],
  ['Tiramisu maison', 'Mascarpone, café et cacao, préparé chaque matin.', 42, 'desserts', '/assets/images/platannimation3.png'],
  ['Fondant chocolat', 'Cœur chocolat coulant et crème légère à la vanille.', 46, 'desserts', '/assets/images/platanimation1.png'],
  ['Cheesecake fruits rouges', 'Crème onctueuse et compotée de fruits rouges.', 48, 'desserts', '/assets/images/platanimation2.png'],
  ['Citronnade maison', 'Citron frais, menthe et sirop léger.', 24, 'boissons', '/assets/images/platanimation2.png'],
  ['Jus orange pressé', 'Oranges fraîches pressées à la commande.', 28, 'boissons', '/assets/images/platanimation1.png'],
  ['Thé glacé pêche', 'Infusion de thé, pêche et citron.', 25, 'boissons', '/assets/images/platannimation3.png']
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  let restaurants = await Restaurant.find({ isActive: true }).select('_id name');
  if (!restaurants.length) {
    restaurants = [await Restaurant.create({
      name: 'La Table DashFood',
      cuisineType: 'Cuisine internationale',
      category: 'Français',
      city: 'Casablanca',
      address: 'Centre-ville, Casablanca',
      description: 'Restaurant de démonstration du catalogue DashFood.',
      image: '/assets/images/restaurant-kitchen.png',
      isActive: true
    })];
  }

  let insertedCount = 0;
  for (const restaurant of restaurants) {
    for (const category of MenuItem.MENU_CATEGORIES) {
      const existingItems = await MenuItem.find({ restaurant: restaurant._id, category }).select('name');
      const missingCount = Math.max(0, 2 - existingItems.length);
      if (!missingCount) continue;
      const existingNames = new Set(existingItems.map((item) => item.name));
      const candidates = seedItems.filter((item) => item[3] === category && !existingNames.has(item[0])).slice(0, missingCount);
      if (candidates.length) {
        await MenuItem.insertMany(candidates.map(([name, description, price, itemCategory, image], index) => ({
          name,
          description,
          price,
          category: itemCategory,
          image,
          restaurant: restaurant._id,
          available: true,
          badge: index === 0 ? 'nouveau' : 'populaire'
        })));
        insertedCount += candidates.length;
      }
    }

    const hasPromotion = await MenuItem.exists({ restaurant: restaurant._id, badge: 'promo', available: true });
    if (!hasPromotion) {
      await MenuItem.updateOne({ restaurant: restaurant._id, available: true }, { $set: { badge: 'promo' } });
    }
  }
  console.log(`${insertedCount} plats ajoutés. Chaque restaurant possède au moins 2 plats par catégorie.`);
}

seed()
  .catch((error) => {
    console.error('Erreur seed catalogue:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
