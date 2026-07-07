/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Grid, ClipboardCheck, History, Database, BarChart3, Copy, Check, Download, AlertTriangle } from 'lucide-react';
import { Product, Store, Inventory, StocktakeHistory } from '../../types';
import { SQL_SCHEMA_STRING, DB_SCHEMA_METADATA } from '../../data/dbSchema';

interface AdminStockControlProps {
  products: Product[];
  stores: Store[];
  inventories: Inventory[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  stocktakeHistory: StocktakeHistory[];
  setStocktakeHistory: React.Dispatch<React.SetStateAction<StocktakeHistory[]>>;
}

export const AdminStockControl: React.FC<AdminStockControlProps> = ({
  products,
  stores,
  inventories,
  setInventories,
  stocktakeHistory,
  setStocktakeHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'stocktake' | 'variance' | 'analytics' | 'schema'>('matrix');

  // Guided Stocktake form state
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
  const [physicalCounts, setPhysicalCounts] = useState<{ [key: string]: string }>({});
  const [isCopied, setIsCopied] = useState(false);

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

      {/* ANALYTICS & REPORTS TAB */}
      {activeTab === 'analytics' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white">SaaS Reports & Wastage Breakdown</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Customized P&L cost factors consolidated reports.</p>
            </div>
            <button
              id="btn-export-reports-csv"
              onClick={() => handleExportDataPack('p_and_l')}
              className="text-xs bg-gray-50 border rounded-xl px-3 py-1.5 text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Export P&L Report Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report 1: Consolidated Wastage Factor */}
            <div className="border border-gray-100 rounded-2xl p-5">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Cost Factor 1: Wastage & Loss Share</span>
              <div className="mt-4 flex flex-col gap-3">
                {[
                  { name: 'Spoilage (Expired raw meats)', val: 55, color: 'bg-red-500' },
                  { name: 'Wastage (Kitchen prep drops)', val: 25, color: 'bg-orange-500' },
                  { name: 'Theft (Shrinkage)', val: 12, color: 'bg-yellow-500' },
                  { name: 'Audit discrepancies', val: 8, color: 'bg-indigo-500' }
                ].map((item, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <span>{item.name}</span>
                      <span>{item.val}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report 2: Food Cost Benchmarks */}
            <div className="border border-gray-100 rounded-2xl p-5">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Cost Factor 2: Food Cost Targets vs Actuals</span>
              <div className="mt-4 flex flex-col gap-3">
                {[
                  { category: 'Proteins (Ribeye, chicken)', target: '30%', actual: '32.5%', isAlert: true },
                  { category: 'Dairy (Cream, butter)', target: '25%', actual: '24.1%', isAlert: false },
                  { category: 'Produce (Tomatoes, lettuce)', target: '20%', actual: '22.0%', isAlert: true },
                  { category: 'Dry Goods (Pasta, oil)', target: '15%', actual: '13.5%', isAlert: false }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-gray-50/40 rounded-xl border border-gray-50">
                    <div>
                      <div className="font-bold">{item.category}</div>
                      <span className="text-[10px] text-gray-400">Target Benchmark: {item.target}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold block ${item.isAlert ? 'text-red-500' : 'text-emerald-500'}`}>{item.actual}</span>
                      <span className="text-[9px] uppercase font-bold text-gray-400">{item.isAlert ? 'High Variance' : 'Optimal'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};
