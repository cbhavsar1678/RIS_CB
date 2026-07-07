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
  INITIAL_SUPPLIERS,
  INITIAL_USERS
} from './data/mockData';

import { Store, Product, Inventory, Recipe, PurchaseOrder, BatchJob, StockTransfer, StockAdjustment, StocktakeHistory, Supplier, CustomerOrder, User } from './types';

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
import { AdminSuppliers } from './components/admin/AdminSuppliers';
import { AdminEvents } from './components/admin/AdminEvents';
import { AdminLocations } from './components/admin/AdminLocations';
import { AdminWastage } from './components/admin/AdminWastage';

// Icons
import { LayoutDashboard, Package, ShoppingCart, ChefHat, ArrowLeftRight, ClipboardList, Zap, Settings, ShieldAlert, Truck, Calendar, MapPin, Menu, X, Trash2, Sparkles, MessageSquare } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'admin' | 'customer'>('admin');
  const [activeAdminTab, setActiveAdminTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Floating BOH AI Co-Pilot states
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotHistory, setCopilotHistory] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([
    {
      sender: 'assistant',
      text: 'Hello, Chef! I am your real-time RestoAI Back-Of-House Co-Pilot. I have active telemetry links to your products, wastage logs, and store location coordinates. Ask me anything about stock optimization, spoilage, or scheduling plans! 🚀'
    }
  ]);
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);

  const handleSendCopilotMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const userText = copilotInput.trim();
    const updatedHistory = [...copilotHistory, { sender: 'user' as const, text: userText }];
    setCopilotHistory(updatedHistory);
    setCopilotInput('');
    setIsCopilotTyping(true);

    // Dynamic operational BOH context grounded directly in active states
    const context = {
      stores,
      productsCount: products.length,
      lowStockItems: products.filter(p => {
        const invs = inventories.filter(i => i.productId === p.id);
        const totalStock = invs.reduce((s, iv) => s + iv.theoreticalStock, 0);
        return totalStock <= p.targetStockLevel;
      }).map(p => p.name),
      totalAssetValue: inventories.reduce((sum, inv) => {
        const p = products.find(prod => prod.id === inv.productId);
        const cost = p ? p.basePrice / p.unitsPerPackage : 1;
        return sum + (inv.theoreticalStock * cost);
      }, 0),
      recentWastage: adjustments.filter(a => ['Wastage', 'Spoilage', 'Theft'].includes(a.reason)).slice(0, 3).map(a => ({
        product: products.find(p => p.id === a.productId)?.name || 'Perishable',
        qty: Math.abs(a.quantity),
        reason: a.reason
      })),
      upcomingEvents: [
        { name: "Taylor Swift Concert", day: "Friday", staffMultiplier: "1.4x" },
        { name: "Downtown Farmers Market", day: "Saturday", staffMultiplier: "1.25x" }
      ]
    };

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          message: userText,
          messageHistory: updatedHistory
        })
      });

      if (!response.ok) throw new Error('Copilot gateway error');
      const data = await response.json();
      setCopilotHistory(prev => [...prev, { sender: 'assistant' as const, text: data.reply || 'Let me process that ledger item for you! 👍' }]);
    } catch (err) {
      console.error(err);
      setCopilotHistory(prev => [...prev, { sender: 'assistant' as const, text: `[FALLBACK OFFICE COUNSEL] Scanning offline records... To safeguard margins:\n1. Initiate a stock transfer for milk from Westside.\n2. Prep Caesar Salad specials to resolve Romaine excess.\n3. Complete the pending reorder order for US Foods!` }]);
    } finally {
      setIsCopilotTyping(false);
    }
  };

  // Local Internet Connectivity states
  const [networkMode, setNetworkMode] = useState<'online' | 'low-bandwidth' | 'offline'>('online');
  const [offlineSyncCount, setOfflineSyncCount] = useState<number>(2);
  const [isAutoNetwork, setIsAutoNetwork] = useState<boolean>(true);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncQueue, setSyncQueue] = useState<{ id: string; action: string; timestamp: string; status: 'Pending' | 'Synced' }[]>([
    { id: 'tx-101', action: 'Wastage Adjustment: 5.0L Whole Milk (Downtown)', timestamp: new Date(Date.now() - 45000).toLocaleTimeString(), status: 'Pending' },
    { id: 'tx-102', action: 'Stocktake Audit: Chiller #2 Ribeye Count (Westside)', timestamp: new Date(Date.now() - 30000).toLocaleTimeString(), status: 'Pending' },
    { id: 'tx-103', action: 'Purchase Order Dispatch: US Foods PO-402', timestamp: new Date(Date.now() - 15000).toLocaleTimeString(), status: 'Synced' },
  ]);

  // Auto-detect Network Connectivity
  React.useEffect(() => {
    if (!isAutoNetwork) return;

    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        setNetworkMode('offline');
        setOfflineSyncCount(prev => prev > 0 ? prev : 3);
      } else {
        const conn = (navigator as any).connection;
        if (conn && ['2g', '3g'].includes(conn.effectiveType)) {
          setNetworkMode('low-bandwidth');
        } else {
          setNetworkMode('online');
          setOfflineSyncCount(0);
        }
      }
    };

    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (conn) {
        conn.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [isAutoNetwork]);

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

  // User and branding states
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [restaurantDetails, setRestaurantDetails] = useState({
    name: 'Bento & Skillet Bistro',
    logoEmoji: '🍳',
    cuisine: 'Modern American & Italian',
    phone: '555-0192',
    email: 'hello@bentoskilletbistro.com',
    address: '456 Main Street, Financial District, NY 10005',
  });

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
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setRestaurantDetails({
      name: 'Bento & Skillet Bistro',
      logoEmoji: '🍳',
      cuisine: 'Modern American & Italian',
      phone: '555-0192',
      email: 'hello@bentoskilletbistro.com',
      address: '456 Main Street, Financial District, NY 10005',
    });
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
      <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 z-50 text-xs shadow-md border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            networkMode === 'online' ? 'bg-emerald-500 animate-pulse' :
            networkMode === 'low-bandwidth' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-pulse'
          }`} />
          <span className="font-extrabold tracking-tight uppercase mr-2">RestoERP Back-Of-House & FOH Hub</span>
          
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg text-[10px] text-slate-300 font-semibold border border-slate-700">
            <span className="flex items-center gap-1">
              <input
                id="checkbox-auto-network"
                type="checkbox"
                checked={isAutoNetwork}
                onChange={(e) => setIsAutoNetwork(e.target.checked)}
                className="w-3 h-3 rounded cursor-pointer accent-blue-500"
              />
              <label htmlFor="checkbox-auto-network" className="cursor-pointer">Auto-detect</label>
            </span>
            <span className="text-slate-500">|</span>
            <span>Internet Mode:</span>
            <select
              id="select-network-sim"
              value={networkMode}
              onChange={(e) => {
                const mode = e.target.value as any;
                setNetworkMode(mode);
                setIsAutoNetwork(false); // Turn off auto-detect on manual selection
                if (mode === 'online' && offlineSyncCount > 0) {
                  alert('Network connectivity restored! Automatically flushing local cache and synchronizing offline outbox queue to cloud...');
                  setOfflineSyncCount(0);
                } else if (mode === 'offline') {
                  setOfflineSyncCount(3);
                }
              }}
              className="bg-transparent border-none text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="online" className="bg-slate-900">⚡ Online (Cloud Sync)</option>
              <option value="low-bandwidth" className="bg-slate-900">📉 Low-Internet (Compressed)</option>
              <option value="offline" className="bg-slate-900">💾 Offline (Local Cache)</option>
            </select>
          </div>

          {networkMode === 'offline' && (
            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded animate-bounce">
              {offlineSyncCount} Outbox items queued
            </span>
          )}
          {networkMode === 'low-bandwidth' && (
            <span className="bg-amber-500 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded">
              Compressed Payloads & Local Fallback
            </span>
          )}

          <button
            id="btn-open-sync-manager"
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-extrabold px-2.5 py-1 rounded-lg text-[9px] cursor-pointer transition-colors animate-pulse"
          >
            💾 Offline Queue ({syncQueue.filter(q => q.status === 'Pending').length} Pending)
          </button>
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
        <div className="flex-1 flex flex-col lg:flex-row relative">
          
          {/* Mobile hamburger sub-header bar */}
          <div className="lg:hidden flex items-center justify-between px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">🍔</span>
              <span className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">RestoERP Admin Console</span>
            </div>
            <button
              id="btn-mobile-sidebar-toggle"
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Menu size={16} />
            </button>
          </div>

          {/* Backdrop overlay for mobile menu */}
          {isSidebarOpen && (
            <div 
              className="lg:hidden fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* RESPONSIVE CONTROL PANEL SIDEBAR (Sliding on mobile/tablet) */}
          <aside className={`fixed inset-y-0 left-0 w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 p-5 space-y-6 z-50 transform lg:transform-none lg:static transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-extrabold shadow-sm">
                  R
                </div>
                <div>
                  <h2 className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-white leading-tight">RestoERP</h2>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase font-mono">BOH Admin</span>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Nav list */}
            <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
              {[
                { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
                { id: 'products', label: 'Products & Wizard', icon: Package },
                { id: 'orders', label: 'Procure Orders', icon: ShoppingCart },
                { id: 'wastage', label: 'Wastage Analytics', icon: Trash2 },
                { id: 'recipes', label: 'Recipes & Manufacturing', icon: ChefHat },
                { id: 'logistics', label: 'Logistics Transfers', icon: ArrowLeftRight },
                { id: 'stocks', label: 'Stock & Schema', icon: ClipboardList },
                { id: 'locations', label: 'Outlet Locations', icon: MapPin },
                { id: 'suppliers', label: 'Suppliers Directory', icon: Truck },
                { id: 'events', label: 'Events & Forecasts', icon: Calendar },
                { id: 'sales', label: 'Sales & POS Link', icon: Zap },
                { id: 'support', label: 'Support & Settings', icon: Settings }
              ].map((item) => {
                const Icon = item.icon;
                const active = activeAdminTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`btn-sidebar-nav-${item.id}`}
                    onClick={() => {
                      setActiveAdminTab(item.id);
                      setIsSidebarOpen(false);
                    }}
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
                adjustments={adjustments}
                setAdjustments={setAdjustments}
              />
            )}

            {activeAdminTab === 'locations' && (
              <AdminLocations
                stores={stores}
                setStores={setStores}
                inventories={inventories}
                setInventories={setInventories}
                products={products}
                adminStoreId={adminStoreId}
                setAdminStoreId={setAdminStoreId}
              />
            )}

            {activeAdminTab === 'wastage' && (
              <AdminWastage
                stores={stores}
                products={products}
                inventories={inventories}
                setInventories={setInventories}
                adjustments={adjustments}
                setAdjustments={setAdjustments}
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

            {activeAdminTab === 'suppliers' && (
              <AdminSuppliers
                suppliers={suppliers}
                setSuppliers={setSuppliers}
                products={products}
              />
            )}

            {activeAdminTab === 'events' && (
              <AdminEvents
                products={products}
                recipes={recipes}
                stores={stores}
                onExecutePrebatchRecipe={(recipeId) => {
                  const rName = recipes.find(r => r.id === recipeId)?.name || 'Recipe';
                  alert(`AI Integration Triggered: Successfully scheduled a batch production run of 5 pre-batch containers for "${rName}"!`);
                  setActiveAdminTab('recipes');
                }}
                onNavigateToProcureProduct={(productId) => {
                  const pName = products.find(p => p.id === productId)?.name || 'Product';
                  alert(`AI Integration Triggered: Redirecting to Procurement module to draft a restock reorder request for: "${pName}"!`);
                  setActiveAdminTab('orders');
                }}
              />
            )}

            {activeAdminTab === 'support' && (
              <AdminSupport
                users={users}
                setUsers={setUsers}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                restaurantDetails={restaurantDetails}
                setRestaurantDetails={setRestaurantDetails}
                onResetDatabaseState={handleResetDatabaseState}
              />
            )}
          </main>
        </div>
      )}

      {/* Floating RestoAI BOH Co-Pilot Drawer */}
      <div className="fixed bottom-6 right-6 z-45 flex flex-col items-end">
        {/* Floating Bubble Icon */}
        <button
          id="btn-trigger-ai-copilot"
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-indigo-600/25 transition-all cursor-pointer select-none"
          title="Open RestoAI Operations Co-Pilot"
        >
          {isCopilotOpen ? <X size={20} /> : <Sparkles size={20} className="animate-pulse" />}
        </button>

        {/* Co-Pilot Drawer Panel */}
        {isCopilotOpen && (
          <div className="bg-white dark:bg-slate-900 w-[330px] sm:w-[400px] h-[480px] rounded-3xl border border-slate-250 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden mt-3 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔮</span>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider leading-tight">RestoAI Co-Pilot</h4>
                  <p className="text-[9px] text-indigo-100">Intelligent BOH Operations Advisor</p>
                </div>
              </div>
              <button
                onClick={() => setIsCopilotOpen(false)}
                className="text-indigo-100 hover:text-white hover:bg-white/10 px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Collapse
              </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 dark:bg-slate-950/20">
              {copilotHistory.map((msg, idx) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm font-medium ${
                      isUser 
                        ? 'bg-indigo-650 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-900 border text-slate-800 dark:text-slate-200 rounded-tl-none'
                    }`}>
                      <span className="text-[9px] uppercase font-bold text-violet-400 block mb-1">
                        {isUser ? 'Restaurant Manager' : 'RestoAI Engine'}
                      </span>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}

              {isCopilotTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 border text-slate-400 text-xs rounded-2xl px-3.5 py-2 shadow-sm flex items-center gap-1 font-bold">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                    <span>Analyzing ledger...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSendCopilotMessage} className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-center shrink-0">
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Ask about wastage, event staffing, low stock..."
                className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 dark:text-white"
              />
              <button
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all shrink-0"
              >
                Query
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Offline Sync Manager Console Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="sync-console-modal">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowSyncModal(false)} />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col z-10">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💾</span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">BOH Offline Synchronization Console</h3>
                  <span className="text-[9px] uppercase font-bold text-blue-500">Local Queue Ledger</span>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              When network signals are low or offline, the restaurant BOH local engine captures all inventory audits, purchase modifications, and FOH orders in an encrypted local outbox. Use this console to monitor and force synchronization.
            </p>

            {/* Sync Queue List */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden mb-5">
              <div className="bg-slate-50 dark:bg-slate-850 px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-2">
                <span className="col-span-3">Tx ID</span>
                <span className="col-span-6">Logged Operation</span>
                <span className="col-span-3 text-right">Sync Status</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto no-scrollbar">
                {syncQueue.map((item) => (
                  <div key={item.id} className="px-4 py-3 text-xs grid grid-cols-12 gap-2 hover:bg-slate-50/40 dark:hover:bg-slate-850/20 font-medium">
                    <span className="col-span-3 font-mono text-slate-400">{item.id}</span>
                    <div className="col-span-6 space-y-0.5">
                      <span className="text-slate-900 dark:text-white block font-semibold leading-tight">{item.action}</span>
                      <span className="text-[10px] text-slate-400 block">Logged: {item.timestamp}</span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        item.status === 'Synced'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 animate-pulse'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                id="btn-sync-offline-outage"
                onClick={() => {
                  setNetworkMode('offline');
                  setIsAutoNetwork(false);
                  const newTx = {
                    id: `tx-${Math.floor(100 + Math.random() * 900)}`,
                    action: 'Stock Loss: 12 units Wagyu Ribeye discarded (Downtown Chiller #1)',
                    timestamp: new Date().toLocaleTimeString(),
                    status: 'Pending' as const
                  };
                  setSyncQueue(prev => [newTx, ...prev]);
                  setOfflineSyncCount(prev => prev + 1);
                  alert('Simulated internet outage successfully! Network state forced to OFFLINE. Local outbox cache logged a new transaction.');
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer text-center"
              >
                ⚠️ Trigger Outage
              </button>

              <button
                id="btn-sync-ledger-dl"
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(syncQueue, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `restoerp_sync_ledger_${Date.now()}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  alert('BOH local sync ledger downloaded successfully. Secure copy stored offline in local backup ledger storage.');
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer text-center"
              >
                📥 Backup Ledger
              </button>

              <button
                id="btn-sync-force-action"
                onClick={() => {
                  if (syncQueue.filter(q => q.status === 'Pending').length === 0) {
                    alert('Queue is empty! All items are synchronized.');
                    return;
                  }
                  // Simulate gorgeous progress sync
                  const btn = document.getElementById('btn-sync-force-action');
                  if (btn) btn.innerText = "Synchronizing...";
                  setTimeout(() => {
                    setSyncQueue(prev => prev.map(p => ({ ...p, status: 'Synced' as const })));
                    setNetworkMode('online');
                    setOfflineSyncCount(0);
                    if (btn) btn.innerText = "⚡ Force Cloud Sync";
                    alert('Cloud sync complete! Restored to Online state. All pending outbox cache logs successfully pushed and synchronized.');
                  }, 1200);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-extrabold py-2.5 rounded-xl text-xs cursor-pointer text-center shadow-md shadow-blue-500/15"
              >
                ⚡ Force Cloud Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
