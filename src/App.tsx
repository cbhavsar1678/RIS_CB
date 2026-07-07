/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_STORES, 
  INITIAL_INVENTORIES, 
  INITIAL_RECIPES, 
  INITIAL_PURCHASE_ORDERS, 
  INITIAL_BATCH_JOBS, 
  INITIAL_TRANSFERS, 
  INITIAL_ADJUSTMENTS, 
  INITIAL_STOCKTAKE_HISTORY, 
  INITIAL_SUPPLIERS 
} from './data/mockData';

import { Store, Product, Inventory, Recipe, PurchaseOrder, BatchJob, StockTransfer, StockAdjustment, StocktakeHistory, Supplier, CustomerOrder } from './types';

// Components
import { CustomerPanel } from './components/CustomerPanel';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminProducts } from './components/admin/AdminProducts';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminRecipes } from './components/admin/AdminRecipes';
import { AdminStockLogs } from './components/admin/AdminStockLogs';
import { AdminStockControl } from './components/admin/AdminStockControl';
import { AdminSalesIntegrations } from './components/admin/AdminSalesIntegrations';
import { AdminSupport } from './components/admin/AdminSupport';

// Icons
import { LayoutDashboard, Package, ShoppingCart, ChefHat, ArrowLeftRight, ClipboardList, Zap, Settings, ShieldAlert } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'admin' | 'customer'>('admin');
  const [activeAdminTab, setActiveAdminTab] = useState<string>('dashboard');

  // Master State variables
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [inventories, setInventories] = useState<Inventory[]>(INITIAL_INVENTORIES);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>(INITIAL_BATCH_JOBS);
  const [transfers, setTransfers] = useState<StockTransfer[]>(INITIAL_TRANSFERS);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(INITIAL_ADJUSTMENTS);
  const [stocktakeHistory, setStocktakeHistory] = useState<StocktakeHistory[]>(INITIAL_STOCKTAKE_HISTORY);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);

  // Selection filter ids
  const [adminStoreId, setAdminStoreId] = useState<string>('All');
  const [customerStoreId, setCustomerStoreId] = useState<string>(INITIAL_STORES[0]?.id || 'store-dt');

  // Reset database states to initial mock patterns
  const handleResetDatabaseState = () => {
    setProducts(INITIAL_PRODUCTS);
    setStores(INITIAL_STORES);
    setInventories(INITIAL_INVENTORIES);
    setRecipes(INITIAL_RECIPES);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setBatchJobs(INITIAL_BATCH_JOBS);
    setTransfers(INITIAL_TRANSFERS);
    setAdjustments(INITIAL_ADJUSTMENTS);
    setStocktakeHistory(INITIAL_STOCKTAKE_HISTORY);
    setSuppliers(INITIAL_SUPPLIERS);
    setCustomerOrders([]);
  };

  // Add tableside Customer order dispatch in state & automatically update theoretical stocks in backend storage!
  const handlePlaceCustomerOrder = (newOrder: CustomerOrder) => {
    setCustomerOrders((prev) => [newOrder, ...prev]);

    // Automatically trigger theoretical inventory depletion based on menu recipes compositions!
    setInventories((prev) =>
      prev.map((inv) => {
        if (inv.storeId !== newOrder.storeId) return inv;

        // Loop items, find matching recipe, sum raw usage
        let totalDeduction = 0;
        newOrder.items.forEach((item) => {
          const recipe = recipes.find((r) => r.id === item.recipeId);
          if (!recipe) return;

          const ingredientLine = recipe.ingredients.find((ing) => ing.productId === inv.productId);
          if (ingredientLine) {
            // formula: (quantity ordered / recipe yield_qty) * ingredient composition raw quantity
            totalDeduction += (item.quantity / recipe.yieldQty) * ingredientLine.quantity;
          }
        });

        return {
          ...inv,
          theoreticalStock: Math.max(0, inv.theoreticalStock - totalDeduction),
        };
      })
    );

    // Automatically log depletions inside adjustments tracker logs
    const newAdjs: StockAdjustment[] = [];
    newOrder.items.forEach((item) => {
      const recipe = recipes.find((r) => r.id === item.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach((ing) => {
        const prod = products.find((p) => p.id === ing.productId)!;
        const totalDeduction = (item.quantity / recipe.yieldQty) * ing.quantity;
        const unitCost = prod.basePrice / prod.unitsPerPackage;

        newAdjs.push({
          id: `adj-foh-${newOrder.id}-${ing.productId}`,
          productId: ing.productId,
          storeId: newOrder.storeId,
          date: new Date().toISOString(),
          quantity: -totalDeduction,
          reason: 'Recipe Outward',
          costValue: -(totalDeduction * unitCost),
          notes: `Automated tableside customer sale depletion for ${item.name} (x${item.quantity})`,
          performedBy: 'FOH Ingestion Service',
        });
      });
    });

    setAdjustments((prev) => [...newAdjs, ...prev]);
  };

  // Switch tableside order state (manager preparing / serving simulation)
  const handleModifyCustomerOrderStatus = (orderId: string, status: CustomerOrder['status']) => {
    setCustomerOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col text-slate-800 dark:text-slate-100">
      
      {/* PERSISTENT DEMO NAVIGATION TOP BAR (Dual-view switcher) */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between z-50 text-xs shadow-md border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span className="font-extrabold tracking-tight uppercase">RestoERP Back-Of-House & FOH Hub</span>
        </div>

        <div className="flex gap-2">
          <button
            id="btn-switch-to-admin"
            onClick={() => setViewMode('admin')}
            className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
              viewMode === 'admin' 
                ? 'bg-[#3b82f6] text-white' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white'
            }`}
          >
            🏢 ERP Back-Of-House Panel
          </button>
          <button
            id="btn-switch-to-customer"
            onClick={() => setViewMode('customer')}
            className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
              viewMode === 'customer' 
                ? 'bg-[#3b82f6] text-white' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white'
            }`}
          >
            🍳 Customer Web Order Terminal
          </button>
        </div>
      </div>

      {/* RENDER CUSTOMER WEB PANEL SCREEN */}
      {viewMode === 'customer' && (
        <CustomerPanel
          stores={stores}
          recipes={recipes}
          products={products}
          currentStoreId={customerStoreId}
          setCurrentStoreId={setCustomerStoreId}
          customerOrders={customerOrders}
          onPlaceOrder={handlePlaceCustomerOrder}
        />
      )}

      {/* RENDER MANAGER ERP BACK-OF-HOUSE PANEL */}
      {viewMode === 'admin' && (
        <div className="flex-1 flex flex-col lg:flex-row">
          
          {/* RESPONSIVE CONTROL PANEL SIDEBAR */}
          <aside className="w-full lg:w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 p-5 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-extrabold shadow-sm">
                R
              </div>
              <div>
                <h2 className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-white leading-tight">RestoERP</h2>
                <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">BENTO CONTROL</span>
              </div>
            </div>

            {/* Nav list */}
            <nav className="flex-1 flex flex-col gap-1.5">
              {[
                { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
                { id: 'products', label: 'Products & Wizard', icon: Package },
                { id: 'orders', label: 'Procure Orders', icon: ShoppingCart },
                { id: 'recipes', label: 'Recipes & Manufacturing', icon: ChefHat },
                { id: 'logistics', label: 'Logistics Transfers', icon: ArrowLeftRight },
                { id: 'stocks', label: 'Stock & Schema', icon: ClipboardList },
                { id: 'sales', label: 'Sales & POS Link', icon: Zap },
                { id: 'support', label: 'Support & Settings', icon: Settings }
              ].map((item) => {
                const Icon = item.icon;
                const active = activeAdminTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`btn-sidebar-nav-${item.id}`}
                    onClick={() => setActiveAdminTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      active
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md shadow-gray-950/10'
                        : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-850'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick action: Simulated incoming tableside customer orders queue in sidebar */}
            {customerOrders.length > 0 && (
              <div className="border-t pt-4">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Live FOH order feed</span>
                <div className="space-y-2">
                  {customerOrders.slice(0, 2).map((order) => (
                    <div key={order.id} className="p-2.5 rounded-xl bg-orange-50/40 border border-orange-100 text-[11px]">
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>#{order.id.replace('ord-cust-', '')} - {order.customerName}</span>
                        <span>${order.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{order.fulfillmentType} ({order.tableNumber || 'Takeaway'})</div>
                      
                      {/* State trigger buttons */}
                      <div className="flex gap-1.5 mt-2">
                        {order.status === 'Received' && (
                          <button
                            id={`btn-prepare-order-${order.id}`}
                            onClick={() => handleModifyCustomerOrderStatus(order.id, 'Preparing')}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2 py-0.5 rounded text-[9px] cursor-pointer"
                          >
                            Prepare dish
                          </button>
                        )}
                        {order.status === 'Preparing' && (
                          <button
                            id={`btn-ready-order-${order.id}`}
                            onClick={() => handleModifyCustomerOrderStatus(order.id, 'Ready')}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-2 py-0.5 rounded text-[9px] cursor-pointer"
                          >
                            Set Ready
                          </button>
                        )}
                        {order.status === 'Ready' && (
                          <button
                            id={`btn-dispatch-order-${order.id}`}
                            onClick={() => handleModifyCustomerOrderStatus(order.id, 'Paid')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[9px] cursor-pointer"
                          >
                            Dispatch FOH
                          </button>
                        )}
                        {order.status === 'Paid' && (
                          <span className="text-emerald-600 font-extrabold text-[9px]">Delivered & Served!</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* MAIN ADMINISTRATIVE CONTENT ARENA */}
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {activeAdminTab === 'dashboard' && (
              <AdminDashboard
                stores={stores}
                products={products}
                inventories={inventories}
                purchaseOrders={purchaseOrders}
                transfers={transfers}
                adjustments={adjustments}
                currentStoreId={adminStoreId}
                setCurrentStoreId={setAdminStoreId}
                onNavigateToTab={setActiveAdminTab}
              />
            )}

            {activeAdminTab === 'products' && (
              <AdminProducts
                products={products}
                setProducts={setProducts}
                inventories={inventories}
                setInventories={setInventories}
                stores={stores}
                suppliers={suppliers}
              />
            )}

            {activeAdminTab === 'orders' && (
              <AdminOrders
                purchaseOrders={purchaseOrders}
                setPurchaseOrders={setPurchaseOrders}
                suppliers={suppliers}
                products={products}
                stores={stores}
                setInventories={setInventories}
              />
            )}

            {activeAdminTab === 'recipes' && (
              <AdminRecipes
                recipes={recipes}
                setRecipes={setRecipes}
                products={products}
                stores={stores}
                inventories={inventories}
                setInventories={setInventories}
                batchJobs={batchJobs}
                setBatchJobs={setBatchJobs}
                adjustments={adjustments}
                setAdjustments={setAdjustments}
              />
            )}

            {activeAdminTab === 'logistics' && (
              <AdminStockLogs
                transfers={transfers}
                setTransfers={setTransfers}
                adjustments={adjustments}
                setAdjustments={setAdjustments}
                suppliers={suppliers}
                setSuppliers={setSuppliers}
                stores={stores}
                products={products}
                setInventories={setInventories}
              />
            )}

            {activeAdminTab === 'stocks' && (
              <AdminStockControl
                products={products}
                stores={stores}
                inventories={inventories}
                setInventories={setInventories}
                stocktakeHistory={stocktakeHistory}
                setStocktakeHistory={setStocktakeHistory}
              />
            )}

            {activeAdminTab === 'sales' && (
              <AdminSalesIntegrations
                products={products}
                recipes={recipes}
                stores={stores}
                inventories={inventories}
                setInventories={setInventories}
                adjustments={adjustments}
                setAdjustments={setAdjustments}
              />
            )}

            {activeAdminTab === 'support' && (
              <AdminSupport
                onResetDatabaseState={handleResetDatabaseState}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
