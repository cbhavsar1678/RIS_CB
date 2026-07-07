/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SchemaTableColumn {
  name: string;
  type: string;
  constraints?: string;
  description: string;
}

export interface SchemaTable {
  name: string;
  description: string;
  columns: SchemaTableColumn[];
}

export const DB_SCHEMA_METADATA: SchemaTable[] = [
  {
    name: "users",
    description: "Enterprise user accounts supporting Roles-Based Access Control (RBAC).",
    columns: [
      { name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()", description: "Unique identifier for the user." },
      { name: "email", type: "VARCHAR(255)", constraints: "UNIQUE NOT NULL", description: "Used for login and notifications." },
      { name: "password_hash", type: "VARCHAR(255)", constraints: "NOT NULL", description: "Bcrypt or Argon2 secure hash." },
      { name: "full_name", type: "VARCHAR(255)", constraints: "NOT NULL", description: "User's display and signature name." },
      { name: "role", type: "VARCHAR(50)", constraints: "NOT NULL CHECK (role IN ('Admin', 'Manager', 'Customer', 'Supplier'))", description: "Access level configuration." },
      { name: "store_id", type: "UUID", constraints: "REFERENCES stores(id) ON DELETE SET NULL", description: "Binds managers to specific locations." },
      { name: "is_active", type: "BOOLEAN", constraints: "DEFAULT TRUE", description: "Soft activation toggle." },
      { name: "created_at", type: "TIMESTAMP", constraints: "DEFAULT CURRENT_TIMESTAMP", description: "Audit creation date." }
    ]
  },
  {
    name: "stores",
    description: "Locations/Warehouses supporting multi-store inventory routing and costing.",
    columns: [
      { name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()", description: "Unique store identifier." },
      { name: "name", type: "VARCHAR(100)", constraints: "NOT NULL", description: "Name of the restaurant outlet (e.g. Downtown, Uptown)." },
      { name: "code", type: "VARCHAR(20)", constraints: "UNIQUE NOT NULL", description: "Compact store locator code (e.g., ST-DWTN)." },
      { name: "address", type: "TEXT", constraints: "NOT NULL", description: "Physical location coordinates/street address." },
      { name: "phone", type: "VARCHAR(20)", constraints: "", description: "Store point of contact phone." },
      { name: "is_active", type: "BOOLEAN", constraints: "DEFAULT TRUE", description: "Active status for stock routing." }
    ]
  },
  {
    name: "suppliers",
    description: "External supply vendors, contracted minimum order constraints, and lead times.",
    columns: [
      { name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()", description: "Unique supplier identifier." },
      { name: "name", type: "VARCHAR(150)", constraints: "NOT NULL", description: "Corporate or local vendor name (e.g., Sysco Foods)." },
      { name: "code", type: "VARCHAR(20)", constraints: "UNIQUE NOT NULL", description: "Vendor code for ERP integration (e.g., VEND-SYSCO)." },
      { name: "contact_name", type: "VARCHAR(100)", constraints: "", description: "Primary account representative." },
      { name: "email", type: "VARCHAR(255)", constraints: "NOT NULL", description: "Purchase order routing email." },
      { name: "phone", type: "VARCHAR(20)", constraints: "", description: "Vendor hotline/support phone." },
      { name: "lead_time_days", type: "INTEGER", constraints: "DEFAULT 1", description: "Contracted duration from order dispatch to delivery." },
      { name: "min_order_value", type: "DECIMAL(10,2)", constraints: "DEFAULT 0.00", description: "Minimum cash threshold for PO fulfillment." },
      { name: "payment_terms", type: "VARCHAR(50)", constraints: "DEFAULT 'Net 30'", description: "Financial aging criteria (Net 30, Net 15, COD)." }
    ]
  },
  {
    name: "products",
    description: "Master catalogs of raw materials, proteins, dry goods, and packaging items.",
    columns: [
      { name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()", description: "Master Product unique identifier." },
      { name: "name", type: "VARCHAR(255)", constraints: "NOT NULL", description: "Ingredient/item descriptor (e.g., Prime Ribeye beef)." },
      { name: "sku", type: "VARCHAR(50)", constraints: "UNIQUE NOT NULL", description: "Universal stock keeping barcode/code." },
      { name: "category", type: "VARCHAR(50)", constraints: "NOT NULL CHECK (category IN ('Dry Goods', 'Produce', 'Protein', 'Dairy', 'Beverage', 'Packaging', 'Prepared'))", description: "General catalog classification." },
      { name: "base_price", type: "DECIMAL(10,4)", constraints: "NOT NULL", description: "Master base cost per package unit from preferred supplier." },
      { name: "tax_rate", type: "DECIMAL(5,4)", constraints: "DEFAULT 0.00", description: "Applicable input tax percentage." },
      { name: "packaging_unit", type: "VARCHAR(50)", constraints: "NOT NULL", description: "How the item arrives (e.g., 'Box', 'Case of 12', 'Bag')." },
      { name: "units_per_package", type: "DECIMAL(10,3)", constraints: "NOT NULL DEFAULT 1.0", description: "Yield multiplier translating packaging into internal stock units." },
      { name: "stocking_unit", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Internal counting/recipe unit (e.g., 'Kg', 'Liter', 'Piece')." },
      { name: "allergens", type: "VARCHAR(50)[]", description: "Array of allergen codes (e.g. {'DA', 'GL', 'NU'})." },
      { name: "image_url", type: "TEXT", description: "Storage pathway for attachment images." },
      { name: "supplier_id", type: "UUID", constraints: "REFERENCES suppliers(id) ON DELETE RESTRICT", description: "Preferred sourcing vendor." },
      { name: "is_active", type: "BOOLEAN", constraints: "DEFAULT TRUE", description: "Active in ordering catalog." },
      { name: "is_archived", type: "BOOLEAN", constraints: "DEFAULT FALSE", description: "Soft-delete flag." }
    ]
  },
  {
    name: "inventories",
    description: "Per-store physical, theoretical, and par inventory states.",
    columns: [
      { name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()", description: "Location SKU identifier." },
      { name: "product_id", type: "UUID", constraints: "REFERENCES products(id) ON DELETE CASCADE", description: "Linked master product." },
      { name: "store_id", type: "UUID", constraints: "REFERENCES stores(id) ON DELETE CASCADE", description: "Linked physical outlet." },
      { name: "theoretical_stock", type: "DECIMAL(12,4)", constraints: "NOT NULL DEFAULT 0.0000", description: "System tracked quantity in stocking units." },
      { name: "reorder_point", type: "DECIMAL(12,4)", constraints: "NOT NULL DEFAULT 0.0000", description: "Min warning flag threshold." },
      { name: "par_level", type: "DECIMAL(12,4)", constraints: "NOT NULL DEFAULT 0.0000", description: "Optimal stock target." },
      { name: "storage_location", type: "VARCHAR(100)", description: "Visual position label (e.g., Shelf C, Freezer Room)." },
      { name: "last_stocktake_date", type: "TIMESTAMP", description: "Last count audit timestamp." }
    ]
  },
  {
    name: "recipes",
    description: "Formulas and specifications to compute cost yields and PLU menu links.",
    columns: [
      { name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()", description: "Recipe unique identifier." },
      { name: "name", type: "VARCHAR(255)", constraints: "NOT NULL", description: "Dish or sub-prep item title (e.g., Marinara Sauce)." },
      { name: "yield_qty", type: "DECIMAL(10,2)", constraints: "NOT NULL", description: "Produced yield amount (e.g., 5.0)." },
      { name: "yield_unit", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Yield unit (e.g., 'Liters', 'Portions')." },
      { name: "sales_plu", type: "VARCHAR(50)", constraints: "UNIQUE", description: "POS Sales SKU linking (Price Look-Up)." },
      { name: "retail_price", type: "DECIMAL(10,2)", description: "Customer-facing menu sales cost." },
      { name: "category", type: "VARCHAR(50)", constraints: "CHECK (category IN ('Starters', 'Mains', 'Desserts', 'Beverages', 'Sauces/Prep'))", description: "Menu/Preparation segment classification." },
      { name: "preparation_steps", type: "TEXT[]", description: "Step-by-step culinary operations." },
      { name: "is_active", type: "BOOLEAN", constraints: "DEFAULT TRUE", description: "Availability toggle." }
    ]
  },
  {
    name: "recipe_ingredients",
    description: "Component line-items linking raw products to specific recipe structures.",
    columns: [
      { name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()", description: "Line item ID." },
      { name: "recipe_id", type: "UUID", constraints: "REFERENCES recipes(id) ON DELETE CASCADE", description: "Parent recipe." },
      { name: "product_id", type: "UUID", constraints: "REFERENCES products(id) ON DELETE RESTRICT", description: "Component raw product SKU." },
      { name: "quantity", type: "DECIMAL(12,4)", constraints: "NOT NULL", description: "Used quantity in raw stocking_unit." }
    ]
  },
  {
    name: "purchase_orders",
    description: "B2B Procurement orders sent to suppliers containing status matrices.",
    columns: [
      { name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()", description: "Purchase Order code." },
      { name: "supplier_id", type: "UUID", constraints: "REFERENCES suppliers(id) ON DELETE RESTRICT", description: "Target vendor." },
      { name: "store_id", type: "UUID", constraints: "REFERENCES stores(id) ON DELETE RESTRICT", description: "Destination location." },
      { name: "order_date", type: "TIMESTAMP", constraints: "DEFAULT CURRENT_TIMESTAMP", description: "Release date." },
      { name: "expected_delivery_date", type: "TIMESTAMP", description: "SLA delivery expectations." },
      { name: "status", type: "VARCHAR(50)", constraints: "NOT NULL CHECK (status IN ('Pending Approval', 'Approved', 'Sent', 'Delivered', 'Returned', 'Rejected'))", description: "Order progression lifecycle state." },
      { name: "total_amount", type: "DECIMAL(12,2)", constraints: "DEFAULT 0.00", description: "Sum total validation." },
      { name: "created_by", type: "UUID", constraints: "REFERENCES users(id)", description: "Originating agent." },
      { name: "approved_by", type: "UUID", constraints: "REFERENCES users(id)", description: "Validating agent." }
    ]
  }
];

export const SQL_SCHEMA_STRING = `-- ==========================================
-- ENTERPRISE RESTAURANT INVENTORY & ERP DATABASE SCHEMA
-- DIALECT: PostgreSQL 15+
-- FEATURES: Multi-store isolation, real-time COGS tracking tables,
--           Allergen mappings, Batching logic, POS PLU linkages.
-- ==========================================

-- Enable modern extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. STORES TABLE
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Manager', 'Customer', 'Supplier')),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SUPPLIERS TABLE
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    lead_time_days INT NOT NULL DEFAULT 1 CHECK (lead_time_days >= 0),
    min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (min_order_value >= 0),
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. MASTER PRODUCTS TABLE (Raw SKU Catalogue)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Dry Goods', 'Produce', 'Protein', 'Dairy', 'Beverage', 'Packaging', 'Prepared')),
    base_price DECIMAL(10,4) NOT NULL CHECK (base_price >= 0),
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000 CHECK (tax_rate >= 0),
    packaging_unit VARCHAR(50) NOT NULL, -- e.g. "Case of 12 Bottles", "20kg Box"
    units_per_package DECIMAL(10,3) NOT NULL DEFAULT 1.000 CHECK (units_per_package > 0),
    stocking_unit VARCHAR(50) NOT NULL, -- e.g. "Liter", "Kg", "Piece"
    allergens VARCHAR(50)[] DEFAULT '{}', -- e.g. {'DA', 'GL', 'NU'}
    image_url TEXT,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. LOCATION-SPECIFIC INVENTORIES (Theoretical Stock ledger)
CREATE TABLE inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    theoretical_stock DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    reorder_point DECIMAL(12,4) NOT NULL DEFAULT 0.0000 CHECK (reorder_point >= 0),
    par_level DECIMAL(12,4) NOT NULL DEFAULT 0.0000 CHECK (par_level >= 0),
    storage_location VARCHAR(100), -- e.g. "Cold Room 2, Row A"
    last_stocktake_date TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_store_product UNIQUE (store_id, product_id)
);

-- 6. RECIPES TABLE
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    yield_qty DECIMAL(10,2) NOT NULL CHECK (yield_qty > 0),
    yield_unit VARCHAR(50) NOT NULL, -- e.g. "Servings", "Liters", "Portions"
    sales_plu VARCHAR(50) UNIQUE, -- Map directly to POS Item lookup identifier
    retail_price DECIMAL(10,2) CHECK (retail_price >= 0),
    category VARCHAR(50) NOT NULL CHECK (category IN ('Starters', 'Mains', 'Desserts', 'Beverages', 'Sauces/Prep')),
    preparation_steps TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. RECIPE INGREDIENTS TABLE (Relational composition link)
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(12,4) NOT NULL CHECK (quantity > 0), -- Measured in product's stocking_unit
    CONSTRAINT unique_recipe_ingredient UNIQUE (recipe_id, product_id)
);

-- 8. PURCHASE ORDERS
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Pending Approval', 'Approved', 'Sent', 'Delivered', 'Returned', 'Rejected')),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id)
);

-- 9. PURCHASE ORDER LINE ITEMS
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_ordered DECIMAL(10,2) NOT NULL CHECK (quantity_ordered > 0),
    quantity_received DECIMAL(10,2) DEFAULT 0.00,
    quantity_returned DECIMAL(10,2) DEFAULT 0.00,
    package_unit VARCHAR(50) NOT NULL,
    cost_per_package DECIMAL(10,4) NOT NULL CHECK (cost_per_package >= 0),
    total_cost DECIMAL(12,2) NOT NULL CHECK (total_cost >= 0)
);

-- 10. BATCH PROCESSING JOBS (Pre-assembly production)
CREATE TABLE batch_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    batch_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    quantity_produced DECIMAL(10,2) NOT NULL CHECK (quantity_produced > 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Processing', 'Completed', 'Failed')),
    performed_by UUID REFERENCES users(id),
    notes TEXT
);

-- 11. INTER-STORE TRANSFERS
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    to_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transfer_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Requested', 'In Transit', 'Completed', 'Cancelled')),
    notes TEXT,
    requested_by UUID REFERENCES users(id)
);

CREATE TABLE stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(12,4) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL
);

-- 12. INVENTORY ADJUSTMENTS (Spoilage, Theft, Wastage ledger)
CREATE TABLE stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    quantity DECIMAL(12,4) NOT NULL, -- Negative for depletions, positive for audits
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('Wastage', 'Spoilage', 'Theft', 'Audit Gain', 'Audit Loss', 'Recipe Outward')),
    cost_value DECIMAL(12,2) NOT NULL,
    notes TEXT,
    performed_by UUID REFERENCES users(id)
);

-- 13. REAL-TIME INDEXING FOR EXPEDITED QUERIES
CREATE INDEX idx_inventories_store_product ON inventories(store_id, product_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_stock_adjustments_product_store ON stock_adjustments(product_id, store_id);

-- 14. INVENTORY STOCK DEPLETION AUTOMATION (TRIGGER EXAMPLE)
-- Subtracts stock levels automatically when a batch processing event completes
CREATE OR REPLACE FUNCTION process_batch_stock_depletion()
RETURNS TRIGGER AS $$
DECLARE
    ing RECORD;
    v_theoretical DECIMAL(12,4);
BEGIN
    IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status <> 'Completed') THEN
        -- Loop ingredients for the batch recipe
        FOR ing IN 
            SELECT product_id, quantity 
            FROM recipe_ingredients 
            WHERE recipe_id = NEW.recipe_id
        LOOP
            -- Calculate absolute amount consumed
            -- Ingredient quantity is per 1 yield_qty of recipe
            -- Consume = (Batch quantity produced / Recipe yield_qty) * Ingredient quantity
            UPDATE inventories
            SET theoretical_stock = theoretical_stock - ((NEW.quantity_produced / (SELECT yield_qty FROM recipes WHERE id = NEW.recipe_id)) * ing.quantity)
            WHERE store_id = NEW.store_id AND product_id = ing.product_id;
            
            -- Log corresponding stock adjustment for traceability
            INSERT INTO stock_adjustments (product_id, store_id, quantity, reason, cost_value, notes, performed_by)
            VALUES (
                ing.product_id, 
                NEW.store_id, 
                -((NEW.quantity_produced / (SELECT yield_qty FROM recipes WHERE id = NEW.recipe_id)) * ing.quantity),
                'Recipe Outward',
                -((NEW.quantity_produced / (SELECT yield_qty FROM recipes WHERE id = NEW.recipe_id)) * ing.quantity) * (SELECT base_price FROM products WHERE id = ing.product_id),
                'Automated batch depletion for Job ' || NEW.id,
                NEW.performed_by
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_batch_completed_depletion
    AFTER UPDATE ON batch_jobs
    FOR EACH ROW
    WHEN (NEW.status = 'Completed')
    EXECUTE FUNCTION process_batch_stock_depletion();
`;
