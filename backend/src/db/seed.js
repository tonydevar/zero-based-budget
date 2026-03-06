'use strict';

/**
 * Seeds the database with default category groups and categories on first run.
 * Only runs if the category_groups table is empty.
 */
function seedDatabase(db) {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM category_groups').get();
  if (count.cnt > 0) return;

  const insertGroup = db.prepare(
    'INSERT INTO category_groups (name, sort_order, is_system) VALUES (?, ?, ?)'
  );
  const insertCategory = db.prepare(
    'INSERT INTO categories (category_group_id, name, sort_order) VALUES (?, ?, ?)'
  );

  const seedData = [
    {
      name: 'Fixed Expenses',
      sort_order: 1000,
      is_system: 0,
      categories: [
        'Rent/Mortgage',
        'Electric',
        'Water',
        'Internet',
        'Phone',
        'Insurance',
      ],
    },
    {
      name: 'Variable Spending',
      sort_order: 2000,
      is_system: 0,
      categories: [
        'Groceries',
        'Dining Out',
        'Gas',
        'Entertainment',
        'Clothing',
        'Personal Care',
      ],
    },
    {
      name: 'Savings Goals',
      sort_order: 3000,
      is_system: 0,
      categories: ['Emergency Fund', 'Vacation', 'New Car', 'Home Repair'],
    },
  ];

  const doSeed = db.transaction(() => {
    for (const group of seedData) {
      const result = insertGroup.run(group.name, group.sort_order, group.is_system);
      const groupId = result.lastInsertRowid;
      group.categories.forEach((catName, idx) => {
        insertCategory.run(groupId, catName, (idx + 1) * 1000);
      });
    }
  });

  doSeed();
}

module.exports = { seedDatabase };
