import db from './api/db.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    console.log('🌱 Starting Data Seeding...');

    // 0. Clean up existing data to avoid duplicates (in correct order)
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('TRUNCATE TABLE system_logs');
    await db.query('TRUNCATE TABLE orders');
    await db.query('TRUNCATE TABLE marketplace_items');
    await db.query('TRUNCATE TABLE planting_requests');
    await db.query('TRUNCATE TABLE growth_stages');
    await db.query('TRUNCATE TABLE users');
    await db.query('TRUNCATE TABLE crops');
    // We don't truncate user_types if they are already initialized by init-db.js
    // but we ensure they exist
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🧹 Cleaned existing data.');

    // 1. Seed Crops
    const crops = [
      {
        name: 'Maize',
        yield: 2500,
        maturity: 120,
        price: 45,
        image: 'https://images.pexels.com/photos/594672/pexels-photo-594672.jpeg',
        description: 'High-quality hybrid maize suitable for various climates.',
        stages: [
          { name: 'Germination', offset: 10 },
          { name: 'Vegetative', offset: 40 },
          { name: 'Flowering', offset: 70 },
          { name: 'Grain Filling', offset: 100 },
          { name: 'Maturity', offset: 120 }
        ]
      },
      {
        name: 'Beans',
        yield: 800,
        maturity: 90,
        price: 90,
        image: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg',
        description: 'Protein-rich dry beans, fast-maturing variety.',
        stages: [
          { name: 'Germination', offset: 7 },
          { name: 'Vegetative', offset: 30 },
          { name: 'Flowering', offset: 50 },
          { name: 'Pod Development', offset: 75 },
          { name: 'Maturity', offset: 90 }
        ]
      },
      {
        name: 'Tomatoes',
        yield: 15000,
        maturity: 75,
        price: 60,
        image: 'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg',
        description: 'Juicy, large red tomatoes for both fresh market and processing.',
        stages: [
          { name: 'Seedling', offset: 15 },
          { name: 'Vegetative', offset: 35 },
          { name: 'Flowering', offset: 50 },
          { name: 'Fruit Set', offset: 65 },
          { name: 'Harvest', offset: 75 }
        ]
      },
      {
        name: 'Cabbages',
        yield: 12000,
        maturity: 85,
        price: 30,
        image: 'https://images.pexels.com/photos/2572528/pexels-photo-2572528.jpeg',
        description: 'Firm, heavy heads of cabbage, high resistance to pests.',
        stages: [
          { name: 'Seedling', offset: 20 },
          { name: 'Head Initiation', offset: 50 },
          { name: 'Head Development', offset: 75 },
          { name: 'Maturity', offset: 85 }
        ]
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
        await db.query(
          'INSERT INTO growth_stages (crop_id, stage_name, day_offset) VALUES (?, ?, ?)',
          [cropId, stage.name, stage.offset]
        );
      }
    }
    console.log('✅ Crops and Growth Stages seeded.');

    // 2. Seed Farmers
    const passwordHash = await bcrypt.hash('password123', 10);
    // Use single quotes for string literals in SQL
    const [farmerRole] = await db.query("SELECT id FROM user_types WHERE role_name = 'Farmer'");
    if (farmerRole.length === 0) throw new Error("Farmer role not found. Run init-db.js first.");
    const farmerTypeId = farmerRole[0].id;

    const farmers = [
      { name: 'Jane Wambui', email: 'jane@example.com', phone: '254711111111' },
      { name: 'John Kamau', email: 'john@example.com', phone: '254722222222' },
      { name: 'Peter Musyoka', email: 'peter@example.com', phone: '254733333333' }
    ];

    const farmerIds = [];
    for (const farmer of farmers) {
      const [result] = await db.query(
        'INSERT INTO users (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
        [farmerTypeId, farmer.name, farmer.email, farmer.phone, passwordHash]
      );
      farmerIds.push(result.insertId);
    }
    console.log('✅ Farmers seeded.');

    // 3. Seed Planting Requests
    const plantings = [
      { farmerIdx: 0, crop: 'Maize', acres: 2, region: 'Nakuru', daysAgo: 10 },
      { farmerIdx: 0, crop: 'Beans', acres: 1, region: 'Nakuru', daysAgo: 5 },
      { farmerIdx: 1, crop: 'Tomatoes', acres: 0.5, region: 'Kiambu', daysAgo: 20 },
      { farmerIdx: 1, crop: 'Cabbages', acres: 1.5, region: 'Kiambu', daysAgo: 15 },
      { farmerIdx: 2, crop: 'Maize', acres: 5, region: 'Narok', daysAgo: 30 }
    ];

    const plantingIds = [];
    for (const p of plantings) {
      const cropId = cropIds[p.crop];
      const farmerId = farmerIds[p.farmerIdx];
      const [cropInfo] = await db.query('SELECT total_maturity_days, baseline_yield_per_acre FROM crops WHERE id = ?', [cropId]);
      
      const plantingDate = new Date();
      plantingDate.setDate(plantingDate.getDate() - p.daysAgo);
      
      const harvestDate = new Date(plantingDate);
      harvestDate.setDate(harvestDate.getDate() + cropInfo[0].total_maturity_days);
      
      const expectedYield = p.acres * cropInfo[0].baseline_yield_per_acre;

      const [result] = await db.query(
        "INSERT INTO planting_requests (farmer_id, crop_id, land_size_acres, expected_yield_kg, planting_date, expected_harvest_date, region_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')",
        [farmerId, cropId, p.acres, expectedYield, plantingDate, harvestDate, p.region]
      );
      plantingIds.push(result.insertId);
    }
    console.log('✅ Planting requests seeded.');

    // 4. Update status to 'Planted' and activate some for Marketplace
    for (let i = 0; i < plantingIds.length; i++) {
      const id = plantingIds[i];
      
      await db.query("UPDATE planting_requests SET status = 'Planted' WHERE id = ?", [id]);
      
      const [pInfo] = await db.query('SELECT pr.crop_id, pr.expected_yield_kg, c.price_per_kg FROM planting_requests pr JOIN crops c ON pr.crop_id = c.id WHERE pr.id = ?', [id]);
      
      const status = i % 2 === 0 ? 'Active' : 'Hidden';
      
      await db.query(
        'INSERT INTO marketplace_items (planting_request_id, available_quantity_kg, price_per_kg, listing_status) VALUES (?, ?, ?, ?)',
        [id, pInfo[0].expected_yield_kg, pInfo[0].price_per_kg, status]
      );
    }
    console.log('✅ Marketplace items seeded and some activated.');

    // 5. Seed a Buyer
    const [buyerRole] = await db.query("SELECT id FROM user_types WHERE role_name = 'Buyer'");
    const buyerTypeId = buyerRole[0].id;
    await db.query(
      'INSERT INTO users (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
      [buyerTypeId, 'Sample Buyer', 'buyer@example.com', '254799999999', passwordHash]
    );
    console.log('✅ Sample Buyer seeded.');

    console.log('✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
