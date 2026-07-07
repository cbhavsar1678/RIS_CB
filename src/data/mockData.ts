/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store, User, Supplier, Product, Allergen, Inventory, PurchaseOrder, Recipe, BatchJob, StockTransfer, StockAdjustment, SalesImport, FuturePriceUpdate, CustomerOrder, StocktakeHistory } from '../types';

export const ALLERGENS: Allergen[] = [
  { id: 'GL', name: 'Gluten', code: 'GL', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50', icon: '🌾' },
  { id: 'DA', name: 'Dairy', code: 'DA', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50', icon: '🥛' },
  { id: 'NU', name: 'Nuts', code: 'NU', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50', icon: '🥜' },
  { id: 'SH', name: 'Shellfish', code: 'SH', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50', icon: '🦀' },
  { id: 'EG', name: 'Eggs', code: 'EG', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900/50', icon: '🥚' },
  { id: 'SO', name: 'Soy', code: 'SO', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/50', icon: '🌱' },
];

export const INITIAL_STORES: Store[] = [
  { id: 'st-downtown', name: 'Downtown Bistro', code: 'ST-DWTN', address: '456 Main Street, Financial District', phone: '555-0192', isActive: true, latitude: 40.7085, longitude: -74.0080 },
  { id: 'st-uptown', name: 'Uptown Kitchen & Bar', code: 'ST-UPTN', address: '789 Broadway Ave, Theater Row', phone: '555-0143', isActive: true, latitude: 40.7590, longitude: -73.9845 },
  { id: 'st-beachfront', name: 'Beachfront Grill', code: 'ST-BCHF', address: '12 Ocean Blvd, Seaside Walk', phone: '555-0188', isActive: true, latitude: 40.5750, longitude: -73.9820 },
];

export const INITIAL_USERS: User[] = [
  { id: 'usr-1', name: 'Sarah Jenkins', email: 'sarah.admin@restaurant.com', role: 'Admin' },
  { id: 'usr-2', name: 'Marcus Brody', email: 'marcus.downtown@restaurant.com', role: 'Manager', storeId: 'st-downtown' },
  { id: 'usr-3', name: 'Elena Rostova', email: 'elena.uptown@restaurant.com', role: 'Manager', storeId: 'st-uptown' },
  { id: 'usr-4', name: 'Jimmy Vance', email: 'jimmy@supplier-sysco.com', role: 'Supplier' },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup-sysco', name: 'Sysco Food Services', code: 'SUP-SYSCO', contactName: 'Robert Vance', email: 'robert@syscofoods.com', phone: '1-800-555-9182', leadTimeDays: 2, minOrderValue: 250.00, paymentTerms: 'Net 30', isActive: true },
  { id: 'sup-produce-plus', name: 'Produce Plus Co.', code: 'SUP-PROD', contactName: 'Angela Martin', email: 'orders@produceplus.com', phone: '555-0111', leadTimeDays: 1, minOrderValue: 100.00, paymentTerms: 'Net 15', isActive: true },
  { id: 'sup-meat-masters', name: 'Meat Masters Inc.', code: 'SUP-MEAT', contactName: 'Frank Butcher', email: 'frank@meatmasters.com', phone: '555-0133', leadTimeDays: 3, minOrderValue: 400.00, paymentTerms: 'Net 30', isActive: true },
  { id: 'sup-pack-solutions', name: 'EcoPack Solutions', code: 'SUP-EPACK', contactName: 'Pam Beesly', email: 'pam@ecopack.com', phone: '555-0155', leadTimeDays: 5, minOrderValue: 150.00, paymentTerms: 'Net 45', isActive: true },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Proteins
  { id: 'prod-beef-ribeye', name: 'Prime Angus Ribeye (Whole Lip-On)', sku: 'PR-RIB-001', category: 'Protein', basePrice: 280.00, taxRate: 0.0, packagingUnit: 'Box (20 Kg)', unitsPerPackage: 20, stockingUnit: 'Kg', allergens: [], supplierId: 'sup-meat-masters', isActive: true, isArchived: false },
  { id: 'prod-chicken-breast', name: 'Cage-Free Boneless Chicken Breast', sku: 'PR-CHK-002', category: 'Protein', basePrice: 65.00, taxRate: 0.0, packagingUnit: 'Box (10 Kg)', unitsPerPackage: 10, stockingUnit: 'Kg', allergens: [], supplierId: 'sup-meat-masters', isActive: true, isArchived: false },
  { id: 'prod-shrimp', name: 'Tiger Shrimp (16/20 Peeled & De-veined)', sku: 'PR-SHR-003', category: 'Protein', basePrice: 120.00, taxRate: 0.0, packagingUnit: 'Case (5 Kg)', unitsPerPackage: 5, stockingUnit: 'Kg', allergens: ['SH'], supplierId: 'sup-sysco', isActive: true, isArchived: false },

  // Produce
  { id: 'prod-roma-tomatoes', name: 'Roma Tomatoes (Vine-Ripened)', sku: 'PD-TOM-101', category: 'Produce', basePrice: 18.50, taxRate: 0.0, packagingUnit: 'Box (5 Kg)', unitsPerPackage: 5, stockingUnit: 'Kg', allergens: [], supplierId: 'sup-produce-plus', isActive: true, isArchived: false },
  { id: 'prod-romaine-lettuce', name: 'Romaine Lettuce Heads', sku: 'PD-LET-102', category: 'Produce', basePrice: 22.00, taxRate: 0.0, packagingUnit: 'Case (24 Heads)', unitsPerPackage: 24, stockingUnit: 'Piece', allergens: [], supplierId: 'sup-produce-plus', isActive: true, isArchived: false },
  { id: 'prod-yellow-onions', name: 'Yellow Onions (Medium)', sku: 'PD-ONN-103', category: 'Produce', basePrice: 12.00, taxRate: 0.0, packagingUnit: 'Bag (10 Kg)', unitsPerPackage: 10, stockingUnit: 'Kg', allergens: [], supplierId: 'sup-produce-plus', isActive: true, isArchived: false },

  // Dairy
  { id: 'prod-heavy-cream', name: 'Pasteurized Heavy Cream 36%', sku: 'DR-CRM-201', category: 'Dairy', basePrice: 42.00, taxRate: 0.0, packagingUnit: 'Case (12 Liters)', unitsPerPackage: 12, stockingUnit: 'Liter', allergens: ['DA'], supplierId: 'sup-sysco', isActive: true, isArchived: false },
  { id: 'prod-butter-unsalted', name: 'Unsalted Butter Blocks', sku: 'DR-BUT-202', category: 'Dairy', basePrice: 55.00, taxRate: 0.0, packagingUnit: 'Box (10 Kg)', unitsPerPackage: 10, stockingUnit: 'Kg', allergens: ['DA'], supplierId: 'sup-sysco', isActive: true, isArchived: false },
  { id: 'prod-parmesan', name: 'Parmigiano Reggiano (Aged 24 Mo)', sku: 'DR-PAR-203', category: 'Dairy', basePrice: 195.00, taxRate: 0.0, packagingUnit: 'Wheel (5 Kg)', unitsPerPackage: 5, stockingUnit: 'Kg', allergens: ['DA'], supplierId: 'sup-sysco', isActive: true, isArchived: false },

  // Dry Goods
  { id: 'prod-semolina-pasta', name: 'Durum Semolina Penne Pasta', sku: 'DG-PST-301', category: 'Dry Goods', basePrice: 35.00, taxRate: 0.0, packagingUnit: 'Bag (10 Kg)', unitsPerPackage: 10, stockingUnit: 'Kg', allergens: ['GL'], supplierId: 'sup-sysco', isActive: true, isArchived: false },
  { id: 'prod-olive-oil', name: 'Extra Virgin Olive Oil (Cold Pressed)', sku: 'DG-OIL-302', category: 'Dry Goods', basePrice: 160.00, taxRate: 0.0, packagingUnit: 'Tin (20 Liters)', unitsPerPackage: 20, stockingUnit: 'Liter', allergens: [], supplierId: 'sup-sysco', isActive: true, isArchived: false },
  { id: 'prod-flour', name: 'High-Gluten Unbleached Bread Flour', sku: 'DG-FLR-303', category: 'Dry Goods', basePrice: 28.00, taxRate: 0.0, packagingUnit: 'Sack (25 Kg)', unitsPerPackage: 25, stockingUnit: 'Kg', allergens: ['GL'], supplierId: 'sup-sysco', isActive: true, isArchived: false },

  // Packaging
  { id: 'prod-to-go-boxes', name: 'Eco-Friendly Kraft To-Go Boxes', sku: 'PK-BOX-401', category: 'Packaging', basePrice: 45.00, taxRate: 0.10, packagingUnit: 'Sleeve (100 Pcs)', unitsPerPackage: 100, stockingUnit: 'Piece', allergens: [], supplierId: 'sup-pack-solutions', isActive: true, isArchived: false },
  { id: 'prod-paper-bags', name: 'Kraft Takeaway Paper Bags (Medium)', sku: 'PK-BAG-402', category: 'Packaging', basePrice: 38.00, taxRate: 0.10, packagingUnit: 'Sleeve (200 Pcs)', unitsPerPackage: 200, stockingUnit: 'Piece', allergens: [], supplierId: 'sup-pack-solutions', isActive: true, isArchived: false },
];

export const INITIAL_INVENTORIES: Inventory[] = [
  // Downtown Bistro Stocks
  { id: 'inv-1', productId: 'prod-beef-ribeye', storeId: 'st-downtown', theoreticalStock: 35.5, reorderPoint: 15.0, parLevel: 45.0, storageLocation: 'Walk-in Freezer Shelf 1' },
  { id: 'inv-2', productId: 'prod-chicken-breast', storeId: 'st-downtown', theoreticalStock: 8.2, reorderPoint: 12.0, parLevel: 30.0, storageLocation: 'Walk-in Freezer Shelf 2' }, // Low stock!
  { id: 'inv-3', productId: 'prod-shrimp', storeId: 'st-downtown', theoreticalStock: 14.0, reorderPoint: 10.0, parLevel: 25.0, storageLocation: 'Seafood Freezer Drawer B' },
  { id: 'inv-4', productId: 'prod-roma-tomatoes', storeId: 'st-downtown', theoreticalStock: 22.0, reorderPoint: 8.0, parLevel: 20.0, storageLocation: 'Prep Kitchen Rack A' },
  { id: 'inv-5', productId: 'prod-romaine-lettuce', storeId: 'st-downtown', theoreticalStock: 4.0, reorderPoint: 10.0, parLevel: 24.0, storageLocation: 'Walk-in Chiller Box 3' }, // Low stock!
  { id: 'inv-6', productId: 'prod-heavy-cream', storeId: 'st-downtown', theoreticalStock: 18.0, reorderPoint: 10.0, parLevel: 24.0, storageLocation: 'Walk-in Chiller Milk Crate' },
  { id: 'inv-7', productId: 'prod-semolina-pasta', storeId: 'st-downtown', theoreticalStock: 65.0, reorderPoint: 20.0, parLevel: 80.0, storageLocation: 'Dry Pantry Row D' },
  { id: 'inv-8', productId: 'prod-olive-oil', storeId: 'st-downtown', theoreticalStock: 3.5, reorderPoint: 10.0, parLevel: 20.0, storageLocation: 'Dry Pantry Chef Corner' }, // Low stock!
  { id: 'inv-9', productId: 'prod-to-go-boxes', storeId: 'st-downtown', theoreticalStock: 420.0, reorderPoint: 200.0, parLevel: 500.0, storageLocation: 'Takeaway Storage Closet' },

  // Uptown Kitchen & Bar Stocks
  { id: 'inv-10', productId: 'prod-beef-ribeye', storeId: 'st-uptown', theoreticalStock: 28.0, reorderPoint: 15.0, parLevel: 40.0, storageLocation: 'Meat Locker' },
  { id: 'inv-11', productId: 'prod-chicken-breast', storeId: 'st-uptown', theoreticalStock: 24.5, reorderPoint: 12.0, parLevel: 30.0, storageLocation: 'Meat Locker' },
  { id: 'inv-12', productId: 'prod-roma-tomatoes', storeId: 'st-uptown', theoreticalStock: 3.2, reorderPoint: 10.0, parLevel: 25.0, storageLocation: 'Veggie Rack B' }, // Low stock!
  { id: 'inv-13', productId: 'prod-romaine-lettuce', storeId: 'st-uptown', theoreticalStock: 18.0, reorderPoint: 12.0, parLevel: 24.0, storageLocation: 'Walk-in Cooler' },
  { id: 'inv-14', productId: 'prod-heavy-cream', storeId: 'st-uptown', theoreticalStock: 25.0, reorderPoint: 10.0, parLevel: 30.0, storageLocation: 'Dairy Fridge' },
  { id: 'inv-15', productId: 'prod-olive-oil', storeId: 'st-uptown', theoreticalStock: 15.0, reorderPoint: 10.0, parLevel: 25.0, storageLocation: 'Dry Storage' },

  // Beachfront Grill Stocks
  { id: 'inv-16', productId: 'prod-shrimp', storeId: 'st-beachfront', theoreticalStock: 48.0, reorderPoint: 20.0, parLevel: 60.0, storageLocation: 'Walk-in Freezer C' },
  { id: 'inv-17', productId: 'prod-roma-tomatoes', storeId: 'st-beachfront', theoreticalStock: 15.0, reorderPoint: 8.0, parLevel: 20.0, storageLocation: 'Kitchen Counter Bin' },
  { id: 'inv-18', productId: 'prod-romaine-lettuce', storeId: 'st-beachfront', theoreticalStock: 6.0, reorderPoint: 12.0, parLevel: 30.0, storageLocation: 'Chilled Drawer 1' }, // Low stock!
  { id: 'inv-19', productId: 'prod-olive-oil', storeId: 'st-beachfront', theoreticalStock: 18.5, reorderPoint: 8.0, parLevel: 20.0, storageLocation: 'Chef Station Shelf' },
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec-ribeye-steak',
    name: 'Grilled Ribeye Steak with Herb Butter',
    yieldQty: 1,
    yieldUnit: 'Serving',
    salesPlu: 'PLU-501',
    retailPrice: 42.00,
    category: 'Mains',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    ingredients: [
      { productId: 'prod-beef-ribeye', quantity: 0.35, unit: 'Kg' }, // 350 grams
      { productId: 'prod-butter-unsalted', quantity: 0.03, unit: 'Kg' }, // 30 grams
    ],
    preparationSteps: [
      'Bring ribeye portion (350g) to room temperature for 20 minutes.',
      'Season heavily with coarse kosher salt and black pepper.',
      'Sear on a high-heat cast iron grill for 4 minutes each side (Medium-Rare).',
      'Rest for 5 minutes; top with 30g herb-infused butter slice before serving.'
    ],
    isActive: true
  },
  {
    id: 'rec-creamy-chicken-pasta',
    name: 'Creamy Tuscan Penne with Grilled Chicken',
    yieldQty: 1,
    yieldUnit: 'Serving',
    salesPlu: 'PLU-502',
    retailPrice: 24.50,
    category: 'Mains',
    imageUrl: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    ingredients: [
      { productId: 'prod-chicken-breast', quantity: 0.15, unit: 'Kg' }, // 150g chicken
      { productId: 'prod-semolina-pasta', quantity: 0.10, unit: 'Kg' }, // 100g dry penne
      { productId: 'prod-heavy-cream', quantity: 0.12, unit: 'Liter' }, // 120ml cream
      { productId: 'prod-parmesan', quantity: 0.02, unit: 'Kg' }, // 20g grated parm
      { productId: 'prod-roma-tomatoes', quantity: 0.05, unit: 'Kg' }, // 50g tomatoes
    ],
    preparationSteps: [
      'Boil penne pasta in salted water for 9 minutes (al dente).',
      'Grill chicken breast fillet seasoned with Italian herbs, then slice.',
      'In a sauté pan, heat diced tomatoes, pour heavy cream and bring to a simmer.',
      'Stir grated parmesan into cream until thick, add drained penne and chicken.',
      'Toss well, garnish with extra parmesan and parsley.'
    ],
    isActive: true
  },
  {
    id: 'rec-garlic-shrimp',
    name: 'Garlic Butter Tiger Shrimp Skewers',
    yieldQty: 1,
    yieldUnit: 'Serving',
    salesPlu: 'PLU-503',
    retailPrice: 29.00,
    category: 'Mains',
    imageUrl: 'https://images.unsplash.com/photo-1559742811-82410b510429?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    ingredients: [
      { productId: 'prod-shrimp', quantity: 0.20, unit: 'Kg' }, // 200g shrimp
      { productId: 'prod-butter-unsalted', quantity: 0.04, unit: 'Kg' }, // 40g butter
      { productId: 'prod-olive-oil', quantity: 0.015, unit: 'Liter' }, // 15ml olive oil
    ],
    preparationSteps: [
      'Skew 200g of tiger shrimp (approx 5-6 pieces).',
      'Brush skewers with olive oil and garlic paste.',
      'Grill for 2 minutes on each side until fully pink and charred.',
      'Melt unsalted butter with lemon juice and minced parsley, pour over hot skewers.'
    ],
    isActive: true
  },
  {
    id: 'rec-caesar-salad',
    name: 'Classic Caesar Salad with Shaved Parmesan',
    yieldQty: 1,
    yieldUnit: 'Serving',
    salesPlu: 'PLU-504',
    retailPrice: 16.50,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    ingredients: [
      { productId: 'prod-romaine-lettuce', quantity: 1.0, unit: 'Piece' }, // 1 head
      { productId: 'prod-parmesan', quantity: 0.03, unit: 'Kg' }, // 30g shaving
      { productId: 'prod-olive-oil', quantity: 0.02, unit: 'Liter' }, // 20ml oil in dressing
    ],
    preparationSteps: [
      'Wash and thoroughly dry Romaine lettuce heads, chop into 1-inch strips.',
      'Toss lettuce strips with dynamic emulsified Caesar dressing in large cold bowl.',
      'Platter and drape generously with shaved premium Parmesan Reggiano wheel strips.',
      'Garnish with rustic garlic croutons and cracked black pepper.'
    ],
    isActive: true
  },
  {
    id: 'rec-marinara-sauce-batch',
    name: 'House Marinara Sauce Base (20L Batch)',
    yieldQty: 20,
    yieldUnit: 'Liter',
    category: 'Sauces/Prep',
    ingredients: [
      { productId: 'prod-roma-tomatoes', quantity: 15.0, unit: 'Kg' }, // 15kg tomatoes
      { productId: 'prod-olive-oil', quantity: 1.5, unit: 'Liter' }, // 1.5L olive oil
      { productId: 'prod-yellow-onions', quantity: 2.0, unit: 'Kg' }, // 2kg onions
    ],
    preparationSteps: [
      'Sweat finely diced onions in 1.5L hot olive oil in steam kettle for 10 minutes.',
      'Add crushed Roma tomatoes, sea salt, sugar, garlic, and fresh basil.',
      'Simmer on low heat for 3 hours, blending lightly to semi-smooth texture.',
      'Chill rapidly in ice bath and log into storage containers with date stamps.'
    ],
    isActive: true
  }
];

export const INITIAL_BATCH_JOBS: BatchJob[] = [
  { id: 'bt-1001', recipeId: 'rec-marinara-sauce-batch', storeId: 'st-downtown', batchDate: '2026-07-05T09:00:00Z', quantityProduced: 20, status: 'Completed', performedBy: 'usr-2', notes: 'Slightly high acidity, balanced with 50g sugar. Beautiful texture.' },
  { id: 'bt-1002', recipeId: 'rec-marinara-sauce-batch', storeId: 'st-uptown', batchDate: '2026-07-06T10:30:00Z', quantityProduced: 20, status: 'Completed', performedBy: 'usr-3', notes: 'Excellent yield, vacuum bagged and chilled immediately.' },
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-3001',
    supplierId: 'sup-meat-masters',
    storeId: 'st-downtown',
    orderDate: '2026-07-01T14:22:00Z',
    expectedDeliveryDate: '2026-07-04T12:00:00Z',
    status: 'Delivered',
    totalAmount: 625.00,
    createdBy: 'usr-2',
    approvedBy: 'usr-1',
    items: [
      { productId: 'prod-beef-ribeye', quantityOrdered: 2, quantityReceived: 2, packageUnit: 'Box (20 Kg)', costPerPackage: 280.00, totalCost: 560.00 },
      { productId: 'prod-chicken-breast', quantityOrdered: 1, quantityReceived: 1, packageUnit: 'Box (10 Kg)', costPerPackage: 65.00, totalCost: 65.00 }
    ]
  },
  {
    id: 'po-3002',
    supplierId: 'sup-sysco',
    storeId: 'st-downtown',
    orderDate: '2026-07-05T08:15:00Z',
    expectedDeliveryDate: '2026-07-07T14:00:00Z',
    status: 'Pending Approval',
    totalAmount: 320.00,
    createdBy: 'usr-2',
    items: [
      { productId: 'prod-heavy-cream', quantityOrdered: 1, packageUnit: 'Case (12 Liters)', costPerPackage: 42.00, totalCost: 42.00 },
      { productId: 'prod-butter-unsalted', quantityOrdered: 2, packageUnit: 'Box (10 Kg)', costPerPackage: 55.00, totalCost: 110.00 },
      { productId: 'prod-olive-oil', quantityOrdered: 1, packageUnit: 'Tin (20 Liters)', costPerPackage: 160.00, totalCost: 160.00 }
    ]
  },
  {
    id: 'po-3003',
    supplierId: 'sup-produce-plus',
    storeId: 'st-uptown',
    orderDate: '2026-07-06T11:45:00Z',
    expectedDeliveryDate: '2026-07-07T08:00:00Z',
    status: 'Approved',
    totalAmount: 116.00,
    createdBy: 'usr-3',
    approvedBy: 'usr-1',
    items: [
      { productId: 'prod-roma-tomatoes', quantityOrdered: 4, packageUnit: 'Box (5 Kg)', costPerPackage: 18.50, totalCost: 74.00 },
      { productId: 'prod-romaine-lettuce', quantityOrdered: 1, packageUnit: 'Case (24 Heads)', costPerPackage: 22.00, totalCost: 22.00 },
      { productId: 'prod-yellow-onions', quantityOrdered: 1, packageUnit: 'Bag (10 Kg)', costPerPackage: 12.00, totalCost: 12.00 }
    ]
  }
];

export const INITIAL_TRANSFERS: StockTransfer[] = [
  {
    id: 'tr-4001',
    fromStoreId: 'st-beachfront',
    toStoreId: 'st-downtown',
    requestDate: '2026-07-04T10:00:00Z',
    transferDate: '2026-07-04T13:30:00Z',
    status: 'Completed',
    requestedBy: 'usr-2',
    notes: 'Urgent transfer of Tiger Shrimp for weekend dinner service',
    items: [
      { productId: 'prod-shrimp', quantity: 15.0, unit: 'Kg' }
    ]
  },
  {
    id: 'tr-4002',
    fromStoreId: 'st-uptown',
    toStoreId: 'st-downtown',
    requestDate: '2026-07-06T15:00:00Z',
    status: 'Requested',
    requestedBy: 'usr-2',
    notes: 'Requesting olive oil as Downtown is near zero stock',
    items: [
      { productId: 'prod-olive-oil', quantity: 10.0, unit: 'Liter' }
    ]
  }
];

export const INITIAL_ADJUSTMENTS: StockAdjustment[] = [
  { id: 'adj-5001', productId: 'prod-roma-tomatoes', storeId: 'st-downtown', date: '2026-07-03T16:00:00Z', quantity: -3.5, reason: 'Spoilage', costValue: -12.95, notes: 'Crushed and molded tomatoes discarded from bottom of rack A.', performedBy: 'usr-2' },
  { id: 'adj-5002', productId: 'prod-chicken-breast', storeId: 'st-uptown', date: '2026-07-04T22:30:00Z', quantity: -2.0, reason: 'Wastage', costValue: -13.00, notes: 'Dropped on kitchen floor during busy prep shift.', performedBy: 'usr-3' },
  { id: 'adj-5003', productId: 'prod-semolina-pasta', storeId: 'st-downtown', date: '2026-07-05T12:00:00Z', quantity: 1.5, reason: 'Audit Gain', costValue: 5.25, notes: 'Found unlogged extra bag in shelf C back corner.', performedBy: 'usr-2' }
];

export const INITIAL_FUTURE_PRICES: FuturePriceUpdate[] = [
  { id: 'fp-1', supplierId: 'sup-meat-masters', productId: 'prod-beef-ribeye', newBasePrice: 295.00, effectiveDate: '2026-08-01', status: 'Scheduled' },
  { id: 'fp-2', supplierId: 'sup-sysco', productId: 'prod-heavy-cream', newBasePrice: 44.50, effectiveDate: '2026-08-15', status: 'Scheduled' }
];

export const INITIAL_SALES_IMPORTS: SalesImport[] = [
  {
    id: 'si-6001',
    storeId: 'st-downtown',
    importDate: '2026-07-06T23:30:00Z',
    totalSalesValue: 1245.50,
    totalItemsCount: 54,
    status: 'Processed',
    items: [
      { plu: 'PLU-501', name: 'Grilled Ribeye Steak with Herb Butter', quantitySold: 18, unitPrice: 42.00, totalAmount: 756.00 },
      { plu: 'PLU-502', name: 'Creamy Tuscan Penne with Grilled Chicken', quantitySold: 20, unitPrice: 24.50, totalAmount: 490.00 }
    ]
  }
];

export const INITIAL_CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    id: 'ord-7001',
    storeId: 'st-downtown',
    customerName: 'Aria Montgomery',
    tableNumber: 'Table 4',
    fulfillmentType: 'Dine-In',
    status: 'Paid',
    orderDate: '2026-07-06T19:30:00Z',
    totalAmount: 108.50,
    items: [
      { recipeId: 'rec-ribeye-steak', name: 'Grilled Ribeye Steak with Herb Butter', quantity: 2, unitPrice: 42.00, modifications: ['Medium Rare', 'Extra butter'] },
      { recipeId: 'rec-caesar-salad', name: 'Classic Caesar Salad with Shaved Parmesan', quantity: 1, unitPrice: 16.50, modifications: ['Dressing on side'] }
    ]
  },
  {
    id: 'ord-7002',
    storeId: 'st-downtown',
    customerName: 'Logan Smith',
    tableNumber: 'Table 12',
    fulfillmentType: 'Dine-In',
    status: 'Preparing',
    orderDate: '2026-07-07T00:30:00-07:00', // active order!
    totalAmount: 53.50,
    items: [
      { recipeId: 'rec-creamy-chicken-pasta', name: 'Creamy Tuscan Penne with Grilled Chicken', quantity: 1, unitPrice: 24.50 },
      { recipeId: 'rec-garlic-shrimp', name: 'Garlic Butter Tiger Shrimp Skewers', quantity: 1, unitPrice: 29.00 }
    ]
  }
];

export const INITIAL_STOCKTAKE_HISTORY: StocktakeHistory[] = [
  {
    id: 'stk-8001',
    storeId: 'st-downtown',
    date: '2026-06-30T10:00:00Z',
    status: 'Reviewed',
    submittedBy: 'Marcus Brody',
    reviewedBy: 'Sarah Jenkins',
    varianceTotalValue: -43.20,
    items: [
      { productId: 'prod-chicken-breast', theoreticalQty: 10.0, actualQty: 8.5, unit: 'Kg', unitCost: 6.50, variance: -1.5, notes: 'Some trimmings discarded.' },
      { productId: 'prod-roma-tomatoes', theoreticalQty: 25.0, actualQty: 23.0, unit: 'Kg', unitCost: 3.70, variance: -2.0, notes: 'Minor rot found.' }
    ]
  }
];
