import db from './api/db.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    console.log('🌱 Starting Comprehensive Demo Seeding...');

    // 0. Clean up existing data
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('TRUNCATE TABLE system_logs');
    await db.query('TRUNCATE TABLE orders');
    await db.query('TRUNCATE TABLE marketplace_items');
    await db.query('TRUNCATE TABLE planting_requests');
    await db.query('TRUNCATE TABLE growth_stages');
    await db.query('TRUNCATE TABLE users');
    await db.query('TRUNCATE TABLE crops');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🧹 Cleaned existing data (except user_types).');

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Get Role IDs
    const [roles] = await db.query('SELECT * FROM user_types');
    const roleMap = {};
    roles.forEach(r => roleMap[r.role_name] = r.id);

    // 2. Seed Admin User
    await db.query(
        'INSERT INTO users (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
        [roleMap.Admin, 'System Admin', 'admin@agritrace.com', '254700000000', passwordHash]
    );
    console.log('👤 Admin user seeded.');

    // 3. User-Provided Crops (Same as before)
    const crops = [
      {
        name: 'Sukuma Wiki (Collard Greens)',
        yield: 25000,
        maturity: 270,
        price: 30,
        image: 'https://images.pexels.com/photos/2893635/pexels-photo-2893635.jpeg',
        description: 'Scientific Name: Brassica oleracea. The most widely cultivated vegetable in Kenya.',
        stages: [{ name: 'Nursery', offset: 30 }, { name: 'Transplanting', offset: 31 }, { name: 'Vegetative Growth', offset: 60 }, { name: 'Harvesting', offset: 270 }]
      },
      {
        name: 'Spinach',
        yield: 12000,
        maturity: 60,
        price: 40,
        image: 'https://images.pexels.com/photos/2325843/pexels-photo-2325843.jpeg',
        description: 'Scientific Name: Spinacia oleracea. Preferred in urban markets.',
        stages: [{ name: 'Germination', offset: 10 }, { name: 'Seedling/Establishment', offset: 40 }, { name: 'Maturity/First Harvest', offset: 60 }]
      },
      {
        name: 'Managu (African Nightshade)',
        yield: 5000,
        maturity: 90,
        price: 80,
        image: 'https://images.pexels.com/photos/144248/potatoes-vegetables-market-fresh-144248.jpeg',
        description: 'Scientific Name: Solanum scabrum / nigrum. Premium ALV with high iron content.',
        stages: [{ name: 'Nursery', offset: 30 }, { name: 'Transplanting/Establishment', offset: 60 }, { name: 'Maturity', offset: 90 }]
      },
      {
        name: 'Terere (Amaranth)',
        yield: 10000,
        maturity: 60,
        price: 50,
        image: 'https://images.pexels.com/photos/594567/pexels-photo-594567.jpeg',
        description: 'Scientific Name: Amaranthus spp. Drought-tolerant and fast-maturing.',
        stages: [{ name: 'Sowing/Emergence', offset: 7 }, { name: 'Thinning', offset: 21 }, { name: 'Vegetative Stage', offset: 45 }, { name: 'Harvesting', offset: 60 }]
      },
      {
        name: 'Sagaa / Saget (Spider Plant)',
        yield: 4000,
        maturity: 90,
        price: 70,
        image: 'https://images.pexels.com/photos/1131284/pexels-photo-1131284.jpeg',
        description: 'Scientific Name: Cleome gynandra. Staple ALV valued for medicinal properties.',
        stages: [{ name: 'Germination', offset: 14 }, { name: 'Vegetative Stage', offset: 45 }, { name: 'Flowering', offset: 55 }, { name: 'Harvesting', offset: 90 }]
      },
      {
        name: 'Tomatoes',
        yield: 30000,
        maturity: 120,
        price: 60,
        image: 'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg',
        description: 'Scientific Name: Solanum lycopersicum. High-value fruit vegetable.',
        stages: [{ name: 'Nursery', offset: 25 }, { name: 'Transplanting & Staking', offset: 45 }, { name: 'Flowering & Fruit Set', offset: 75 }, { name: 'Ripening & Harvest', offset: 120 }]
      }
    ];

    const cropIds = {};
    for (const crop of crops) {
      const [result] = await db.query(
        'INSERT INTO crops (crop_name, baseline_yield_per_acre, total_maturity_days, price_per_kg, image_url, description) VALUES (?, ?, ?, ?, ?, ?)',
        [crop.name, crop.yield, crop.maturity, crop.price, crop.image, crop.description]
      );
      const cropId = result.insertId;
      cropIds[crop.name] = cropId;
      for (const stage of crop.stages) {
        await db.query('INSERT INTO growth_stages (crop_id, stage_name, day_offset) VALUES (?, ?, ?)', [cropId, stage.name, stage.offset]);
      }
    }
    console.log('✅ Crops and Growth Stages seeded.');

    // 4. Seed 10 Farmers
    const farmerData = [
      { name: 'Peter Kamau', email: 'peter@farm.com', phone: '254710111222', region: 'Nakuru' },
      { name: 'Mary Njoki', email: 'mary@farm.com', phone: '254710222333', region: 'Kiambu' },
      { name: 'John Otieno', email: 'john@farm.com', phone: '254710333444', region: 'Kisumu' },
      { name: 'Faith Chebet', email: 'faith@farm.com', phone: '254710444555', region: 'Kericho' },
      { name: 'Samuel Musyoka', email: 'samuel@farm.com', phone: '254710555666', region: 'Machakos' },
      { name: 'Grace Wambui', email: 'grace@farm.com', phone: '254710666777', region: 'Nyeri' },
      { name: 'David Mwaura', email: 'david@farm.com', phone: '254710777888', region: 'Murang\'a' },
      { name: 'Esther Atieno', email: 'esther@farm.com', phone: '254710888999', region: 'Siaya' },
      { name: 'Isaac Kiprop', email: 'isaac@farm.com', phone: '254710999000', region: 'Uasin Gishu' },
      { name: 'Lydia Akinyi', email: 'lydia@farm.com', phone: '254710000111', region: 'Homa Bay' }
    ];

    const farmerIds = [];
    for (const f of farmerData) {
      const [result] = await db.query(
        'INSERT INTO users (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
        [roleMap.Farmer, f.name, f.email, f.phone, passwordHash]
      );
      farmerIds.push({ id: result.insertId, region: f.region });
    }
    console.log('👨‍🌾 10 Farmers seeded.');

    // 5. Seed Planting Requests (Diverse statuses)
    const plantings = [
      { farmerIdx: 0, crop: 'Sukuma Wiki (Collard Greens)', acres: 2, daysAgo: 100, status: 'Harvested' },
      { farmerIdx: 1, crop: 'Spinach', acres: 1, daysAgo: 45, status: 'Growing' },
      { farmerIdx: 2, crop: 'Managu (African Nightshade)', acres: 0.5, daysAgo: 20, status: 'Planted' },
      { farmerIdx: 3, crop: 'Terere (Amaranth)', acres: 3, daysAgo: 60, status: 'Harvested' },
      { farmerIdx: 4, crop: 'Sagaa / Saget (Spider Plant)', acres: 1.5, daysAgo: 10, status: 'Planted' },
      { farmerIdx: 5, crop: 'Tomatoes', acres: 0.8, daysAgo: 80, status: 'Growing' },
      { farmerIdx: 6, crop: 'Sukuma Wiki (Collard Greens)', acres: 5, daysAgo: 10, status: 'Planted' },
      { farmerIdx: 7, crop: 'Spinach', acres: 2, daysAgo: 30, status: 'Growing' },
      { farmerIdx: 8, crop: 'Managu (African Nightshade)', acres: 1.2, daysAgo: 70, status: 'Growing' },
      { farmerIdx: 9, crop: 'Tomatoes', acres: 2.5, daysAgo: 110, status: 'Growing' }
    ];

    const plantingList = [];
    for (const p of plantings) {
      const cropId = cropIds[p.crop];
      const farmer = farmerIds[p.farmerIdx];
      const [cropInfo] = await db.query('SELECT total_maturity_days, baseline_yield_per_acre, price_per_kg FROM crops WHERE id = ?', [cropId]);
      
      const plantingDate = new Date();
      plantingDate.setDate(plantingDate.getDate() - p.daysAgo);
      const harvestDate = new Date(plantingDate);
      harvestDate.setDate(harvestDate.getDate() + cropInfo[0].total_maturity_days);
      const yieldKg = p.acres * cropInfo[0].baseline_yield_per_acre;

      const [result] = await db.query(
        'INSERT INTO planting_requests (farmer_id, crop_id, land_size_acres, expected_yield_kg, planting_date, expected_harvest_date, region_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [farmer.id, cropId, p.acres, yieldKg, plantingDate, harvestDate, farmer.region, p.status]
      );
      plantingList.push({ id: result.insertId, yield: yieldKg, price: cropInfo[0].price_per_kg, status: p.status });
    }
    console.log('🌱 Diverse Planting Requests seeded.');

    // 6. Marketplace Items (For non-Pending/Planted items)
    const marketplaceItems = [];
    for (const p of plantingList) {
        if (p.status === 'Growing' || p.status === 'Harvested') {
            const [result] = await db.query(
                'INSERT INTO marketplace_items (planting_request_id, available_quantity_kg, price_per_kg, listing_status) VALUES (?, ?, ?, ?)',
                [p.id, p.yield, p.price, 'Active']
            );
            marketplaceItems.push({ id: result.insertId, price: p.price, quantity: p.yield });
        }
    }
    console.log('🛒 Marketplace items listed.');

    // 7. Seed Buyer: eugenechanzu@gmail.com
    const [buyerResult] = await db.query(
        'INSERT INTO users (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
        [roleMap.Buyer, 'Eugene Chanzu', 'eugenechanzu@gmail.com', '254790123456', passwordHash]
    );
    const buyerId = buyerResult.insertId;
    console.log('🛍️ Buyer eugenechanzu@gmail.com seeded.');

    // 8. Seed Orders (From Eugene)
    const orderStatuses = ['Pending', 'Paid', 'Delivered'];
    for (let i = 0; i < marketplaceItems.length; i++) {
        const m = marketplaceItems[i];
        const status = orderStatuses[i % orderStatuses.length];
        const qty = Math.min(100, m.quantity * 0.2); // Order some amount
        const total = qty * m.price;

        await db.query(
            'INSERT INTO orders (buyer_id, marketplace_item_id, quantity_ordered_kg, total_price, escrow_status, delivery_address) VALUES (?, ?, ?, ?, ?, ?)',
            [buyerId, m.id, qty, total, status, '123 Tech Avenue, Nairobi']
        );
    }
    console.log('📦 Orders from Eugene seeded with various statuses.');

    console.log('✨ Comprehensive Demonstration Data Seeded Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
