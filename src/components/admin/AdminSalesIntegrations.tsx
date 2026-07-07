/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Database, Play, AlertCircle, CheckCircle, Flame, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import { Product, Recipe, Store, Inventory, StockAdjustment } from '../../types';

interface AdminSalesIntegrationsProps {
  products: Product[];
  recipes: Recipe[];
  stores: Store[];
  inventories: Inventory[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  adjustments: StockAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
}

export const AdminSalesIntegrations: React.FC<AdminSalesIntegrationsProps> = ({
  products,
  recipes,
  stores,
  inventories,
  setInventories,
  adjustments,
  setAdjustments,
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'plu' | 'analytics'>('pos');

  // Sales simulator logs selection state
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
  const [selectedLogId, setSelectedLogId] = useState('log-lunch');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedLogReport, setProcessedLogReport] = useState<string[]>([]);

  // Analytics state generated from imports
  const [totalSimulatedSales, setTotalSimulatedSales] = useState(0);
  const [totalDepletedCost, setTotalDepletedCost] = useState(0);

  // Sample POS log bundles loaded with PLUs
  const SIMULATED_POS_LOGS = [
    {
      id: 'log-lunch',
      name: 'POS Log #1029: Busy Lunch Shift (12:00 - 14:30)',
      totalRevenue: 845.50,
      ticketsCount: 22,
      lines: [
        { plu: 'PLU-501', name: 'Premium Ribeye Steak', quantitySold: 12 },
        { plu: 'PLU-502', name: 'Creamy Tuscan Penne Chicken', quantitySold: 18 },
        { plu: 'PLU-503', name: 'Crispy Caesar Salad', quantitySold: 15 },
      ]
    },
    {
      id: 'log-dinner',
      name: 'POS Log #1030: Weekend Dinner Peak (18:00 - 21:00)',
      totalRevenue: 2410.00,
      ticketsCount: 48,
      lines: [
        { plu: 'PLU-501', name: 'Premium Ribeye Steak', quantitySold: 35 },
        { plu: 'PLU-502', name: 'Creamy Tuscan Penne Chicken', quantitySold: 28 },
        { plu: 'PLU-503', name: 'Crispy Caesar Salad', quantitySold: 42 },
      ]
    }
  ];

  // Perform sales depletion calculation (Lookup PLU -> Recipe -> Ingredients -> Deduct Stock -> Log Adjustment)
  const handleProcessPosLog = () => {
    const log = SIMULATED_POS_LOGS.find((l) => l.id === selectedLogId);
    if (!log) return;

    setIsProcessing(true);
    setProcessedLogReport([]);

    const report: string[] = [];
    let localDepCost = 0;

    setTimeout(() => {
      // Create updates mapping
      const updatedInvs = [...inventories];
      const newAdjustments: StockAdjustment[] = [];

      report.push(`[SYSTEM_DAEMON] Initializing POS batch ingestion on Store Outlet...`);
      report.push(`[SYSTEM_DAEMON] Log ID: ${log.id.toUpperCase()} • Event: Ingesting ${log.ticketsCount} tickets...`);

      log.lines.forEach((line) => {
        // Find matching recipe using PLU code
        const recipe = recipes.find((r) => r.salesPlu === line.plu);
        if (!recipe) {
          report.push(`[WARNING] Unlinked PLU Code: ${line.plu} ("${line.name}") has no matching recipe! Depletion calculation bypassed.`);
          return;
        }

        report.push(`[MATCH] Plu ${line.plu} linked successfully to formula "${recipe.name}" (Qty Sold: ${line.quantitySold})`);

        recipe.ingredients.forEach((ing) => {
          const product = products.find((p) => p.id === ing.productId);
          if (!product) return;

          // Compute exact raw quantities to deplete
          // Depletion = (Qty Sold / Recipe Yield Qty) * Ingredient Quantity
          const rawUnitsToDeplete = (line.quantitySold / recipe.yieldQty) * ing.quantity;
          const unitCost = product.basePrice / product.unitsPerPackage;
          const costOfDepletedItem = rawUnitsToDeplete * unitCost;

          localDepCost += costOfDepletedItem;

          // Find the specific store inventory node
          const targetInvIdx = updatedInvs.findIndex(
            (inv) => inv.productId === ing.productId && inv.storeId === selectedStoreId
          );

          if (targetInvIdx !== -1) {
            const currentStock = updatedInvs[targetInvIdx].theoreticalStock;
            const newStock = Math.max(0, currentStock - rawUnitsToDeplete);
            updatedInvs[targetInvIdx].theoreticalStock = newStock;

            report.push(
              `  -> Depleted raw inventory SKU ${product.sku} ("${product.name}"): -${rawUnitsToDeplete.toFixed(2)} ${ing.unit} (Left: ${newStock.toFixed(2)})`
            );
          } else {
            report.push(`  -> [ERROR] No local warehouse inventory bucket found for product ${product.name}`);
          }

          // Add manual adjustment log for records tracking
          newAdjustments.push({
            id: `adj-pos-${log.id}-${ing.productId}-${Date.now().toString().slice(-3)}`,
            productId: ing.productId,
            storeId: selectedStoreId,
            date: new Date().toISOString(),
            quantity: -rawUnitsToDeplete,
            reason: 'Recipe Outward',
            costValue: -costOfDepletedItem,
            notes: `Automated POS log depletion for PLU ${line.plu} (x${line.quantitySold})`,
            performedBy: 'POS Ingestion Service',
          });
        });
      });

      // Update state
      setInventories(updatedInvs);
      setAdjustments((prev) => [...newAdjustments, ...prev]);
      setTotalSimulatedSales((prev) => prev + log.totalRevenue);
      setTotalDepletedCost((prev) => prev + localDepCost);

      setIsProcessing(false);
      report.push(`[SUCCESS] Ingestion completed! Total revenue processing of $${log.totalRevenue.toFixed(2)} ingested.`);
      report.push(`[SUCCESS] Total theoretical ingredient depletion cost: $${localDepCost.toFixed(2)} calculated.`);
      setProcessedLogReport(report);
    }, 1200);
  };

  return (
    <div className="space-y-6" id="admin-sales-integrations-panel">
      {/* Subtab selection */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <button
          id="btn-subtab-sales-pos"
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'pos'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Terminal size={14} className="inline mr-1" /> POS Log Ingestion
        </button>

        <button
          id="btn-subtab-sales-plu"
          onClick={() => setActiveTab('plu')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'plu'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Database size={14} className="inline mr-1" /> PLU Mapping Matrix
        </button>

        <button
          id="btn-subtab-sales-analytics"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={14} className="inline mr-1" /> Ingested Cost Tracker
        </button>
      </div>

      {/* POS LOG INGESTION VIEW */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls form (SPAN 5) */}
          <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">POS Queue Terminal</h3>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Store Destination Outlet</label>
              <select
                id="select-pos-store"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Select Pending Shift Log</label>
              <select
                id="select-pos-log"
                value={selectedLogId}
                onChange={(e) => setSelectedLogId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
              >
                {SIMULATED_POS_LOGS.map((log) => (
                  <option key={log.id} value={log.id}>
                    {log.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Log Line specifics before running */}
            {(() => {
              const matchedLog = SIMULATED_POS_LOGS.find((l) => l.id === selectedLogId)!;
              return (
                <div className="bg-gray-50 dark:bg-gray-850 rounded-2xl p-4 border text-xs">
                  <span className="text-[9px] font-bold uppercase text-gray-400 block mb-2">Shift Transaction Lines</span>
                  <div className="space-y-1.5 font-mono">
                    {matchedLog.lines.map((line, lIdx) => (
                      <div key={lIdx} className="flex justify-between">
                        <span>{line.name} ({line.plu})</span>
                        <span className="font-bold">x{line.quantitySold} sold</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-2 text-[10px] flex justify-between text-gray-500">
                    <span>Tickets: <strong>{matchedLog.ticketsCount}</strong></span>
                    <span>Total Shift: <strong className="text-gray-800 dark:text-white">${matchedLog.totalRevenue.toFixed(2)}</strong></span>
                  </div>
                </div>
              );
            })()}

            <button
              id="btn-pos-process-submit"
              disabled={isProcessing}
              onClick={handleProcessPosLog}
              className="w-full bg-gray-900 hover:bg-gray-850 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-55"
            >
              <Play size={12} /> {isProcessing ? 'Depleting Ingredient Stocks...' : 'Simulate POS Import & Deplete'}
            </button>
          </div>

          {/* Output log reporting terminal (SPAN 7) */}
          <div className="lg:col-span-7 bg-gray-950 rounded-3xl overflow-hidden p-5 border border-gray-800 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pb-3 border-b border-gray-900 mb-4">
              <span>SYSTEM LOG INGESTION STREAM</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE ONLINE
              </span>
            </div>

            <div className="flex-1 font-mono text-[10px] text-gray-300 space-y-2 overflow-y-auto no-scrollbar max-h-[360px]">
              {processedLogReport.length > 0 ? (
                processedLogReport.map((line, idx) => {
                  let clr = 'text-gray-300';
                  if (line.includes('[SUCCESS]')) clr = 'text-emerald-400 font-bold';
                  if (line.includes('[WARNING]')) clr = 'text-yellow-400 font-semibold';
                  if (line.includes('[MATCH]')) clr = 'text-indigo-400';
                  return <div key={idx} className={clr}>{line}</div>;
                })
              ) : (
                <div className="text-gray-500 text-center py-20">
                  Terminal ready. Select a POS log bundle on the left and click Simulate.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PLU MAPPING MATRIX TAB */}
      {activeTab === 'plu' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm">
          <div className="border-b pb-4 mb-4">
            <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white">Active Menu PLU Bindings</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">List of front-of-house menu items and their PLU integrations linking directly to manufacturing formulas.</p>
          </div>

          <div className="space-y-3">
            {recipes.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-3.5 border border-gray-50 dark:border-gray-850 rounded-2xl bg-gray-50/40">
                <div>
                  <span className="font-mono text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 font-bold uppercase">
                    {rec.salesPlu}
                  </span>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white mt-2">{rec.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Binds to Yield: {rec.yieldQty} {rec.yieldUnit}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 justify-end">
                    <CheckCircle size={12} /> Recipe Mapped
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 mt-1 block">Menu retail: ${rec.retailPrice.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYTICS / INGESTED COST TRACKER TAB */}
      {activeTab === 'analytics' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white">Sales Ingested Cost Tracker</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Performance tracking of automated ingredients cost depletion.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-50 p-5 rounded-2xl bg-gray-50/40">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Total Simulated Sales Ingested</span>
              <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
                ${totalSimulatedSales.toFixed(2)}
              </span>
            </div>

            <div className="border border-gray-50 p-5 rounded-2xl bg-gray-50/40">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Theoretical Food Cost Value</span>
              <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
                ${totalDepletedCost.toFixed(2)}
              </span>
            </div>

            <div className="border border-gray-50 p-5 rounded-2xl bg-gray-50/40">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Gross margin</span>
              <span className={`text-2xl font-black mt-1 block ${totalSimulatedSales ? 'text-emerald-500' : 'text-gray-400'}`}>
                {totalSimulatedSales ? `${((1 - (totalDepletedCost / totalSimulatedSales)) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
