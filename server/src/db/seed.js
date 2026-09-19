const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const runSeed = async () => {
  console.log('Seeding database with realistic data...');
  
  // Clean DB
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM notifications');
  db.exec('DELETE FROM favorites');
  db.exec('DELETE FROM reviews');
  db.exec('DELETE FROM community_posts');
  db.exec('DELETE FROM complaints');
  db.exec('DELETE FROM payments');
  db.exec('DELETE FROM rentals');
  db.exec('DELETE FROM product_images');
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM users');

  const now = new Date().toISOString();
  
  // Hashed Passwords
  const adminHash = await bcrypt.hash('admin123', 10);
  const suppHash = await bcrypt.hash('supplier123', 10);
  const custHash = await bcrypt.hash('customer123', 10);

  // Users UUIDs
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
    { id: adminId, email: 'admin@rentaway.com', pass: adminHash, role: 'admin', name: 'Admin Manager', avatar: '' },
    { id: s1Id, email: 'supplier1@rentaway.com', pass: suppHash, role: 'supplier', name: 'Lens Rentals Manila', avatar: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=150&q=80' },
    { id: s2Id, email: 'supplier2@rentaway.com', pass: suppHash, role: 'supplier', name: 'Outdoor Adventures PH', avatar: 'https://images.unsplash.com/photo-1533038590840-1c73a696be82?w=150&q=80' },
    { id: s3Id, email: 'supplier3@rentaway.com', pass: suppHash, role: 'supplier', name: 'Luminance Event Props', avatar: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=150&q=80' },
    { id: c1Id, email: 'customer1@rentaway.com', pass: custHash, role: 'customer', name: 'Juan Dela Cruz', avatar: 'https://i.pravatar.cc/150?img=11' },
    { id: c2Id, email: 'customer2@rentaway.com', pass: custHash, role: 'customer', name: 'Maria Santos', avatar: 'https://i.pravatar.cc/150?img=5' },
    { id: c3Id, email: 'customer3@rentaway.com', pass: custHash, role: 'customer', name: 'Pedro Penduko', avatar: 'https://i.pravatar.cc/150?img=12' },
    { id: c4Id, email: 'customer4@rentaway.com', pass: custHash, role: 'customer', name: 'Ana Reyes', avatar: 'https://i.pravatar.cc/150?img=9' },
    { id: c5Id, email: 'customer5@rentaway.com', pass: custHash, role: 'customer', name: 'Lito Lapid', avatar: 'https://i.pravatar.cc/150?img=13' }
  ];

  const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.pass, u.role, u.avatar, now);
  }

  const products = [
    // Cameras & Drones
    {
      id: uuidv4(), supplier_id: s1Id, category: 'Cameras',
      title: 'Sony Alpha A7III + 28-70mm Lens',
      description: 'The Sony a7 III is a full-frame mirrorless camera that is capable of 10 fps burst shooting and 4K HDR video. Includes the versatile 28-70mm lens, 2 batteries, and a 64GB SD card. Perfect for weddings, events, or travel photography.',
      price_per_day: 1500, min_days: 1, max_days: 14,
      specs: JSON.stringify([ { label: 'Sensor', value: '24.2MP Full-Frame' }, { label: 'Video', value: '4K30p' }, { label: 'Mount', value: 'Sony E' } ]),
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s1Id, category: 'Cameras',
      title: 'DJI Mavic 3 Pro Drone',
      description: 'Capture stunning aerial footage with the DJI Mavic 3 Pro. Features a triple-camera system, Hasselblad color science, and up to 43 minutes of flight time. Includes the Fly More Combo with 3 batteries, ND filters, and a carrying case.',
      price_per_day: 2500, min_days: 2, max_days: 7,
      specs: JSON.stringify([ { label: 'Camera', value: '4/3 CMOS Hasselblad' }, { label: 'Flight Time', value: '43 mins' }, { label: 'Max Range', value: '15 km' } ]),
      image: 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s1Id, category: 'Cameras',
      title: 'GoPro HERO 11 Black Action Camera',
      description: 'The ultimate action camera for your next adventure. Shoots stunning 5.3K video and 27MP photos. Waterproof up to 33ft without a housing. Includes floating hand grip and chest mount.',
      price_per_day: 500, min_days: 2, max_days: 14,
      specs: JSON.stringify([ { label: 'Video Resolution', value: '5.3K60 / 4K120' }, { label: 'Stabilization', value: 'HyperSmooth 5.0' }, { label: 'Waterproof', value: '33ft (10m)' } ]),
      image: 'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s1Id, category: 'Cameras',
      title: 'Canon EOS R5 Mirrorless Camera Body',
      description: 'Next-generation full-frame mirrorless camera. 45MP resolution and 8K raw video capability. Ideal for professional filmmakers and high-end photographers.',
      price_per_day: 3000, min_days: 1, max_days: 7,
      specs: JSON.stringify([ { label: 'Sensor', value: '45MP Full-Frame' }, { label: 'Video', value: '8K Raw' }, { label: 'Mount', value: 'Canon RF' } ]),
      image: 'https://images.unsplash.com/photo-1599665518173-040d6c429e28?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s1Id, category: 'Cameras',
      title: 'DJI RS 3 Pro Gimbal Stabilizer',
      description: 'Advanced gimbal stabilizer for DSLR and cinema cameras. Features automated axis locks, LiDAR focusing system, and a 4.5kg payload capacity.',
      price_per_day: 800, min_days: 1, max_days: 7,
      specs: JSON.stringify([ { label: 'Payload', value: '4.5kg' }, { label: 'Battery', value: '12 hours' }, { label: 'Weight', value: '1.5kg' } ]),
      image: 'https://images.unsplash.com/photo-1618384218684-25e407519cd0?w=800&q=80'
    },

    // Camping Equipment
    {
      id: uuidv4(), supplier_id: s2Id, category: 'Camping',
      title: 'The North Face Wawona 4-Person Tent',
      description: 'Spacious and weather-resistant 4-person tent perfect for weekend camping trips or festivals. Features a massive vestibule for storing gear or hanging out. Easy to set up with color-coded poles.',
      price_per_day: 600, min_days: 2, max_days: 14,
      specs: JSON.stringify([ { label: 'Capacity', value: '4 Persons' }, { label: 'Weight', value: '13 lbs' }, { label: 'Seasons', value: '3-Season' } ]),
      image: 'https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s2Id, category: 'Camping',
      title: 'Yeti Tundra 45 Cooler',
      description: 'Legendary toughness and unmatched ice retention. The Tundra 45 is perfectly sized for weekend trips and fits easily in the back of most cars. Can hold up to 28 cans with a 2:1 ice-to-can ratio.',
      price_per_day: 400, min_days: 1, max_days: 10,
      specs: JSON.stringify([ { label: 'Capacity', value: '32.9 Liters' }, { label: 'Weight', value: '23 lbs' }, { label: 'Material', value: 'Rotomolded Polyethylene' } ]),
      image: 'https://images.unsplash.com/photo-1621877685160-5fdb6138927f?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s2Id, category: 'Camping',
      title: 'Coleman Portable Propane Stove',
      description: 'Classic 2-burner propane camp stove. Boils water in minutes and cooks evenly. Includes windshields and regulator. Propane cylinder not included.',
      price_per_day: 200, min_days: 2, max_days: 14,
      specs: JSON.stringify([ { label: 'Burners', value: '2' }, { label: 'Power', value: '20,000 BTUs' }, { label: 'Fuel', value: 'Propane' } ]),
      image: 'https://images.unsplash.com/photo-1521481109033-68d712ce62eb?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s2Id, category: 'Camping',
      title: 'Petzl Tikka Headlamp (Set of 2)',
      description: 'Essential hands-free lighting for camping. 300 lumens brightness with multiple modes including red light for night vision. Batteries included.',
      price_per_day: 100, min_days: 1, max_days: 7,
      specs: JSON.stringify([ { label: 'Brightness', value: '300 Lumens' }, { label: 'Weight', value: '82g' }, { label: 'Beam', value: 'Flood' } ]),
      image: 'https://images.unsplash.com/photo-1534062145781-67d7cb9ecbb8?w=800&q=80'
    },

    // Sports Equipment
    {
      id: uuidv4(), supplier_id: s2Id, category: 'Sports',
      title: 'Specialized Allez Road Bike (Size M)',
      description: 'Lightweight and fast road bike perfect for city commuting, triathlons, or weekend long rides. Premium aluminum frame with carbon fork. Comes with helmet and combination lock.',
      price_per_day: 800, min_days: 1, max_days: 7,
      specs: JSON.stringify([ { label: 'Size', value: 'Medium (54cm)' }, { label: 'Frame', value: 'E5 Premium Aluminum' }, { label: 'Gears', value: '16-speed Shimano' } ]),
      image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s2Id, category: 'Sports',
      title: 'Wilson Pro Staff Tennis Racket',
      description: 'Professional grade tennis racket. Used by top players for ultimate precision and feel. Strings freshly restrung at 55lbs.',
      price_per_day: 300, min_days: 1, max_days: 5,
      specs: JSON.stringify([ { label: 'Weight', value: '315g' }, { label: 'Head Size', value: '97 sq in' }, { label: 'String Pattern', value: '16x19' } ]),
      image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s2Id, category: 'Sports',
      title: 'Stand Up Paddleboard (SUP) Set',
      description: 'Inflatable SUP perfect for lakes or calm ocean bays. Includes pump, adjustable paddle, leash, and carrying backpack. Very stable for beginners.',
      price_per_day: 700, min_days: 1, max_days: 5,
      specs: JSON.stringify([ { label: 'Length', value: '10ft 6in' }, { label: 'Capacity', value: '300 lbs' }, { label: 'Type', value: 'Inflatable' } ]),
      image: 'https://images.unsplash.com/photo-1544158652-32a246d61661?w=800&q=80'
    },

    // Event Equipment
    {
      id: uuidv4(), supplier_id: s3Id, category: 'Event',
      title: 'Bose S1 Pro Portable PA System',
      description: 'Deliver big sound anywhere with the Bose S1 Pro. Features Bluetooth streaming, built-in battery for 11 hours of playtime, and Auto EQ. Ideal for small parties, acoustic gigs, or presentations.',
      price_per_day: 1200, min_days: 1, max_days: 5,
      specs: JSON.stringify([ { label: 'Battery Life', value: 'Up to 11 hours' }, { label: 'Connectivity', value: 'Bluetooth, 2x Combo XLR' }, { label: 'Weight', value: '15.5 lbs' } ]),
      image: 'https://images.unsplash.com/photo-1520151122047-975001be0d58?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s3Id, category: 'Event',
      title: 'Epson 1080p Home Cinema Projector',
      description: 'Transform any space into a theater. Features 3,400 lumens of color and white brightness for vibrant images even in well-lit rooms. Includes a portable 100-inch projection screen.',
      price_per_day: 1000, min_days: 1, max_days: 3,
      specs: JSON.stringify([ { label: 'Resolution', value: '1080p Full HD' }, { label: 'Brightness', value: '3,400 Lumens' }, { label: 'Connectivity', value: 'HDMI, USB' } ]),
      image: 'https://images.unsplash.com/photo-1540206395-68808572332f?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s3Id, category: 'Event',
      title: 'Fog Machine 1500W with Lights',
      description: 'Create an incredible atmosphere for your next party or event. Includes wireless remote and built-in RGB LEDs to color the fog. 1 liter of fluid included.',
      price_per_day: 400, min_days: 1, max_days: 3,
      specs: JSON.stringify([ { label: 'Power', value: '1500W' }, { label: 'Output', value: '20,000 CFM' }, { label: 'Lights', value: '9x 3W RGB' } ]),
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s3Id, category: 'Event',
      title: 'Folding Chairs (Set of 10)',
      description: 'Durable and comfortable white resin folding chairs. Perfect for weddings, parties, or any gathering where extra seating is needed.',
      price_per_day: 250, min_days: 1, max_days: 7,
      specs: JSON.stringify([ { label: 'Quantity', value: '10' }, { label: 'Color', value: 'White' }, { label: 'Material', value: 'Resin/Steel' } ]),
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
    },

    // Household Equipment
    {
      id: uuidv4(), supplier_id: s1Id, category: 'Household',
      title: 'DeWalt 20V MAX Cordless Drill Combo Kit',
      description: 'Includes a drill/driver and an impact driver. Perfect for DIY projects around the house. Comes with 2 batteries, charger, and a basic bit set.',
      price_per_day: 350, min_days: 1, max_days: 10,
      specs: JSON.stringify([ { label: 'Voltage', value: '20V' }, { label: 'Tools', value: 'Drill + Impact' }, { label: 'Batteries', value: '2x 1.5Ah' } ]),
      image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s1Id, category: 'Household',
      title: 'Kärcher K4 Pressure Washer',
      description: 'High-pressure cleaner ideal for washing cars, patios, and fences. Includes vario power spray lance and dirt blaster. Requires water connection.',
      price_per_day: 500, min_days: 1, max_days: 3,
      specs: JSON.stringify([ { label: 'Pressure', value: '130 Bar' }, { label: 'Flow Rate', value: '420 L/h' }, { label: 'Power', value: '1800W' } ]),
      image: 'https://images.unsplash.com/photo-1616421063678-0136d88f6153?w=800&q=80'
    },

    // School Project Equipment
    {
      id: uuidv4(), supplier_id: s3Id, category: 'School',
      title: 'AmScope Binocular Compound Microscope',
      description: '40X-2500X magnification. Perfect for biology science projects or homeschooling. Includes 3D mechanical stage and a box of prepared slides.',
      price_per_day: 300, min_days: 2, max_days: 14,
      specs: JSON.stringify([ { label: 'Magnification', value: '40X - 2500X' }, { label: 'Head', value: 'Binocular' }, { label: 'Illumination', value: 'LED' } ]),
      image: 'https://images.unsplash.com/photo-1532094349884-543290200b6b?w=800&q=80'
    },
    {
      id: uuidv4(), supplier_id: s3Id, category: 'School',
      title: '3D Printer - Creality Ender 3 V2',
      description: 'Bring your school project designs to life. Reliable and easy to use. Includes 1 roll of white PLA filament. Quick tutorial provided upon pickup.',
      price_per_day: 600, min_days: 3, max_days: 14,
      specs: JSON.stringify([ { label: 'Build Volume', value: '220x220x250mm' }, { label: 'Material', value: 'PLA/PETG' }, { label: 'Resolution', value: '0.1mm' } ]),
      image: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=800&q=80'
    }
  ];

  const insertProduct = db.prepare('INSERT INTO products (id, supplier_id, title, description, category, price_per_day, min_days, max_days, specs, created_at, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertImage = db.prepare('INSERT INTO product_images (id, product_id, url, is_primary) VALUES (?, ?, ?, 1)');
  
  for (const p of products) {
    const lat = 14.4 + Math.random() * 0.3;
    const lng = 120.9 + Math.random() * 0.2;
    insertProduct.run(p.id, p.supplier_id, p.title, p.description, p.category, p.price_per_day, p.min_days, p.max_days, p.specs, now, lat, lng);
    insertImage.run(uuidv4(), p.id, p.image);
  }

  // Realistic Rentals
  const statuses = ['pending', 'approved', 'active', 'completed', 'returned'];
  const insertRental = db.prepare('INSERT INTO rentals (id, product_id, customer_id, start_date, end_date, total_price, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const cId = users[4 + (i % 5)].id; // distribute among customers
    const rId = uuidv4();
    
    // Vary the rental dates and status
    const status = statuses[i % statuses.length];
    let sDate = yesterday;
    let eDate = tomorrow;
    let days = 2;

    if (status === 'pending') { sDate = tomorrow; eDate = nextWeek; days = 7; }
    else if (status === 'completed' || status === 'returned') { sDate = '2024-05-01'; eDate = '2024-05-03'; days = 2; }
    
    insertRental.run(rId, p.id, cId, sDate, eDate, p.price_per_day * days, status, now);
  }

  // Realistic Reviews
  const insertReview = db.prepare('INSERT INTO reviews (id, product_id, customer_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  
  insertReview.run(uuidv4(), products[0].id, c1Id, 5, 'Camera was in pristine condition. Lens Rentals Manila was very professional and easy to communicate with.', now);
  insertReview.run(uuidv4(), products[0].id, c2Id, 5, 'Perfect for my weekend trip. The battery life is amazing.', now);
  insertReview.run(uuidv4(), products[2].id, c3Id, 4, 'Tent was great and easy to pitch. A bit heavy to carry for long hikes though.', now);
  insertReview.run(uuidv4(), products[4].id, c4Id, 5, 'The Bose speaker was loud enough for our outdoor party of 50 people. Excellent bass response!', now);

  // Realistic Community Posts
  const insertPost = db.prepare('INSERT INTO community_posts (id, user_id, content, type, created_at) VALUES (?, ?, ?, ?, ?)');
  insertPost.run(uuidv4(), c1Id, 'Hi everyone! Any recommendations for a reliable mirrorless camera for low-light event photography?', 'recommendation', now);
  insertPost.run(uuidv4(), c3Id, 'Just rented the Wawona 4 tent from Outdoor Adventures PH. Highly recommend them for camping gear!', 'shoutout', now);
  insertPost.run(uuidv4(), s1Id, 'Just added a new DJI drone to our catalog! Let us know if you need any tips on flying it safely.', 'update', now);

  console.log('Seeding complete! Realistic data injected.');
};

runSeed().catch(err => console.error(err));
