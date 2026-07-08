/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'Admin' | 'Manager' | 'Customer' | 'Supplier' | 'Staff' | 'Support Team';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId?: string; // Optional: managers are bound to specific stores
  permissions?: string[]; // Granular page permission tabs
}

export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Allergen {
  id: string;
  name: string;
  code: string; // e.g., GL, DA, NU, SH
  color: string; // Tailwind class, e.g., 'bg-red-100 text-red-800 border-red-200'
  icon: string; // Lucide icon name or emoji representation
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: 'Dry Goods' | 'Produce' | 'Protein' | 'Dairy' | 'Beverage' | 'Packaging' | 'Prepared';
  basePrice: number; // Base vendor price
  taxRate: number; // e.g., 0.10 for 10%
  packagingUnit: string; // e.g., "Box", "Case", "Bag", "Bottle", "Each"
  unitsPerPackage: number; // e.g., 12 units per case
  stockingUnit: string; // e.g., "Kg", "Liter", "Piece", "Gram"
  weightPerPackage?: number; // e.g., 5.0 kg
  allergens: string[]; // Allergen IDs
  imageUrl?: string;
  isActive: boolean;
  isArchived: boolean;
  supplierId: string;
}

export interface Inventory {
  id: string;
  productId: string;
  storeId: string;
  theoreticalStock: number; // Calculated stock
  actualStock?: number; // Verified physical count during stocktake
  lastStocktakeDate?: string;
  reorderPoint: number; // Reorder threshold
  parLevel: number; // Optimal par level
  storageLocation?: string; // e.g., "Walk-in Freezer", "Dry Shelf 2"
}

export interface StocktakeHistory {
  id: string;
  storeId: string;
  date: string;
  status: 'Draft' | 'Submitted' | 'Reviewed';
  submittedBy: string;
  reviewedBy?: string;
  varianceTotalValue: number;
  items: {
    productId: string;
    theoreticalQty: string | number;
    actualQty: string | number;
    unit: string;
    unitCost: number;
    variance: number;
    notes?: string;
  }[];
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactName: string;
  email: string;
  phone: string;
  leadTimeDays: number;
  minOrderValue: number;
  paymentTerms: string; // e.g., "Net 30"
  isActive: boolean;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  storeId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: 'Pending Approval' | 'Approved' | 'Sent' | 'Delivered' | 'Returned' | 'Rejected';
  totalAmount: number;
  createdBy: string;
  approvedBy?: string;
  items: {
    productId: string;
    quantityOrdered: number; // In packages
    quantityReceived?: number; // In packages
    quantityReturned?: number; // In packages
    packageUnit: string;
    costPerPackage: number;
    totalCost: number;
  }[];
}

export interface RecipeIngredient {
  productId: string; // Raw ingredient product
  quantity: number; // Quantity in product's stocking unit
  unit: string; // stocking unit (e.g., "Gram", "Liter")
}

export interface Recipe {
  id: string;
  name: string;
  yieldQty: number; // e.g., 10 servings, or 5 liters
  yieldUnit: string; // e.g., "Servings", "Liters", "Portions"
  salesPlu?: string; // Links to POS Item (Menu PLU)
  retailPrice?: number; // Menu sales price
  ingredients: RecipeIngredient[];
  preparationSteps?: string[];
  category: 'Starters' | 'Mains' | 'Desserts' | 'Beverages' | 'Sauces/Prep';
  imageUrl?: string;
  isActive: boolean;
}

export interface BatchJob {
  id: string;
  recipeId: string; // Prepared item recipe
  storeId: string;
  batchDate: string;
  quantityProduced: number; // in yieldUnit
  status: 'Processing' | 'Completed' | 'Failed';
  performedBy: string;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  fromStoreId: string;
  toStoreId: string;
  requestDate: string;
  transferDate?: string;
  status: 'Requested' | 'In Transit' | 'Completed' | 'Cancelled';
  items: {
    productId: string;
    quantity: number; // in stocking unit
    unit: string;
  }[];
  notes?: string;
  requestedBy: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  storeId: string;
  date: string;
  quantity: number; // in stocking unit (negative for waste/loss, positive for audit gains)
  reason: 'Wastage' | 'Spoilage' | 'Theft' | 'Audit Gain' | 'Audit Loss' | 'Recipe Outward';
  costValue: number;
  notes?: string;
  performedBy: string;
}

export interface SalesImport {
  id: string;
  storeId: string;
  importDate: string;
  totalSalesValue: number;
  totalItemsCount: number;
  status: 'Processed' | 'Failed';
  items: {
    plu: string;
    name: string;
    quantitySold: number;
    unitPrice: number;
    totalAmount: number;
  }[];
}

export interface FuturePriceUpdate {
  id: string;
  supplierId: string;
  productId: string;
  newBasePrice: number;
  effectiveDate: string;
  status: 'Scheduled' | 'Applied' | 'Cancelled';
}

// Customer FOH Orders
export interface CustomerOrder {
  id: string;
  storeId: string;
  customerName: string;
  tableNumber?: string;
  fulfillmentType: 'Dine-In' | 'Takeaway' | 'Delivery';
  status: 'Received' | 'Preparing' | 'Ready' | 'Delivered' | 'Paid';
  orderDate: string;
  totalAmount: number;
  items: {
    recipeId?: string;
    productId?: string; // If ordering direct single product (e.g. beverage)
    name: string;
    quantity: number;
    unitPrice: number;
    modifications?: string[];
  }[];
}
