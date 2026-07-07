/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingBag, TrendingUp, AlertTriangle, FileWarning, ArrowRight, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { Store, Product, Inventory, PurchaseOrder, StockTransfer, StockAdjustment } from '../../types';

interface AdminDashboardProps {
  stores: Store[];
  products: Product[];
  inventories: Inventory[];
  purchaseOrders: PurchaseOrder[];
  transfers: StockTransfer[];
  adjustments: StockAdjustment[];
  currentStoreId: string;
  setCurrentStoreId: (id: string) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stores,
  products,
  inventories,
  purchaseOrders,
  transfers,
  adjustments,
  currentStoreId,
  setCurrentStoreId,
  onNavigateToTab,
}) => {
  // Filters by current select store
  const isMultiStore = currentStoreId === 'All';
  const activeStoreName = isMultiStore ? 'All Locations' : stores.find((s) => s.id === currentStoreId)?.name || 'Downtown Bistro';

  const storeInventories = isMultiStore
    ? inventories
    : inventories.filter((i) => i.storeId === currentStoreId);

  // Stats Calculations
  const lowStockItems = storeInventories.filter((i) => i.theoreticalStock <= i.reorderPoint);

  const totalInventoryValue = storeInventories.reduce((sum, inv) => {
    const prod = products.find((p) => p.id === inv.productId);
    if (!prod) return sum;
    // basePrice is per package. basePrice / unitsPerPackage = cost per stocking unit
    const unitCost = prod.basePrice / prod.unitsPerPackage;
    return sum + inv.theoreticalStock * unitCost;
  }, 0);

  // Simulated COGS (Cost of Goods Sold)
  // Formula: Beginning Inventory + Purchases - Ending Inventory
  // For simplicity of simulation, we aggregate adjustments (reason: 'Recipe Outward') + wastage
  const cogsValue = storeInventories.reduce((sum, inv) => {
    const prod = products.find((p) => p.id === inv.productId);
    if (!prod) return sum;
    const unitCost = prod.basePrice / prod.unitsPerPackage;
    
    // Sum relevant store adjustments
    const storeAdjustments = adjustments.filter(
      (a) => a.productId === inv.productId && 
            (isMultiStore || a.storeId === currentStoreId) &&
            a.quantity < 0
    );
    const depletedQty = Math.abs(storeAdjustments.reduce((acc, curr) => acc + curr.quantity, 0));
    return sum + depletedQty * unitCost;
  }, 0) + 1240.50; // Add simulated daily transaction baseline

  // Total active purchases value
  const activePurchaseAmount = purchaseOrders
    .filter((po) => po.status === 'Approved' || po.status === 'Sent')
    .filter((po) => isMultiStore || po.storeId === currentStoreId)
    .reduce((sum, po) => sum + po.totalAmount, 0);

  // Aggregated operational notifications & Pending Items queue
  const pendingInvoices = purchaseOrders.filter((po) => po.status === 'Pending Approval');
  const pendingTransfers = transfers.filter((t) => t.status === 'Requested');
  const alertVarianceCounts = storeInventories.filter(
    (i) => i.actualStock !== undefined && i.actualStock !== i.theoreticalStock
  );

  return (
    <div className="space-y-6" id="admin-dashboard-container">
      {/* Top Banner & Multi-Store Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            ERP Control Panel
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Real-time theoretical costing, ingredient depletion, and multi-store logistics parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Active Node:</span>
          <select
            id="admin-store-filter-select"
            value={currentStoreId}
            onChange={(e) => setCurrentStoreId(e.target.value)}
            className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
          >
            <option value="All">🏢 All Stores Consolidated</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                📍 {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Stock Valuation */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Asset Valuation</span>
            <h4 className="text-lg font-black text-gray-900 dark:text-white mt-1">
              ${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full w-fit">
              <TrendingUp size={10} /> +4.2% Growth
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
            💵
          </div>
        </div>

        {/* Metric 2: Real-time COGS */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Cost of Goods (COGS)</span>
            <h4 className="text-lg font-black text-gray-900 dark:text-white mt-1">
              ${cogsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1.5 bg-gray-50 dark:bg-gray-850 px-2 py-0.5 rounded-full w-fit">
              Margin Target: 28.5%
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
            📊
          </div>
        </div>

        {/* Metric 3: Critical Par Alerts */}
        <button
          id="btn-nav-low-stock"
          onClick={() => onNavigateToTab('stocks')}
          className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex items-center justify-between hover:border-orange-200 transition-all text-left cursor-pointer"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Critical Alerts</span>
            <h4 className="text-lg font-black text-red-600 dark:text-red-400 mt-1">
              {lowStockItems.length} Low Items
            </h4>
            <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 mt-1.5 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full w-fit">
              <AlertTriangle size={10} /> Action Required
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-lg">
            🚨
          </div>
        </button>

        {/* Metric 4: Pipeline Commitments */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-blue-100 tracking-wider">Transit Capital</span>
            <h4 className="text-lg font-black text-white mt-1">
              ${activePurchaseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h4>
            <div className="flex items-center gap-1 text-[10px] font-bold text-white mt-1.5 bg-blue-400/30 px-2 py-0.5 rounded-full w-fit">
              {purchaseOrders.filter((po) => po.status === 'Sent').length} Dispatched POs
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold text-lg">
            🚚
          </div>
        </div>
      </div>

      {/* Main Split: Left - Pending Items Queue, Right - Notifications & Low Stock alerts list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (SPAN 7): Pending Items Queue */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-850 p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-850 pb-4 mb-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <FileWarning className="text-orange-500" size={18} />
                Pending Items Queue
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                Urgent line-item issues requiring immediate manager clearance or validation.
              </p>
            </div>
            <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              {pendingInvoices.length + pendingTransfers.length + alertVarianceCounts.length} Actionables
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {/* 1. Mismatched Invoices or Unapproved POs */}
            {pendingInvoices.map((po) => {
              const vendor = po.supplierId.replace('sup-', '').toUpperCase();
              return (
                <div
                  key={po.id}
                  className="flex items-center justify-between p-3.5 bg-orange-50/40 dark:bg-orange-950/10 rounded-2xl border border-orange-100/60 dark:border-orange-900/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-xl mt-0.5">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white">PO Approval Requested</h5>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Purchase Order #{po.id.toUpperCase()} • Vendor: {vendor} • Sum: ${po.totalAmount.toFixed(2)}
                      </p>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-orange-500 mt-1 block">
                        Awaiting validation
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-dashboard-approve-po-${po.id}`}
                    onClick={() => onNavigateToTab('orders')}
                    className="flex items-center gap-1.5 text-[10px] font-extrabold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Resolve <ArrowRight size={10} />
                  </button>
                </div>
              );
            })}

            {/* 2. Unapproved Transfers */}
            {pendingTransfers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3.5 bg-blue-50/40 dark:bg-blue-950/10 rounded-2xl border border-blue-100/60 dark:border-blue-900/20"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl mt-0.5">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 dark:text-white">Inter-store Stock Transfer</h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Transfer #{t.id.toUpperCase()} • Requested by {stores.find(s=>s.id===t.fromStoreId)?.name || 'Downtown'}
                    </p>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-500 mt-1 block">
                      Awaiting transit clearance
                    </span>
                  </div>
                </div>

                <button
                  id={`btn-dashboard-approve-transfer-${t.id}`}
                  onClick={() => onNavigateToTab('transfers')}
                  className="flex items-center gap-1.5 text-[10px] font-extrabold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Clear <ArrowRight size={10} />
                </button>
              </div>
            ))}

            {/* 3. Physical Audit Variance Flags */}
            {alertVarianceCounts.map((inv) => {
              const product = products.find((p) => p.id === inv.productId);
              if (!product) return null;
              const variance = (inv.actualStock || 0) - inv.theoreticalStock;
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3.5 bg-red-50/40 dark:bg-red-950/10 rounded-2xl border border-red-100/60 dark:border-red-900/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-xl mt-0.5">
                      <ShieldAlert size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white">Unreviewed Physical Variance</h5>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Product: {product.name} ({inv.storageLocation}) • Theo: {inv.theoreticalStock} vs Actual: {inv.actualStock}
                      </p>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-500 mt-1 block">
                        Variance: {variance > 0 ? `+${variance}` : variance} {product.stockingUnit}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-dashboard-resolve-variance-${inv.id}`}
                    onClick={() => onNavigateToTab('stocks')}
                    className="flex items-center gap-1.5 text-[10px] font-extrabold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Audit <ArrowRight size={10} />
                  </button>
                </div>
              );
            })}

            {pendingInvoices.length === 0 && pendingTransfers.length === 0 && alertVarianceCounts.length === 0 && (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <CheckCircle size={32} className="text-emerald-500 mb-2" />
                <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300">Clean Slate Queue</h5>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-xs">
                  All mismatch invoices, inter-store dispatch routing transfers, and physical auditing variances have been fully resolved!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (SPAN 5): Real-time Low Stock Alarm Board */}
        <div className="lg:col-span-5 space-y-6">
          {/* Low Stock Panel */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-850 p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={18} />
              Low Stock Warnings ({lowStockItems.length})
            </h3>

            <div className="space-y-3.5 max-h-[280px] overflow-y-auto no-scrollbar pr-1">
              {lowStockItems.map((inv) => {
                const product = products.find((p) => p.id === inv.productId);
                if (!product) return null;
                const percentOfPar = (inv.theoreticalStock / inv.parLevel) * 100;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-xs border-b border-gray-50 dark:border-gray-850 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="max-w-[70%]">
                      <div className="font-bold text-gray-900 dark:text-white line-clamp-1">{product.name}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        Theo Stock: {inv.theoreticalStock} {product.stockingUnit} / Par: {inv.parLevel} {product.stockingUnit}
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${percentOfPar < 30 ? 'bg-red-500' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min(percentOfPar, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/30">
                        {percentOfPar.toFixed(0)}% Par
                      </span>
                    </div>
                  </div>
                );
              })}

              {lowStockItems.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">All stock counts optimal</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">All products are at or above safe par levels.</p>
                </div>
              )}
            </div>
          </div>

          {/* Wastage & Spoilage Alert Board */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-850 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                Wastage & Spoilage Alert
              </h3>
              <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/30">
                {adjustments.filter(a => (a.reason === 'Wastage' || a.reason === 'Spoilage' || a.reason === 'Theft') && (isMultiStore || a.storeId === currentStoreId)).length} Active
              </span>
            </div>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
              {adjustments
                .filter(a => (a.reason === 'Wastage' || a.reason === 'Spoilage' || a.reason === 'Theft') && (isMultiStore || a.storeId === currentStoreId))
                .slice(0, 4)
                .map((a) => {
                  const product = products.find((p) => p.id === a.productId);
                  return (
                    <div key={a.id} className="p-3 bg-rose-50/30 dark:bg-rose-950/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/20 text-xs">
                      <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                        <span className="truncate max-w-[70%]">{product?.name || 'Raw Ingredient'}</span>
                        <span className="text-rose-600 dark:text-rose-400 font-mono font-black">${Math.abs(a.costValue).toFixed(2)} Lost</span>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        Reason: {a.reason} • Qty: {Math.abs(a.quantity)} {product?.stockingUnit || 'Units'} • {a.notes || 'No log details'}
                      </p>
                      <div className="text-[9px] text-gray-400 font-medium mt-1">
                        Logged by {a.performedBy} on {new Date(a.date).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}

              {adjustments.filter(a => (a.reason === 'Wastage' || a.reason === 'Spoilage' || a.reason === 'Theft') && (isMultiStore || a.storeId === currentStoreId)).length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle size={20} className="text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">Zero Wastage Recorded</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Kitchen prep is running with 100% yield efficiency!</p>
                </div>
              )}
            </div>
          </div>

          {/* Operational Notifications Feed */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-850 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Operational Logs
            </h3>
            <div className="space-y-3 font-sans text-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-orange-500 mt-0.5">●</span>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Marcus Brody</strong> processed a new 20L batch of <em>House Marinara Sauce Base</em>.
                  </p>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Downtown • Today 09:30 AM</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-emerald-500 mt-0.5">●</span>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Weekly delivery arrived from <strong>Meat Masters Inc.</strong> and received into cold freezer.
                  </p>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Consolidated • Yesterday 04:15 PM</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
