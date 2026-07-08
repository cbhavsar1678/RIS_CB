/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Grid, ClipboardCheck, History, Database, BarChart3, Copy, Check, Download, AlertTriangle, TrendingDown, DollarSign, AlertCircle, Trash2, Plus, Search, Sparkles } from 'lucide-react';
import { Product, Store, Inventory, StocktakeHistory, StockAdjustment } from '../../types';
import { SQL_SCHEMA_STRING, DB_SCHEMA_METADATA } from '../../data/dbSchema';

interface AdminStockControlProps {
  products: Product[];
  stores: Store[];
  inventories: Inventory[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  stocktakeHistory: StocktakeHistory[];
  setStocktakeHistory: React.Dispatch<React.SetStateAction<StocktakeHistory[]>>;
  adjustments: StockAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
}

export const AdminStockControl: React.FC<AdminStockControlProps> = ({
  products,
  stores,
  inventories,
  setInventories,
  stocktakeHistory,
  setStocktakeHistory,
  adjustments,
  setAdjustments,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'stocktake' | 'variance' | 'analytics' | 'schema' | 'forecasting'>('analytics');

  // Interactive Forecasting parameters
  const [demandModifier, setDemandModifier] = useState<'normal' | 'high' | 'peak'>('high');

  // Guided Stocktake form state
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
  const [physicalCounts, setPhysicalCounts] = useState<{ [key: string]: string }>({});
  const [isCopied, setIsCopied] = useState(false);

  // Wastage Analysis state
  const [wasteFilterStoreId, setWasteFilterStoreId] = useState('All');
  const [wasteFilterReason, setWasteFilterReason] = useState('All');
  const [wasteFilterProductId, setWasteFilterProductId] = useState('All');

  // Log Wastage Quick Form state
  const [newWasteStoreId, setNewWasteStoreId] = useState(stores[0]?.id || '');
  const [newWasteProductId, setNewWasteProductId] = useState(products[0]?.id || '');
  const [newWasteQty, setNewWasteQty] = useState('');
  const [newWasteReason, setNewWasteReason] = useState<'Wastage' | 'Spoilage' | 'Theft'>('Wastage');
  const [newWasteNotes, setNewWasteNotes] = useState('');

  const handleLogWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(newWasteQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity for wastage log.');
      return;
    }

    const prod = products.find(p => p.id === newWasteProductId);
    const store = stores.find(s => s.id === newWasteStoreId);
    if (!prod || !store) return;

    const unitCost = prod.basePrice / prod.unitsPerPackage;
    const totalCost = qty * unitCost;

    const newWasteAdjustment: StockAdjustment = {
      id: `adj-waste-${Date.now().toString().slice(-4)}`,
      productId: newWasteProductId,
      storeId: newWasteStoreId,
      date: new Date().toISOString(),
      quantity: -qty, // negative for waste/loss
      reason: newWasteReason,
      costValue: -totalCost, // negative costValue for financial loss
      notes: newWasteNotes || `Manual logged ${newWasteReason}`,
      performedBy: 'Sarah Jenkins (BOH Admin)',
    };

    // Deduct stock from inventories
    setInventories(prev => prev.map(inv => {
      if (inv.storeId === newWasteStoreId && inv.productId === newWasteProductId) {
        return {
          ...inv,
          theoreticalStock: Math.max(0, inv.theoreticalStock - qty),
        };
      }
      return inv;
    }));

    // Add to adjustments
    setAdjustments(prev => [newWasteAdjustment, ...prev]);

    // Reset Form
    setNewWasteQty('');
    setNewWasteNotes('');
    alert(`Success: Registered ${qty} ${prod.stockingUnit}s of "${prod.name}" as ${newWasteReason} at ${store.name}. Ledger updated.`);
  };

  const handleRevertWaste = (adjId: string) => {
    const adj = adjustments.find(a => a.id === adjId);
    if (!adj) return;

    // Revert inventory deduction (add quantity back)
    setInventories(prev => prev.map(inv => {
      if (inv.storeId === adj.storeId && inv.productId === adj.productId) {
        return {
          ...inv,
          theoreticalStock: inv.theoreticalStock + Math.abs(adj.quantity),
        };
      }
      return inv;
    }));

    // Remove from adjustments
    setAdjustments(prev => prev.filter(a => a.id !== adjId));
    alert('Wastage entry reverted successfully. Stock levels restored.');
  };

  // Copy SQL Schema
  const handleCopySchema = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_STRING);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Submit physical stocktake count
  const handleSubmitStocktake = (e: React.FormEvent) => {
    e.preventDefault();
    const store = stores.find((s) => s.id === selectedStoreId);
    if (!store) return;

    const itemsList: StocktakeHistory['items'] = [];
    let varianceVal = 0;

    const updatedInvs = inventories.map((inv) => {
      if (inv.storeId !== selectedStoreId) return inv;

      const physicalStr = physicalCounts[inv.productId];
      if (physicalStr === undefined || physicalStr.trim() === '') return inv;

      const physicalVal = parseFloat(physicalStr) || 0;
      const product = products.find((p) => p.id === inv.productId);
      if (!product) return inv;

      const unitCost = product.basePrice / product.unitsPerPackage;
      const variance = physicalVal - inv.theoreticalStock;
      const varianceCost = variance * unitCost;

      itemsList.push({
        productId: inv.productId,
        theoreticalQty: inv.theoreticalStock,
        actualQty: physicalVal,
        unit: product.stockingUnit,
        unitCost: unitCost,
        variance: variance,
        notes: variance !== 0 ? `Variance of ${variance.toFixed(2)} detected.` : 'Perfect match',
      });

      varianceVal += varianceCost;

      return {
        ...inv,
        actualStock: physicalVal,
        theoreticalStock: physicalVal, // Adjust theoretical to physical actual count upon submission!
        lastStocktakeDate: new Date().toISOString(),
      };
    });

    if (itemsList.length === 0) {
      alert('Input counted quantities for at least one item.');
      return;
    }

    const newStocktakeRecord: StocktakeHistory = {
      id: `stk-${Date.now().toString().slice(-4)}`,
      storeId: selectedStoreId,
      date: new Date().toISOString(),
      status: 'Reviewed',
      submittedBy: 'Sarah Jenkins',
      varianceTotalValue: varianceVal,
      items: itemsList,
    };

    setInventories(updatedInvs);
    setStocktakeHistory((prev) => [newStocktakeRecord, ...prev]);
    setPhysicalCounts({});
    alert('Guided stocktake verified and submitted! Ledger levels balanced.');
    setActiveTab('variance');
  };

  // CSV Data Pack Exporter simulation
  const handleExportDataPack = (moduleName: string) => {
    const csvContent = "data:text/csv;charset=utf-8,ID,Product,Store,Count,Unit\n" + 
      inventories.map(inv => {
        const prod = products.find(p => p.id === inv.productId);
        const store = stores.find(s => s.id === inv.storeId);
        return `${inv.id},"${prod?.name}","${store?.name}",${inv.theoreticalStock},${prod?.stockingUnit}`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `restaurant_erp_${moduleName}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="admin-stock-control-panel">
      {/* Subtabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <button
          id="btn-subtab-ctrl-matrix"
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Grid size={14} className="inline mr-1" /> Multi-Store Matrix
        </button>

        <button
          id="btn-subtab-ctrl-take"
          onClick={() => setActiveTab('stocktake')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'stocktake'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <ClipboardCheck size={14} className="inline mr-1" /> Barcode/Guided Stocktake
        </button>

        <button
          id="btn-subtab-ctrl-variance"
          onClick={() => setActiveTab('variance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'variance'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <History size={14} className="inline mr-1" /> Audit Variance Logs
        </button>

        <button
          id="btn-subtab-ctrl-analytics"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={14} className="inline mr-1" /> Analytics & Reports
        </button>

        <button
          id="btn-subtab-ctrl-schema"
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Database size={14} className="inline mr-1" /> SQL Database schema
        </button>

        <button
          id="btn-subtab-ctrl-forecasting"
          onClick={() => setActiveTab('forecasting')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'forecasting'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Sparkles size={14} className="inline mr-1 text-purple-500 animate-pulse" /> 🔮 AI Predictive Stock Trends
        </button>
      </div>

      {/* MULTI-STORE MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white">Consolidated Stores Stock Matrix</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Real-time stock balance vectors mapped simultaneously across all active commercial location bins.</p>
            </div>
            <button
              id="btn-export-matrix-csv"
              onClick={() => handleExportDataPack('stores_matrix')}
              className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border px-3 py-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
            >
              <Download size={12} /> Export CSV Matrix
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-850 border-b text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Ingredient Product</th>
                  <th className="px-6 py-4">Universal SKU</th>
                  {stores.map((store) => (
                    <th key={store.id} className="px-6 py-4 text-center">{store.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.filter(p=>!p.isArchived).map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50/20">
                    <td className="px-6 py-3.5 font-bold text-gray-900 dark:text-white">{prod.name}</td>
                    <td className="px-6 py-3.5 font-mono text-gray-400">{prod.sku}</td>
                    {stores.map((store) => {
                      const inv = inventories.find((i) => i.productId === prod.id && i.storeId === store.id);
                      const isLow = inv ? inv.theoreticalStock <= inv.reorderPoint : false;
                      return (
                        <td key={store.id} className="px-6 py-3.5 text-center font-bold">
                          {inv ? (
                            <span className={isLow ? 'text-red-500 font-extrabold bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full' : 'text-gray-800 dark:text-gray-200'}>
                              {inv.theoreticalStock.toFixed(1)} {prod.stockingUnit}s
                            </span>
                          ) : (
                            <span className="text-gray-350 dark:text-gray-600">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PHYSICAL GUIDE/BARCODE STOCKTAKE FORM */}
      {activeTab === 'stocktake' && (
        <form onSubmit={handleSubmitStocktake} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white">Guided Stocktake Form</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Optimized for mobile tables, featuring blind-guided validation layout counters.</p>
            </div>

            <div>
              <label className="text-xs font-semibold mr-2 text-gray-400">Target Store:</label>
              <select
                id="select-stocktake-store"
                value={selectedStoreId}
                onChange={(e) => { setSelectedStoreId(e.target.value); setPhysicalCounts({}); }}
                className="bg-gray-50 dark:bg-gray-850 border rounded-xl px-2.5 py-1.5 text-xs font-bold"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {products.filter(p=>!p.isArchived).map((prod) => {
              const inv = inventories.find((i) => i.productId === prod.id && i.storeId === selectedStoreId);
              if (!inv) return null;
              return (
                <div key={prod.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-50 dark:border-gray-850 rounded-2xl bg-gray-50/40">
                  <div className="sm:w-1/3">
                    <span className="font-bold text-xs">{prod.name}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">SKU: {prod.sku} • Bin: {inv.storageLocation || 'Aisle'}</span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs mt-2.5 sm:mt-0">
                    <span className="text-gray-400 font-medium">Theo: <strong>{inv.theoreticalStock}</strong> {prod.stockingUnit}</span>
                    <div className="flex items-center gap-2">
                      <input
                        id={`stocktake-input-${prod.id}`}
                        type="number"
                        step="0.01"
                        placeholder="0.0"
                        value={physicalCounts[prod.id] ?? ''}
                        onChange={(e) => setPhysicalCounts({ ...physicalCounts, [prod.id]: e.target.value })}
                        className="w-24 bg-white dark:bg-gray-900 border rounded-xl px-3 py-1.5 text-center text-xs focus:outline-none"
                      />
                      <span className="text-gray-400 font-bold font-mono">{prod.stockingUnit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-3">
            <button
              id="btn-stocktake-submit"
              type="submit"
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
            >
              Verify physical counts & balances
            </button>
          </div>
        </form>
      )}

      {/* AUDIT VARIANCE REVIEW TAB */}
      {activeTab === 'variance' && (
        <div className="space-y-4">
          {stocktakeHistory.map((history) => {
            const storeName = stores.find((s) => s.id === history.storeId)?.name || 'Downtown';
            return (
              <div key={history.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
                  <div>
                    <span className="bg-emerald-50 text-emerald-600 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border">
                      {history.status}
                    </span>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mt-1.5">Stocktake Audit #{history.id}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Audited by {history.submittedBy} at {storeName} on {new Date(history.date).toLocaleDateString()}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 uppercase font-bold block">Consolidated Variance Value</span>
                    <span className={`font-mono text-xs font-bold ${history.varianceTotalValue < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {history.varianceTotalValue < 0 ? '-' : '+'}${Math.abs(history.varianceTotalValue).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {history.items.map((item, idx) => {
                    const product = products.find(p=>p.id === item.productId);
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-gray-50/40 rounded-xl border border-gray-50">
                        <div>
                          <span className="font-bold">{product?.name}</span>
                          <span className="text-[10px] text-gray-400 ml-2 font-mono">
                            Theo: {item.theoreticalQty} vs counted actual: {item.actualQty} {item.unit}s
                          </span>
                        </div>
                        <span className={`font-mono font-bold ${item.variance < 0 ? 'text-red-500' : item.variance > 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                          {item.variance === 0 ? 'Matched' : `${item.variance > 0 ? '+' : ''}${item.variance.toFixed(1)} ${item.unit}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {stocktakeHistory.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-900 border rounded-3xl">
              No historical count variance audit trails logged.
            </div>
          )}
        </div>
      )}

      {/* WEALTH/WASTAGE & LOSS ANALYSIS TAB */}
      {activeTab === 'analytics' && (() => {
        // Find raw waste and loss adjustments
        const rawWastageAdjs = adjustments.filter(adj => 
          ['Wastage', 'Spoilage', 'Theft', 'Audit Loss'].includes(adj.reason) || adj.quantity < 0
        );

        // Calculate global metrics
        const totalWastageCost = rawWastageAdjs.reduce((sum, adj) => sum + Math.abs(adj.costValue), 0);
        const totalWastageEvents = rawWastageAdjs.length;

        // Compute most vulnerable store
        const storeLossMap: { [key: string]: number } = {};
        rawWastageAdjs.forEach(adj => {
          storeLossMap[adj.storeId] = (storeLossMap[adj.storeId] || 0) + Math.abs(adj.costValue);
        });
        let highestLossStoreId = '';
        let highestStoreLossVal = 0;
        Object.entries(storeLossMap).forEach(([sId, val]) => {
          if (val > highestStoreLossVal) {
            highestStoreLossVal = val;
            highestLossStoreId = sId;
          }
        });
        const highestLossStoreName = stores.find(s => s.id === highestLossStoreId)?.name || 'N/A';

        // Compute most vulnerable product
        const productLossMap: { [key: string]: number } = {};
        rawWastageAdjs.forEach(adj => {
          productLossMap[adj.productId] = (productLossMap[adj.productId] || 0) + Math.abs(adj.costValue);
        });
        let highestLossProductId = '';
        let highestProdLossVal = 0;
        Object.entries(productLossMap).forEach(([pId, val]) => {
          if (val > highestProdLossVal) {
            highestProdLossVal = val;
            highestLossProductId = pId;
          }
        });
        const highestLossProductName = products.find(p => p.id === highestLossProductId)?.name || 'N/A';

        // Apply filters
        const filteredWastage = rawWastageAdjs.filter(adj => {
          const matchStore = wasteFilterStoreId === 'All' || adj.storeId === wasteFilterStoreId;
          const matchReason = wasteFilterReason === 'All' || adj.reason === wasteFilterReason;
          const matchProduct = wasteFilterProductId === 'All' || adj.productId === wasteFilterProductId;
          return matchStore && matchReason && matchProduct;
        });

        const filteredWastageCost = filteredWastage.reduce((sum, adj) => sum + Math.abs(adj.costValue), 0);

        // Group filters breakdown for charts
        const reasonBreakdown: { [key: string]: number } = { Wastage: 0, Spoilage: 0, Theft: 0, 'Audit Loss': 0 };
        filteredWastage.forEach(adj => {
          const reason = ['Wastage', 'Spoilage', 'Theft', 'Audit Loss'].includes(adj.reason) ? adj.reason : 'Wastage';
          reasonBreakdown[reason] = (reasonBreakdown[reason] || 0) + Math.abs(adj.costValue);
        });

        const storeBreakdown: { [key: string]: number } = {};
        filteredWastage.forEach(adj => {
          const sName = stores.find(s => s.id === adj.storeId)?.name || adj.storeId;
          storeBreakdown[sName] = (storeBreakdown[sName] || 0) + Math.abs(adj.costValue);
        });

        const productBreakdown: { [key: string]: number } = {};
        filteredWastage.forEach(adj => {
          const pName = products.find(p => p.id === adj.productId)?.name || adj.productId;
          productBreakdown[pName] = (productBreakdown[pName] || 0) + Math.abs(adj.costValue);
        });

        return (
          <div className="space-y-6" id="wastage-analysis-hub">
            
            {/* METRIC KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Consolidated Lost Value</span>
                  <span className="text-xl font-black text-rose-500 font-mono">${totalWastageCost.toFixed(2)}</span>
                  <span className="text-[9px] text-gray-400 block">Absolute financial depletion</span>
                </div>
                <div className="p-3 bg-rose-50 text-rose-500 dark:bg-rose-950/20 rounded-2xl">
                  <TrendingDown size={18} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Depletion Events</span>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">{totalWastageEvents} Logs</span>
                  <span className="text-[9px] text-gray-400 block">Wastage, Spoilage & Theft logs</span>
                </div>
                <div className="p-3 bg-gray-50 text-gray-500 dark:bg-gray-800 rounded-2xl">
                  <AlertCircle size={18} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Highest Risk Outlet</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate block max-w-[150px]">{highestLossStoreName}</span>
                  <span className="text-[9px] text-rose-500 block font-mono font-bold">${highestStoreLossVal.toFixed(1)} Cumulative Loss</span>
                </div>
                <div className="p-3 bg-red-50 text-red-500 dark:bg-red-950/20 rounded-2xl">
                  <DollarSign size={18} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Top Spoilage Product</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate block max-w-[150px]">{highestLossProductName}</span>
                  <span className="text-[9px] text-rose-500 block font-mono font-bold">${highestProdLossVal.toFixed(1)} Cumulative Loss</span>
                </div>
                <div className="p-3 bg-amber-50 text-amber-500 dark:bg-amber-950/20 rounded-2xl">
                  <AlertTriangle size={18} />
                </div>
              </div>
            </div>

            {/* AI PREDICTIVE RADAR Insights */}
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-100 dark:border-amber-950/40 p-5 rounded-3xl flex items-start gap-3.5">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md">
                <Sparkles size={16} />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  AI Smart Wastage Predictor & Recommendations
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-snug">
                  {highestLossProductId ? (
                    <>
                      <strong>Insight:</strong> Spoilage of <strong>{highestLossProductName}</strong> is currently responsible for the highest loss block (<strong>${highestProdLossVal.toFixed(2)}</strong>). We recommend reducing the par inventory level of this product at <strong>{highestLossStoreName}</strong> from its current level down by 15%, or scheduling a pre-batch container run to cook and preserve before cell expiry!
                    </>
                  ) : (
                    'No waste anomalies detected! Maintain current strict procurement and temperature monitoring rules.'
                  )}
                </p>
              </div>
            </div>

            {/* MAIN TWO-COLUMN FORM & ANALYTICS INTERACTIVE LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Report/Log Wastage Form (Col Span 4) */}
              <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4 self-start">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">🚨 Report Food Wastage / Loss</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Deduct stock immediately from specific store inventory and document loss reason.</p>
                </div>

                <form onSubmit={handleLogWasteSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Target Outlet</label>
                    <select
                      id="input-waste-store"
                      value={newWasteStoreId}
                      onChange={(e) => setNewWasteStoreId(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
                    >
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Ingredient Product</label>
                    <select
                      id="input-waste-product"
                      value={newWasteProductId}
                      onChange={(e) => setNewWasteProductId(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
                    >
                      {products.filter(p=>!p.isArchived).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.stockingUnit}s)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Quantity Lost</label>
                      <input
                        id="input-waste-qty"
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 2.5"
                        value={newWasteQty}
                        onChange={(e) => setNewWasteQty(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Reason Factor</label>
                      <select
                        id="input-waste-reason"
                        value={newWasteReason}
                        onChange={(e) => setNewWasteReason(e.target.value as any)}
                        className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
                      >
                        <option value="Wastage">Prep Wastage</option>
                        <option value="Spoilage">Spoiled / Expired</option>
                        <option value="Theft">Shrinkage / Theft</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Incident Notes / Cause</label>
                    <input
                      id="input-waste-notes"
                      type="text"
                      placeholder="e.g. Ribeye exceeded hold limits"
                      value={newWasteNotes}
                      onChange={(e) => setNewWasteNotes(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <button
                    id="btn-submit-waste-log"
                    type="submit"
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-rose-500/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={12} /> Log Loss & Adjust Stock
                  </button>
                </form>
              </div>

              {/* Dynamic Interactive Charts & Breakdown Indicators (Col Span 8) */}
              <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">📊 Interactive Loss Shares</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Filter results below to visualize exact financial drains dynamically.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  
                  {/* Breakdown 1: Loss by Reason */}
                  <div className="space-y-3 border-r pr-2 last:border-none border-gray-100 dark:border-gray-800">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">By Reason Factor</span>
                    <div className="space-y-3">
                      {Object.entries(reasonBreakdown).map(([reason, value]) => {
                        const percent = filteredWastageCost > 0 ? (value / filteredWastageCost) * 100 : 0;
                        const color = reason === 'Spoilage' ? 'bg-red-500' : reason === 'Theft' ? 'bg-amber-500' : reason === 'Wastage' ? 'bg-orange-500' : 'bg-indigo-500';
                        return (
                          <div key={reason} className="space-y-1 text-xs">
                            <div className="flex justify-between font-bold text-gray-600 dark:text-gray-300">
                              <span>{reason}</span>
                              <span className="font-mono">${value.toFixed(1)} ({percent.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Breakdown 2: Loss by Store */}
                  <div className="space-y-3 border-r pr-2 last:border-none border-gray-100 dark:border-gray-800">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">By Outlet Location</span>
                    <div className="space-y-3">
                      {stores.map(s => {
                        const value = storeBreakdown[s.name] || 0;
                        const percent = filteredWastageCost > 0 ? (value / filteredWastageCost) * 100 : 0;
                        return (
                          <div key={s.id} className="space-y-1 text-xs">
                            <div className="flex justify-between font-bold text-gray-600 dark:text-gray-300">
                              <span className="truncate max-w-[100px]">{s.name}</span>
                              <span className="font-mono">${value.toFixed(1)} ({percent.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Breakdown 3: Loss by Product (Top 4) */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">By High-Impact Product</span>
                    <div className="space-y-3">
                      {Object.entries(productBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([pName, value]) => {
                          const percent = filteredWastageCost > 0 ? (value / filteredWastageCost) * 100 : 0;
                          return (
                            <div key={pName} className="space-y-1 text-xs">
                              <div className="flex justify-between font-bold text-gray-600 dark:text-gray-300">
                                <span className="truncate max-w-[100px]">{pName}</span>
                                <span className="font-mono">${value.toFixed(1)} ({percent.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-violet-500" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      {Object.keys(productBreakdown).length === 0 && (
                        <div className="text-gray-400 italic text-[10px] text-center pt-4">No entries registered.</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* WASTAGE IMPACT VISUALIZATION DASHBOARD */}
            {(() => {
              // Calculate environmental metrics
              let totalCO2Kg = 0;
              let totalWaterLiters = 0;
              
              filteredWastage.forEach((adj) => {
                const prod = products.find((p) => p.id === adj.productId);
                if (prod) {
                  const qty = Math.abs(adj.quantity);
                  if (prod.category === 'Protein') {
                    totalCO2Kg += qty * 15.4;
                    totalWaterLiters += qty * 4300;
                  } else if (prod.category === 'Dairy') {
                    totalCO2Kg += qty * 4.2;
                    totalWaterLiters += qty * 1000;
                  } else if (prod.category === 'Produce') {
                    totalCO2Kg += qty * 1.2;
                    totalWaterLiters += qty * 250;
                  } else {
                    totalCO2Kg += qty * 2.1;
                    totalWaterLiters += qty * 450;
                  }
                }
              });

              const profitRecoverySalesNeeded = filteredWastageCost / 0.3; // assuming standard 30% food cost

              // Group 7-day trend
              const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
              });

              const trendData = last7Days.map(dateStr => {
                const sum = filteredWastage
                  .filter(adj => adj.date.startsWith(dateStr))
                  .reduce((s, adj) => s + Math.abs(adj.costValue), 0);
                return { date: dateStr, amount: sum };
              });

              const maxAmount = Math.max(...trendData.map(d => d.amount), 1);

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-rose-500/5 border border-rose-500/10 dark:border-rose-500/20 rounded-3xl p-6">
                  <div className="md:col-span-3 pb-1 border-b border-rose-500/10">
                    <h3 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      🌍 Food Wastage Real-world Impact Assessment
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Translating Back-of-House inventory waste into margins burden and carbon footprints.</p>
                  </div>

                  {/* Recovery burden card */}
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">Financial Profit Burdens</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-rose-500 font-mono">${profitRecoverySalesNeeded.toFixed(0)}</span>
                      <span className="text-[10px] text-gray-500">Sales Required</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      Assuming a industry-standard <strong>30% raw food cost margin</strong>, waitstaff must ring up <strong>${profitRecoverySalesNeeded.toFixed(2)}</strong> in menu orders just to pay off the <strong>${filteredWastageCost.toFixed(2)}</strong> loss of ingredients.
                    </p>
                  </div>

                  {/* Environmental footprint card */}
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">Ecological Depletion</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-emerald-500 font-mono">{totalCO2Kg.toFixed(0)} kg</span>
                      <span className="text-[10px] text-gray-500">CO₂ lost</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      Wasting these raw goods squanders equivalent water reservoirs of <strong>{totalWaterLiters.toLocaleString()} liters</strong>, and releases greenhouse footprints comparable to driving a diesel van for <strong>{(totalCO2Kg * 2.5).toFixed(0)} miles</strong>!
                    </p>
                  </div>

                  {/* Interactive Trend Column */}
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">7-Day Waste Trend</span>
                      <span className="text-[9px] font-mono bg-rose-50 text-rose-600 px-1.5 py-0.2 rounded dark:bg-rose-950/20 dark:text-rose-400 font-bold">
                        Daily cost shares
                      </span>
                    </div>
                    <div className="flex items-end justify-between h-20 px-1 pb-1">
                      {trendData.map((d, i) => {
                        const heightPct = (d.amount / maxAmount) * 100;
                        return (
                          <div key={i} className="flex flex-col items-center flex-1 group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                              ${d.amount.toFixed(1)}
                            </div>
                            <div 
                              className="w-4 bg-rose-400 hover:bg-rose-500 dark:bg-rose-500/80 dark:hover:bg-rose-500 rounded-t transition-all cursor-pointer" 
                              style={{ height: `${Math.max(4, heightPct)}%` }}
                            />
                            <span className="text-[8px] font-mono mt-1 text-gray-400">
                              {new Date(d.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* INTERACTIVE FILTER TOOLBAR & GRID */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">📋 Ledger of Documented Losses</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Filter results using BOH parameters. Revert manual mistakes if needed.</p>
                </div>

                {/* Filter selects */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="filter-waste-store"
                    value={wasteFilterStoreId}
                    onChange={(e) => setWasteFilterStoreId(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none"
                  >
                    <option value="All">All Outlets</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  <select
                    id="filter-waste-reason"
                    value={wasteFilterReason}
                    onChange={(e) => setWasteFilterReason(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none"
                  >
                    <option value="All">All Reasons</option>
                    <option value="Wastage">Wastage</option>
                    <option value="Spoilage">Spoilage</option>
                    <option value="Theft">Theft</option>
                    <option value="Audit Loss">Audit Loss</option>
                  </select>

                  <select
                    id="filter-waste-product"
                    value={wasteFilterProductId}
                    onChange={(e) => setWasteFilterProductId(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none max-w-[150px]"
                  >
                    <option value="All">All Products</option>
                    {products.filter(p=>!p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Losses table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-850 border-b text-[9px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Incident Date</th>
                      <th className="px-5 py-3.5">Product</th>
                      <th className="px-5 py-3.5">Store Outlet</th>
                      <th className="px-5 py-3.5">Loss Factor</th>
                      <th className="px-5 py-3.5">Qty Depleted</th>
                      <th className="px-5 py-3.5">Financial Loss</th>
                      <th className="px-5 py-3.5">Notes</th>
                      <th className="px-5 py-3.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredWastage.map((adj) => {
                      const prod = products.find(p => p.id === adj.productId);
                      const sName = stores.find(s => s.id === adj.storeId)?.name || adj.storeId;
                      const isManual = adj.id.startsWith('adj-waste-');

                      return (
                        <tr key={adj.id} className="hover:bg-gray-50/20">
                          <td className="px-5 py-3.5 text-gray-500 font-mono">
                            {new Date(adj.date).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {prod?.name || 'Deleted Product'}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400">
                            {sName}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              adj.reason === 'Spoilage' ? 'bg-red-50 text-red-600 border-red-100' :
                              adj.reason === 'Theft' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              adj.reason === 'Wastage' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                              {adj.reason}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-black text-rose-500">
                            {adj.quantity.toFixed(1)} {prod?.stockingUnit}s
                          </td>
                          <td className="px-5 py-3.5 font-mono font-black text-rose-500">
                            -${Math.abs(adj.costValue).toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate" title={adj.notes}>
                            {adj.notes || '-'}
                          </td>
                          <td className="px-5 py-3.5">
                            {isManual ? (
                              <button
                                id={`btn-revert-waste-${adj.id}`}
                                onClick={() => handleRevertWaste(adj.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg cursor-pointer flex items-center gap-1 text-[10px] font-black border border-transparent hover:border-red-100 transition-all"
                              >
                                <Trash2 size={10} /> Revert
                              </button>
                            ) : (
                              <span className="text-gray-300 text-[10px] italic">System Autolog</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredWastage.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-400 italic">
                          No wastage or spoilage logs matching selected criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {/* POSTGRESQL SCHEMA EXPLORER (PART 1 REPRESENTATION) */}
      {activeTab === 'schema' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white flex items-center gap-2">
                <Database className="text-indigo-500" size={18} />
                Relational Database Schema (PostgreSQL 15+)
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Optimized for multi-store routing, automatic triggers for sales depletion, and audit trace tables.</p>
            </div>
            <button
              id="btn-copy-postgresql-schema"
              onClick={handleCopySchema}
              className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-sm transition-all"
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
              {isCopied ? 'Copied SQL!' : 'Copy PostgreSQL code'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Table structural descriptions (SPAN 5) */}
            <div className="lg:col-span-5 space-y-4 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Entity relationship structures</h4>
              {DB_SCHEMA_METADATA.map((tbl) => (
                <div key={tbl.name} className="border border-gray-50 rounded-2xl p-4 bg-gray-50/40 text-xs">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>🗄️</span> <span>{tbl.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug">{tbl.description}</p>
                  
                  <div className="mt-3 space-y-1 pt-2.5 border-t border-gray-100">
                    {tbl.columns.map((col, cIdx) => (
                      <div key={cIdx} className="flex justify-between text-[10px] py-0.5">
                        <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{col.name}</span>
                        <span className="font-mono text-indigo-500">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pristine SQL Code block (SPAN 7) */}
            <div className="lg:col-span-7 bg-gray-950 rounded-3xl overflow-hidden p-5 border border-gray-800 flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pb-3 border-b border-gray-900 mb-4">
                <span>SQL CODE COMPILER OUTPUT</span>
                <span>POSTGRESQL DIALECT</span>
              </div>
              <pre className="text-[10px] text-indigo-400 font-mono overflow-auto max-h-[420px] leading-relaxed no-scrollbar whitespace-pre">
                {SQL_SCHEMA_STRING}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* AI PREDICTIVE STOCK TRENDS FORECAST PANEL */}
      {activeTab === 'forecasting' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-6" id="stock-forecasting-view">
          
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔮</span>
                AI Predictive Stock Trends & Run-out Horizon
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Dynamic 7-Day depletion curves modeled on seasonal weather profiles, local concerts, weekend event modifiers, and tableside ordering velocities.
              </p>
            </div>

            {/* Interactive modifier switcher */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-850 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] uppercase font-black text-gray-400 px-2">Local Demand Modifiers:</span>
              <button
                id="btn-mod-normal"
                onClick={() => setDemandModifier('normal')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  demandModifier === 'normal'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-gray-500 hover:text-slate-800'
                }`}
              >
                ● Normal
              </button>
              <button
                id="btn-mod-high"
                onClick={() => setDemandModifier('high')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  demandModifier === 'high'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-gray-500 hover:text-slate-800'
                }`}
              >
                🔥 High (Concerts)
              </button>
              <button
                id="btn-mod-peak"
                onClick={() => setDemandModifier('peak')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  demandModifier === 'peak'
                    ? 'bg-rose-500 text-white'
                    : 'text-gray-500 hover:text-slate-800'
                }`}
              >
                🚨 Extreme (Festival)
              </button>
            </div>
          </div>

          {/* Core Depletion Analytics Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Action advice checklist (Col Span 4) */}
            <div className="lg:col-span-4 bg-gray-50/50 dark:bg-gray-950/20 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl space-y-4">
              <div>
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Core Directives</span>
                <h4 className="text-xs font-black text-gray-900 dark:text-white mt-0.5">Automated Procurement Playbook</h4>
              </div>

              <div className="space-y-3.5">
                {/* Advice 1 */}
                <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-extrabold text-amber-500">🚨 CRITICAL REORDER ALERT</span>
                    <span className="font-mono text-gray-400">Milk</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Organic Whole Milk stock is depletion-bound in <strong className="text-red-500 font-bold">1.2 days</strong> due to morning peaks. Reorder is mandatory.
                  </p>
                  <button
                    id="btn-reorder-milk-advice"
                    onClick={() => alert('Drafting Purchase Order for 20 cases of Organic Whole Milk...')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-1.5 rounded-lg text-[10px]"
                  >
                    Draft PO (20 Cases)
                  </button>
                </div>

                {/* Advice 2 */}
                <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-extrabold text-purple-500">🔄 STORE STOCK BALANCE</span>
                    <span className="font-mono text-gray-400">Ribeye Steak</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Downtown Bistro has excess Wagyu beef (85 units vs par 20). Westside Grill is running critically dry (2 units).
                  </p>
                  <button
                    id="btn-transfer-ribeye-advice"
                    onClick={() => alert('Drafting Logistics Stock Transfer of 25 cases of Wagyu Beef from Downtown to Westside Grill...')}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1.5 rounded-lg text-[10px]"
                  >
                    Transfer 25 Units
                  </button>
                </div>

                {/* Advice 3 */}
                <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-extrabold text-emerald-500">🥦 SPOILAGE SALVAGE</span>
                    <span className="font-mono text-gray-400">Lettuce</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Romaine lettuce has excess holdings. Suggest running Caesars promo to flush 12Kg before cell deterioration.
                  </p>
                  <button
                    id="btn-promo-lettuce-advice"
                    onClick={() => alert('Dispatching automated POS caesar salad meal-combo price discount (-15%) to FOH ordering panels...')}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-[10px]"
                  >
                    Deploy FOH Combo Promo
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Table & depletion bars (Col Span 8) */}
            <div className="lg:col-span-8 space-y-5">
              <div className="overflow-x-auto rounded-3xl border border-gray-100 dark:border-gray-850">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-950/20 border-b border-gray-100 dark:border-gray-850 text-[10px] font-black text-gray-400 uppercase">
                      <th className="p-4">Ingredient Product</th>
                      <th className="p-4">Current Stock</th>
                      <th className="p-4">Daily Velocity (Avg)</th>
                      <th className="p-4">7-Day Predictive Runway</th>
                      <th className="p-4 text-right">Run-out Horizon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-850 font-medium">
                    {[
                      {
                        name: 'Organic Whole Milk',
                        current: 24,
                        unit: 'Bottle',
                        velocity: demandModifier === 'normal' ? 8 : demandModifier === 'high' ? 14 : 20,
                        safeThreshold: 15,
                        color: 'bg-red-500'
                      },
                      {
                        name: 'Wagyu Beef Ribeye',
                        current: 12,
                        unit: 'Case',
                        velocity: demandModifier === 'normal' ? 2 : demandModifier === 'high' ? 3.5 : 5,
                        safeThreshold: 5,
                        color: 'bg-amber-500'
                      },
                      {
                        name: 'Atlantic Salmon Fillet',
                        current: 38,
                        unit: 'Kg',
                        velocity: demandModifier === 'normal' ? 4 : demandModifier === 'high' ? 6 : 9,
                        safeThreshold: 10,
                        color: 'bg-emerald-500'
                      },
                      {
                        name: 'Pizza Dough (Pre-batch)',
                        current: 65,
                        unit: 'Piece',
                        velocity: demandModifier === 'normal' ? 10 : demandModifier === 'high' ? 15 : 22,
                        safeThreshold: 20,
                        color: 'bg-indigo-500'
                      }
                    ].map((item, idx) => {
                      const daysRemaining = item.current / item.velocity;
                      const runOutText = daysRemaining <= 1.5 ? 'CRITICAL' : daysRemaining <= 3 ? 'REORDER' : 'STABLE';
                      const progressPercent = Math.min(100, (daysRemaining / 7) * 100);

                      return (
                        <tr key={idx} className="hover:bg-gray-50/25 dark:hover:bg-gray-950/10">
                          <td className="p-4">
                            <span className="font-bold text-gray-900 dark:text-white block">{item.name}</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">Par target: {item.safeThreshold} {item.unit}s</span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {item.current} {item.unit}s
                          </td>
                          <td className="p-4 font-mono text-gray-500">
                            ~{item.velocity.toFixed(1)}/day
                          </td>
                          <td className="p-4 space-y-1.5 min-w-[150px]">
                            <div className="flex justify-between font-mono text-[9px] text-gray-400">
                              <span>Depletion Runway</span>
                              <span>{daysRemaining.toFixed(1)} Days</span>
                            </div>
                            <div className="w-full bg-gray-150 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${progressPercent}%` }} />
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                              daysRemaining <= 1.5
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : daysRemaining <= 3
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {runOutText} ({daysRemaining.toFixed(1)}d)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Graphical Depletion curve simulator canvas placeholder */}
              <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-5 border border-slate-800/60 relative overflow-hidden h-40">
                <div className="absolute top-4 left-4 z-10">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">BOH SIMULATED CHART</span>
                  <h4 className="text-xs font-black text-white mt-0.5">7-Day Depletion Runway Trajectory</h4>
                </div>
                
                {/* SVG Visual Curves */}
                <svg className="w-full h-full absolute inset-0 text-slate-700 mt-4" viewBox="0 0 500 100" fill="none">
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.05)" />
                  <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.05)" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.05)" />
                  
                  {/* Danger Line threshold */}
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#ef4444" strokeDasharray="4,4" opacity="0.4" />
                  <text x="400" y="70" fill="#ef4444" fontSize="6" fontWeight="bold">SAFETY PAR LIMIT</text>

                  {/* Curve 1 (Milk) - Depletes very fast */}
                  <path d="M0,10 C100,20 150,70 170,95 L500,95" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" className="animate-[dash_3s_ease-out_infinite]" />
                  <circle cx="170" cy="95" r="3.5" fill="#ef4444" className="animate-ping" />
                  
                  {/* Curve 2 (Salmon) - Depletes stably */}
                  <path d="M0,25 C150,30 250,55 380,95 L500,95" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="380" cy="95" r="3.5" fill="#10b981" />
                  
                  {/* Chart labels */}
                  <text x="10" y="95" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">MON</text>
                  <text x="100" y="95" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">WED</text>
                  <text x="200" y="95" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">FRI</text>
                  <text x="300" y="95" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">SAT</text>
                  <text x="400" y="95" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">SUN</text>
                </svg>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
