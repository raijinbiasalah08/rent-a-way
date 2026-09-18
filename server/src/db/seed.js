const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const runSeed = async () => {
  console.log('Seeding database...');
  
  // Clean DB
  db.exec('DELETE FROM reviews');
  db.exec('DELETE FROM community_posts');
  db.exec('DELETE FROM complaints');
  db.exec('DELETE FROM payments');
  db.exec('DELETE FROM rentals');
  db.exec('DELETE FROM product_images');
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM users');

  const now = new Date().toISOString();
  
  // Users
  const adminHash = await bcrypt.hash('admin123', 10);
  const suppHash = await bcrypt.hash('supplier123', 10);
  const custHash = await bcrypt.hash('customer123', 10);

  const adminId = uuidv4();
  const s1Id = uuidv4();
  const s2Id = uuidv4();
  const s3Id = uuidv4();
  const c1Id = uuidv4();
  const c2Id = uuidv4();
  const c3Id = uuidv4();
  const c4Id = uuidv4();
  const c5Id = uuidv4();

  const users = [
    { id: adminId, email: 'admin@rentaway.com', pass: adminHash, role: 'admin', name: 'Admin User' },
    { id: s1Id, email: 'supplier1@rentaway.com', pass: suppHash, role: 'supplier', name: 'Tech Rentals PH' },
    { id: s2Id, email: 'supplier2@rentaway.com', pass: suppHash, role: 'supplier', name: 'Outdoor Gear' },
    { id: s3Id, email: 'supplier3@rentaway.com', pass: suppHash, role: 'supplier', name: 'Event Props Studio' },
    { id: c1Id, email: 'customer1@rentaway.com', pass: custHash, role: 'customer', name: 'Juan Dela Cruz' },
    { id: c2Id, email: 'customer2@rentaway.com', pass: custHash, role: 'customer', name: 'Maria Santos' },
    { id: c3Id, email: 'customer3@rentaway.com', pass: custHash, role: 'customer', name: 'Pedro Penduko' },
    { id: c4Id, email: 'customer4@rentaway.com', pass: custHash, role: 'customer', name: 'Ana Reyes' },
    { id: c5Id, email: 'customer5@rentaway.com', pass: custHash, role: 'customer', name: 'Lito Lapid' }
  ];

  const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.pass, u.role, now);
  }

  // Products
  const categories = ['Cameras', 'Camping', 'Sports', 'Event', 'Household', 'School'];
  const products = [];
  
  for (let i = 1; i <= 15; i++) {
    const id = uuidv4();
    const cat = categories[i % categories.length];
    const p = {
      id,
      supplier_id: [s1Id, s2Id, s3Id][i % 3],
      title: `${cat} Item ${i}`,
      description: `High quality ${cat.toLowerCase()} equipment ready for rent.`,
      category: cat,
      price_per_day: 100 + (i * 50),
      min_days: 1,
      max_days: 7,
      specs: JSON.stringify({ brand: 'Generic', model: 'Model X' }),
      created_at: now
    };
    products.push(p);
  }

  const insertProduct = db.prepare('INSERT INTO products (id, supplier_id, title, description, category, price_per_day, min_days, max_days, specs, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertImage = db.prepare('INSERT INTO product_images (id, product_id, url, is_primary) VALUES (?, ?, ?, 1)');
  
  for (const p of products) {
    insertProduct.run(p.id, p.supplier_id, p.title, p.description, p.category, p.price_per_day, p.min_days, p.max_days, p.specs, p.created_at);
    insertImage.run(uuidv4(), p.id, `https://placehold.co/600x400/1a237e/f5f0dc?text=${encodeURIComponent(p.title)}`);
  }

  // Rentals
  const statuses = ['pending', 'approved', 'active', 'completed', 'returned'];
  const insertRental = db.prepare('INSERT INTO rentals (id, product_id, customer_id, start_date, end_date, total_price, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (let i = 0; i < 8; i++) {
    const p = products[i];
    const cId = users[4 + (i % 5)].id; // one of the customers
    const rId = uuidv4();
    insertRental.run(rId, p.id, cId, '2024-05-01', '2024-05-05', p.price_per_day * 4, statuses[i % statuses.length], now);
  }

  // Reviews
  const insertReview = db.prepare('INSERT INTO reviews (id, product_id, customer_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (let i = 0; i < 5; i++) {
    insertReview.run(uuidv4(), products[i].id, c1Id, 5, 'Great item!', now);
  }

  // Community Posts
  const insertPost = db.prepare('INSERT INTO community_posts (id, user_id, content, type, created_at) VALUES (?, ?, ?, ?, ?)');
  for (let i = 0; i < 5; i++) {
    insertPost.run(uuidv4(), c1Id, 'Looking for camping gear recommendations!', 'recommendation', now);
  }

  // Complaints
  const insertComplaint = db.prepare('INSERT INTO complaints (id, reporter_id, reported_id, subject, details, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (let i = 0; i < 3; i++) {
    insertComplaint.run(uuidv4(), c2Id, s1Id, 'Late response', 'The supplier replied very late.', now);
  }

  console.log('Seeding complete!');
};

runSeed().catch(err => console.error(err));
