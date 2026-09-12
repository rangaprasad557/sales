import { db, pool } from './connection';
import { categories, products, suppliers, customers, inventoryLots } from './schema';

export async function seedInitialData() {
  console.log('--- Seeding Initial Master Data ---');

  // Seed Default Categories
  const categoryData = [
    { name: 'Beverages', slug: 'beverages', icon: 'coffee', description: 'Cold and hot drinks, juices, soda' },
    { name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: 'egg', description: 'Milk, cheese, butter, yogurt, eggs' },
    { name: 'Bakery & Snacks', slug: 'bakery-snacks', icon: 'croissant', description: 'Fresh breads, cookies, chips, crackers' },
    { name: 'Pantry & Grains', slug: 'pantry-grains', icon: 'wheat', description: 'Rice, flour, pasta, canned goods, pulses' },
    { name: 'Personal Care', slug: 'personal-care', icon: 'sparkles', description: 'Soaps, shampoos, hygiene essentials' },
  ];

  for (const cat of categoryData) {
    await db.insert(categories).values(cat).onConflictDoNothing({ target: categories.slug });
  }

  // Seed Default Suppliers
  const supplierData = [
    { name: 'Metro Cash & Carry', contactPerson: 'John Metro', phone: '+1-555-0199', email: 'orders@metro.wholesale', paymentTerms: 'Net 30' },
    { name: 'FreshQuick Wholesale', contactPerson: 'Sarah Quick', phone: '+1-555-0188', email: 'dispatch@freshquick.com', paymentTerms: 'Immediate' },
    { name: 'Global Goods E-Commerce', contactPerson: 'Mike Vendor', phone: '+1-555-0177', email: 'b2b@globalgoods.com', paymentTerms: 'Net 15' },
  ];

  for (const sup of supplierData) {
    await db.insert(suppliers).values(sup).onConflictDoNothing();
  }

  // Seed Default Customers
  const customerData = [
    { name: 'Walk-in Customer', phone: '0000000000', email: 'walkin@store.local', creditLimit: '0.00' },
    { name: 'Corner Cafe LLC', phone: '+1-555-4321', email: 'billing@cornercafe.com', creditLimit: '1500.00' },
    { name: 'Greenwood School Canteen', phone: '+1-555-8765', email: 'accounts@greenwood.edu', creditLimit: '3000.00' },
  ];

  for (const cust of customerData) {
    await db.insert(customers).values(cust).onConflictDoNothing();
  }

  console.log('✓ Initial master data seeded successfully.');
}

if (require.main === module) {
  seedInitialData()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seeding failed:', err);
      await pool.end();
      process.exit(1);
    });
}
