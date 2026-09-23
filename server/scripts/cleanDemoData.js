const db = require('../src/db/database');

console.log('--- Cleaning Seeded & Demo Data from RentAway ---');

// List of demo emails to remove
const demoEmails = [
  'supplier1@rentaway.com',
  'supplier2@rentaway.com',
  'supplier3@rentaway.com',
  'customer1@rentaway.com',
  'customer2@rentaway.com',
  'customer3@rentaway.com',
  'customer4@rentaway.com',
  'customer5@rentaway.com',
  'verified_supp3@rentaway.com'
];

const placeholders = demoEmails.map(() => '?').join(',');
const demoUsers = db.prepare(`SELECT id, email, name FROM users WHERE email IN (${placeholders})`).all(...demoEmails);
const demoUserIds = demoUsers.map(u => u.id);

console.log(`Found ${demoUsers.length} demo users to remove:`, demoUsers.map(u => u.email).join(', '));

// Find demo products (either by demo suppliers or matching demo titles like "% Item %")
let demoProducts = [];
if (demoUserIds.length > 0) {
  const userPlaceholders = demoUserIds.map(() => '?').join(',');
  demoProducts = db.prepare(`
    SELECT id, title, supplier_id 
    FROM products 
    WHERE supplier_id IN (${userPlaceholders}) 
       OR title LIKE '% Item 1' 
       OR title LIKE '% Item 2' 
       OR title LIKE '% Item 3' 
       OR title LIKE '% Item 4' 
       OR title LIKE '% Item 5' 
       OR title LIKE '% Item 6' 
       OR title LIKE '% Item 7' 
       OR title LIKE '% Item 8' 
       OR title LIKE '% Item 9' 
       OR title LIKE '% Item 10' 
       OR title LIKE '% Item 11' 
       OR title LIKE '% Item 12' 
       OR title LIKE '% Item 13' 
       OR title LIKE '% Item 14' 
       OR title LIKE '% Item 15'
       OR title LIKE '% Item %'
  `).all(...demoUserIds);
} else {
  demoProducts = db.prepare(`
    SELECT id, title, supplier_id 
    FROM products 
    WHERE title LIKE '% Item %'
  `).all();
}

const demoProductIds = demoProducts.map(p => p.id);
console.log(`Found ${demoProducts.length} demo products to remove:`, demoProducts.map(p => p.title).join(', '));

// Execute deletion in a transaction
const cleanup = () => {
  // 1. Delete product images for demo products
  if (demoProductIds.length > 0) {
    const prodPlaceholders = demoProductIds.map(() => '?').join(',');
    const deletedImages = db.prepare(`DELETE FROM product_images WHERE product_id IN (${prodPlaceholders})`).run(...demoProductIds);
    console.log(`Deleted ${deletedImages.changes} product images.`);
  }

  // 2. Delete reviews on demo products or by demo users
  let deletedReviews;
  if (demoProductIds.length > 0 && demoUserIds.length > 0) {
    const prodPlaceholders = demoProductIds.map(() => '?').join(',');
    const userPlaceholders = demoUserIds.map(() => '?').join(',');
    deletedReviews = db.prepare(`DELETE FROM reviews WHERE product_id IN (${prodPlaceholders}) OR customer_id IN (${userPlaceholders})`).run(...demoProductIds, ...demoUserIds);
  } else if (demoProductIds.length > 0) {
    const prodPlaceholders = demoProductIds.map(() => '?').join(',');
    deletedReviews = db.prepare(`DELETE FROM reviews WHERE product_id IN (${prodPlaceholders})`).run(...demoProductIds);
  } else if (demoUserIds.length > 0) {
    const userPlaceholders = demoUserIds.map(() => '?').join(',');
    deletedReviews = db.prepare(`DELETE FROM reviews WHERE customer_id IN (${userPlaceholders})`).run(...demoUserIds);
  }
  if (deletedReviews) console.log(`Deleted ${deletedReviews.changes} reviews.`);

  // 3. Delete payments linked to demo rentals
  if (demoProductIds.length > 0 || demoUserIds.length > 0) {
    // Delete payments for rentals that match demo products or demo users
    const demoRentals = db.prepare(`
      SELECT id FROM rentals 
      WHERE product_id IN (${demoProductIds.map(() => '?').join(',') || "''"}) 
         OR customer_id IN (${demoUserIds.map(() => '?').join(',') || "''"})
    `).all(...demoProductIds, ...demoUserIds);

    const demoRentalIds = demoRentals.map(r => r.id);
    if (demoRentalIds.length > 0) {
      const rentalPlaceholders = demoRentalIds.map(() => '?').join(',');
      const deletedPayments = db.prepare(`DELETE FROM payments WHERE rental_id IN (${rentalPlaceholders})`).run(...demoRentalIds);
      console.log(`Deleted ${deletedPayments.changes} payments associated with demo rentals.`);
      
      const deletedRentals = db.prepare(`DELETE FROM rentals WHERE id IN (${rentalPlaceholders})`).run(...demoRentalIds);
      console.log(`Deleted ${deletedRentals.changes} demo rentals.`);
    }
  }

  // 4. Delete favorites for demo products or by demo users
  if (demoProductIds.length > 0 || demoUserIds.length > 0) {
    const deletedFavs = db.prepare(`
      DELETE FROM favorites 
      WHERE product_id IN (${demoProductIds.map(() => '?').join(',') || "''"}) 
         OR user_id IN (${demoUserIds.map(() => '?').join(',') || "''"})
    `).run(...demoProductIds, ...demoUserIds);
    console.log(`Deleted ${deletedFavs.changes} demo favorites.`);
  }

  // 5. Delete messages by or to demo users
  if (demoUserIds.length > 0) {
    const userPlaceholders = demoUserIds.map(() => '?').join(',');
    const deletedMsgs = db.prepare(`DELETE FROM messages WHERE sender_id IN (${userPlaceholders}) OR receiver_id IN (${userPlaceholders})`).run(...demoUserIds, ...demoUserIds);
    console.log(`Deleted ${deletedMsgs.changes} demo messages.`);
  }

  // 6. Delete notifications for demo users
  if (demoUserIds.length > 0) {
    const userPlaceholders = demoUserIds.map(() => '?').join(',');
    const deletedNotifs = db.prepare(`DELETE FROM notifications WHERE user_id IN (${userPlaceholders})`).run(...demoUserIds);
    console.log(`Deleted ${deletedNotifs.changes} demo notifications.`);
  }

  // 7. Delete community posts by demo users
  if (demoUserIds.length > 0) {
    const userPlaceholders = demoUserIds.map(() => '?').join(',');
    const deletedPosts = db.prepare(`DELETE FROM community_posts WHERE user_id IN (${userPlaceholders})`).run(...demoUserIds);
    console.log(`Deleted ${deletedPosts.changes} demo community posts.`);
  }

  // 8. Delete complaints by demo users
  if (demoUserIds.length > 0) {
    const userPlaceholders = demoUserIds.map(() => '?').join(',');
    const deletedComplaints = db.prepare(`DELETE FROM complaints WHERE reporter_id IN (${userPlaceholders}) OR reported_id IN (${userPlaceholders})`).run(...demoUserIds, ...demoUserIds);
    console.log(`Deleted ${deletedComplaints.changes} demo complaints.`);
  }

  // 9. Delete demo products
  if (demoProductIds.length > 0) {
    const prodPlaceholders = demoProductIds.map(() => '?').join(',');
    const deletedProducts = db.prepare(`DELETE FROM products WHERE id IN (${prodPlaceholders})`).run(...demoProductIds);
    console.log(`Deleted ${deletedProducts.changes} demo products.`);
  }

  // 10. Delete demo users
  if (demoUserIds.length > 0) {
    const userPlaceholders = demoUserIds.map(() => '?').join(',');
    const deletedUsers = db.prepare(`DELETE FROM users WHERE id IN (${userPlaceholders})`).run(...demoUserIds);
    console.log(`Deleted ${deletedUsers.changes} demo users.`);
  }

  // 11. Rebuild FTS5 index to remove deleted terms
  try {
    db.exec("INSERT INTO products_fts(products_fts) VALUES('rebuild');");
    console.log('Rebuilt products_fts search index.');
  } catch (err) {
    console.warn('Could not rebuild products_fts:', err.message);
  }
};

cleanup();

console.log('--- Cleanup Finished Successfully ---');
