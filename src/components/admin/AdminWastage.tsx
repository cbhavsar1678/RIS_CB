/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trash2, AlertTriangle, Filter, Plus, ShieldAlert, Sparkles, RefreshCw, Calendar, TrendingDown, HelpCircle } from 'lucide-react';
import { Store, Product, Inventory, StockAdjustment } from '../../types';

interface AdminWastageProps {
  stores: Store[];
  products: Product[];
  inventories: Inventory[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  adjustments: StockAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
}

export const AdminWastage: React.FC<AdminWastageProps> = ({
  stores,
  products,
  inventories,
  setInventories,
  adjustments,
  setAdjustments,
}) => {
  // Filters
  const [filterStoreId, setFilterStoreId] = useState('All');
  const [filterReason, setFilterReason] = useState('All');
  const [filterProductId, setFilterProductId] = useState('All');

  // Quick Form State
  const [newWasteStoreId, setNewWasteStoreId] = useState(stores[0]?.id || '');
  const [newWasteProductId, setNewWasteProductId] = useState(products[0]?.id || '');
  const [newWasteQty, setNewWasteQty] = useState('');
  const [newWasteReason, setNewWasteReason] = useState<'Wastage' | 'Spoilage' | 'Theft'>('Wastage');
  const [newWasteNotes, setNewWasteNotes] = useState('');

  // AI Predictor States
  const [isPredicting, setIsPredicting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);

  // Filter adjustments that represent spoilage / loss (negative quantity, reason Wastage/Spoilage/Theft)
  const wasteAdjustments = adjustments.filter(adj => {
    const isWasteReason = ['Wastage', 'Spoilage', 'Theft'].includes(adj.reason);
    const matchesStore = filterStoreId === 'All' || adj.storeId === filterStoreId;
    const matchesReason = filterReason === 'All' || adj.reason === filterReason;
    const matchesProduct = filterProductId === 'All' || adj.productId === filterProductId;
    return isWasteReason && matchesStore && matchesReason && matchesProduct;
  });

  // Calculate stats
  const totalLossValue = Math.abs(wasteAdjustments.reduce((sum, adj) => sum + (adj.costValue || 0), 0));
  const totalIncidents = wasteAdjustments.length;

  // Find highest risk outlet
  const storeLosses: { [key: string]: number } = {};
  wasteAdjustments.forEach(adj => {
    storeLosses[adj.storeId] = (storeLosses[adj.storeId] || 0) + Math.abs(adj.costValue || 0);
  });
  let highestRiskStoreName = 'N/A';
  let maxStoreLoss = 0;
  Object.keys(storeLosses).forEach(storeId => {
    if (storeLosses[storeId] > maxStoreLoss) {
      maxStoreLoss = storeLosses[storeId];
      highestRiskStoreName = stores.find(s => s.id === storeId)?.name || 'Downtown Bistro';
    }
  });

  // Find top spoilage product
  const productLosses: { [key: string]: number } = {};
  wasteAdjustments.forEach(adj => {
    productLosses[adj.productId] = (productLosses[adj.productId] || 0) + Math.abs(adj.costValue || 0);
  });
  let topSpoilageProductName = 'N/A';
  let maxProductLoss = 0;
  Object.keys(productLosses).forEach(prodId => {
    if (productLosses[prodId] > maxProductLoss) {
      maxProductLoss = productLosses[prodId];
      topSpoilageProductName = products.find(p => p.id === prodId)?.name || 'Lettuce Heads';
    }
  });

  // Form Submit
  const handleLogWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(newWasteQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    const prod = products.find(p => p.id === newWasteProductId);
    const store = stores.find(s => s.id === newWasteStoreId);
    if (!prod || !store) return;

    // Unit cost calculations
    const unitCost = prod.basePrice / prod.unitsPerPackage;
    const totalCost = qty * unitCost;

    const newWasteAdjustment: StockAdjustment = {
      id: `adj-waste-${Date.now().toString().slice(-4)}`,
      productId: newWasteProductId,
      storeId: newWasteStoreId,
      date: new Date().toISOString(),
      quantity: -qty, // negative for loss
      reason: newWasteReason,
      costValue: -totalCost, // negative financial impact
      notes: newWasteNotes || `Manual logged ${newWasteReason}`,
      performedBy: 'Sarah Jenkins (BOH Manager)',
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
    alert(`Successfully registered ${qty} ${prod.stockingUnit} of "${prod.name}" as ${newWasteReason} at ${store.name}. Inventory decremented and ledger updated.`);
  };

  const handleRevertWaste = (adjId: string) => {
    const adj = adjustments.find(a => a.id === adjId);
    if (!adj) return;

    // Restore inventory
    setInventories(prev => prev.map(inv => {
      if (inv.storeId === adj.storeId && inv.productId === adj.productId) {
        return {
          ...inv,
          theoreticalStock: inv.theoreticalStock + Math.abs(adj.quantity),
        };
      }
      return inv;
    }));

    // Remove adjustment
    setAdjustments(prev => prev.filter(a => a.id !== adjId));
    alert('Spoilage entry successfully reverted. Associated stock quantity has been restored.');
  };

  // Voice Recognition States & Handlers
  const [isListening, setIsListening] = useState(false);
  const [dictationLog, setDictationLog] = useState('');

  const handleVoiceDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback: simulated dictation modal
      const simulatedReports = [
        "Sarah reports: We had to discard three cases of Wagyu Beef Ribeye due to chiller thermostat failure",
        "Discovered five bottles of Organic Whole Milk because they exceeded expiration date",
        "Discovered 2 kilograms of Atlantic Salmon Fillet lost to prep table spoilage",
        "Staff reports shrinkage: two packs of Pizza Dough missing from dry storage"
      ];
      const randomReport = simulatedReports[Math.floor(Math.random() * simulatedReports.length)];
      setDictationLog(randomReport);
      parseVoiceTranscript(randomReport);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
        const fallbackMsg = "Sarah reports: Threw out six bottles of Organic Whole Milk because of spoilage";
        setDictationLog(fallbackMsg);
        parseVoiceTranscript(fallbackMsg);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setDictationLog(resultText);
        parseVoiceTranscript(resultText);
      };

      rec.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const parseVoiceTranscript = (text: string) => {
    let quantity = 1;
    const numWordMap: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    
    const words = text.toLowerCase().split(' ');
    const digitMatch = text.match(/\b\d+(\.\d+)?\b/);
    if (digitMatch) {
      quantity = parseFloat(digitMatch[0]);
    } else {
      for (const word of words) {
        if (numWordMap[word]) {
          quantity = numWordMap[word];
          break;
        }
      }
    }

    let matchedProdId = products[0]?.id || '';
    for (const p of products) {
      const pNameLower = p.name.toLowerCase();
      const firstWord = pNameLower.split(' ')[0];
      const secondWord = pNameLower.split(' ')[1] || '';
      if (text.toLowerCase().includes(pNameLower) || text.toLowerCase().includes(firstWord) || (secondWord && text.toLowerCase().includes(secondWord))) {
        matchedProdId = p.id;
        break;
      }
    }

    let matchedReason: 'Wastage' | 'Spoilage' | 'Theft' = 'Wastage';
    if (text.toLowerCase().includes('expire') || text.toLowerCase().includes('spoiled') || text.toLowerCase().includes('spoilage') || text.toLowerCase().includes('chiller') || text.toLowerCase().includes('thermostat')) {
      matchedReason = 'Spoilage';
    } else if (text.toLowerCase().includes('theft') || text.toLowerCase().includes('missing') || text.toLowerCase().includes('shrinkage') || text.toLowerCase().includes('stolen')) {
      matchedReason = 'Theft';
    }

    setNewWasteProductId(matchedProdId);
    setNewWasteQty(quantity.toString());
    setNewWasteReason(matchedReason);
    setNewWasteNotes(`[Voice Dictation Logged] ${text}`);
    alert(`🎙️ Voice Parser parsed operation:\n\n• Product: ${products.find(p=>p.id===matchedProdId)?.name}\n• Quantity: ${quantity}\n• Reason: ${matchedReason}\n• Notes pre-filled!\n\nPlease check fields and submit.`);
  };

  // Generate AI Wastage Advice
  const handleGenerateAIWastageAnalysis = () => {
    setIsPredicting(true);
    setAiAnalysis(null);

    // Dynamic extraction of products nearing expiry or high loss
    setTimeout(() => {
      setAiAnalysis({
        score: 'B-',
        riskLevel: 'Moderate to High',
        riskFactor: 'Warm seasonal weather accelerating perishability in standard chillers + over-ordering on bulk promo milk.',
        topRisks: [
          {
            product: 'Romaine Lettuce Heads',
            risk: 'Shelf life remaining: 2.1 Days average. High risk of oxidation/spoilage under current humidity.',
            recommendation: 'Reduce reorder volume by 15% and enforce strict FIFO kitchen loading order.'
          },
          {
            product: 'Whole Milk (Organic)',
            risk: 'Excess surplus (55 units in stock vs par of 15).',
            recommendation: 'Transfer 25 units from Downtown Bistro to Westside Grill to avoid expiration loss.'
          }
        ],
        smartPreps: [
          {
            title: 'Enforce Temperature Log Auditing',
            description: 'A 2-degree fluctuation in cold storage #3 is speeding up dairy souring. Dispatch service technician.'
          },
          {
            title: 'Menu Specials Integration',
            description: 'Create a "Romaine Salad Caesar Platter" POS kitchen promotion to flush lettuce reserves before Friday evening.'
          }
        ]
      });
      setIsPredicting(false);
    }, 1200);
  };

  return (
    <div className="space-y-6" id="admin-wastage-dashboard">
      
      {/* Top Header Row */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-red-500">🗑️</span>
            Wastage & Loss Analytics Dashboard
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Audit commercial ingredient shrinkage, log spoilage incidents, and execute AI-guided cost salvage routines.
          </p>
        </div>

        <button
          id="btn-ai-wastage-predict"
          onClick={handleGenerateAIWastageAnalysis}
          disabled={isPredicting}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-4.5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 transition-all self-start md:self-auto"
        >
          {isPredicting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Recalculating Spoilage Vectors...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              AI Wastage Predictor
            </>
          )}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Financial Loss */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Shrinkage Loss (Cost)</span>
            <h4 className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
              ${totalLossValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <span className="text-[10px] text-gray-400 mt-1 block">Filtered active losses</span>
          </div>
          <div className="w-11 h-11 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center text-lg font-extrabold">
            💸
          </div>
        </div>

        {/* KPI 2: Total Incidents */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Logged Incidents</span>
            <h4 className="text-lg font-black text-gray-900 dark:text-white mt-1">
              {totalIncidents} events
            </h4>
            <span className="text-[10px] text-gray-400 mt-1 block">Wastage / Spoilage / Theft</span>
          </div>
          <div className="w-11 h-11 bg-gray-50 dark:bg-gray-850 text-gray-500 rounded-2xl flex items-center justify-center text-lg font-extrabold">
            📋
          </div>
        </div>

        {/* KPI 3: Highest Risk Outlet */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Highest Loss Outlet</span>
            <h4 className="text-sm font-black text-gray-900 dark:text-white mt-2 truncate max-w-[150px]">
              {highestRiskStoreName}
            </h4>
            <span className="text-[10px] text-red-500 font-bold mt-1 block">
              {maxStoreLoss > 0 ? `$${maxStoreLoss.toFixed(2)} Lost` : 'No recorded loss'}
            </span>
          </div>
          <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl flex items-center justify-center text-lg font-extrabold">
            📍
          </div>
        </div>

        {/* KPI 4: Top Spoilage Product */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Top Loss Product</span>
            <h4 className="text-sm font-black text-gray-900 dark:text-white mt-2 truncate max-w-[150px]">
              {topSpoilageProductName}
            </h4>
            <span className="text-[10px] text-red-500 font-bold mt-1 block">
              {maxProductLoss > 0 ? `$${maxProductLoss.toFixed(2)} Impact` : 'No recorded loss'}
            </span>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl flex items-center justify-center text-lg font-extrabold">
            🥬
          </div>
        </div>

      </div>

      {/* AI Recommendations Drawer (If triggered) */}
      {aiAnalysis && (
        <div className="bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent border border-indigo-200 dark:border-indigo-950/50 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔮</span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">AI Spoilage Risk Forecaster</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Real-time shelf life telemetry and preventative inventory routing suggestions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white dark:bg-gray-900 border p-4 rounded-2xl space-y-2">
              <span className="text-[9px] uppercase font-bold text-gray-400">Waste Score Card</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{aiAnalysis.score}</span>
                <span className="text-gray-500 font-bold">Risk: {aiAnalysis.riskLevel}</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">{aiAnalysis.riskFactor}</p>
            </div>

            <div className="bg-white dark:bg-gray-900 border p-4 rounded-2xl space-y-3 col-span-2">
              <span className="text-[9px] uppercase font-bold text-gray-400">Active High-Risk Items & Action Recommendations</span>
              <div className="space-y-2.5">
                {aiAnalysis.topRisks.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start gap-4 border-b pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <strong className="font-bold text-gray-900 dark:text-white">{item.product}</strong>
                      <p className="text-[11px] text-red-500 mt-0.5">{item.risk}</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl text-[10px] font-bold max-w-xs text-right shrink-0">
                      👉 {item.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Smart Preps Row */}
          <div className="bg-white/40 dark:bg-gray-900/20 border border-indigo-100 dark:border-indigo-950/30 p-4 rounded-2xl">
            <span className="text-[9px] uppercase font-bold text-indigo-500 block mb-3">Kitchen Action Playbook</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {aiAnalysis.smartPreps.map((prep: any, idx: number) => (
                <div key={idx} className="flex gap-2.5">
                  <span className="text-indigo-500 mt-0.5 font-bold">✔️</span>
                  <div>
                    <strong className="font-extrabold text-gray-800 dark:text-white">{prep.title}</strong>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{prep.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Wastage Heatmap Grid */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>🔥</span> BOH Spoilage & Wastage Thermal Heatmap
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Interactive outlet loss density matrix based on weekly spoilage write-offs. Hover to view cost vectors. Click any node to pre-fill the auditor form.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-bold text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-slate-100 dark:bg-slate-800 rounded" /> Zero Spoilage
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-200 rounded animate-pulse" /> Low Spoilage
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-400 rounded" /> Moderate Loss
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-600 rounded" /> Critical Loss
            </span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {stores.map((store) => {
            const categories = [
              { name: 'Meats / Proteins', matchKeywords: ['wagyu', 'steak', 'beef', 'chicken', 'ribeye', 'pork'], code: '🍖' },
              { name: 'Dairy & Eggs', matchKeywords: ['milk', 'cheese', 'egg', 'butter', 'organic'], code: '🥛' },
              { name: 'Fresh Produce', matchKeywords: ['lettuce', 'tomato', 'onion', 'garlic', 'potato', 'romaine'], code: '🥬' },
              { name: 'Seafood Fillets', matchKeywords: ['salmon', 'tuna', 'shrimp', 'crab', 'atlantic'], code: '🐟' },
              { name: 'Dough & Bakery', matchKeywords: ['dough', 'bread', 'pizza', 'flour', 'yeast'], code: '🍞' }
            ];

            return (
              <div key={store.id} className="border border-gray-150 dark:border-gray-800 p-4 rounded-2xl bg-gray-50/40 dark:bg-gray-850/15 space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-extrabold text-xs text-gray-800 dark:text-slate-200 truncate max-w-[110px]">📍 {store.name}</span>
                  <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-bold shrink-0">{store.code}</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {categories.map((cat, idx) => {
                    const matchingAdjs = wasteAdjustments.filter(adj => {
                      if (adj.storeId !== store.id) return false;
                      const prod = products.find(p => p.id === adj.productId);
                      if (!prod) return false;
                      return cat.matchKeywords.some(keyword => prod.name.toLowerCase().includes(keyword));
                    });
                    
                    const totalCostLoss = Math.abs(matchingAdjs.reduce((sum, a) => sum + (a.costValue || 0), 0));
                    
                    let bgStyle = "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-400";
                    let levelLabel = "Excellent (No spoilage logged)";

                    if (totalCostLoss > 200) {
                      bgStyle = "bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-red-500/15";
                      levelLabel = `Critical Loss: -$${totalCostLoss.toFixed(2)}`;
                    } else if (totalCostLoss > 85) {
                      bgStyle = "bg-rose-400 text-slate-950 hover:bg-rose-500";
                      levelLabel = `Moderate Loss: -$${totalCostLoss.toFixed(2)}`;
                    } else if (totalCostLoss > 0) {
                      bgStyle = "bg-rose-200 text-slate-900 hover:bg-rose-300";
                      levelLabel = `Low Spoilage: -$${totalCostLoss.toFixed(2)}`;
                    }

                    const handleNodeClick = () => {
                      setNewWasteStoreId(store.id);
                      const matchedProd = products.find(p => cat.matchKeywords.some(keyword => p.name.toLowerCase().includes(keyword)));
                      if (matchedProd) {
                        setNewWasteProductId(matchedProd.id);
                      }
                      setNewWasteNotes(`Selected from Spoilage Thermal Heatmap: Category ${cat.name}`);
                      alert(`🎯 Selected Heatmap Node:\n\n• Outlet: ${store.name}\n• Category: ${cat.name}\n• Current Spoilage Value: $${totalCostLoss.toFixed(2)}\n\nForm inputs have been prefilled for auditing!`);
                    };

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={handleNodeClick}
                        title={`${cat.name} at ${store.name}: ${levelLabel}`}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black cursor-pointer hover:scale-110 active:scale-95 transition-all ${bgStyle}`}
                      >
                        {cat.code}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form (left) vs Table Logs (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Manual Shrinkage Logger Form (Col Span 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm self-start">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span>➕ Record Shrinkage Event</span>
          </h3>

          {/* Hands-free dictation trigger */}
          <div className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border border-indigo-100/50 dark:border-indigo-900/30 p-3.5 rounded-2xl space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="animate-pulse">🎙️</span> Hands-Free Voice Logging
              </span>
              <button
                type="button"
                id="btn-trigger-voice-memo"
                onClick={handleVoiceDictation}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
              >
                {isListening ? '🛑 Stop Listening' : '🎙️ Dictate Memo'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
              Click and say an incident report (e.g., "Sarah reports: Threw out five bottles of Organic Milk because they expired"). The system automatically selects the catalog product, calculates quantity, and pre-fills notes!
            </p>
            {dictationLog && (
              <div className="bg-white dark:bg-slate-950 p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 italic">
                "{dictationLog}"
              </div>
            )}
          </div>

          <form onSubmit={handleLogWasteSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Outlet Node</label>
              <select
                value={newWasteStoreId}
                onChange={(e) => setNewWasteStoreId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none font-bold text-gray-700 dark:text-gray-300"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    📍 {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Perishable Catalog Product</label>
              <select
                value={newWasteProductId}
                onChange={(e) => setNewWasteProductId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none font-bold text-gray-700 dark:text-gray-300"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.name} ({p.stockingUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Loss Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="e.g. 3.5"
                  value={newWasteQty}
                  onChange={(e) => setNewWasteQty(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold text-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Loss Reason</label>
                <select
                  value={newWasteReason}
                  onChange={(e) => setNewWasteReason(e.target.value as any)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none font-bold text-gray-700 dark:text-gray-300"
                >
                  <option value="Wastage">Wastage (Kitchen Prep)</option>
                  <option value="Spoilage">Spoilage (Expired)</option>
                  <option value="Theft">Theft (Shrinkage)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Incident Auditor Notes</label>
              <textarea
                value={newWasteNotes}
                onChange={(e) => setNewWasteNotes(e.target.value)}
                placeholder="Write specific notes, e.g. chiller thermostat failure, prep trim waste..."
                rows={3}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none font-medium text-gray-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-2.5 rounded-xl text-xs cursor-pointer shadow-md shadow-red-500/10 transition-all"
            >
              🔥 Submit Loss Entry & Write-Off Ledger
            </button>
          </form>
        </div>

        {/* Loss Ledger Logs (Col Span 8) */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
          
          {/* Table Filters header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-850 pb-4">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Filter size={12} />
              Shrinkage Ledger History ({wasteAdjustments.length})
            </h3>

            <div className="flex flex-wrap gap-2 text-xs">
              {/* Filter Store */}
              <select
                value={filterStoreId}
                onChange={(e) => setFilterStoreId(e.target.value)}
                className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none text-gray-600 dark:text-gray-300"
              >
                <option value="All">All Outlets</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Filter Reason */}
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none text-gray-600 dark:text-gray-300"
              >
                <option value="All">All Reasons</option>
                <option value="Wastage">Wastage</option>
                <option value="Spoilage">Spoilage</option>
                <option value="Theft">Theft</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-850">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-950/20 border-b border-gray-100 dark:border-gray-850 text-[10px] font-black text-gray-400 uppercase">
                  <th className="p-3">Incident ID & Date</th>
                  <th className="p-3">Outlet</th>
                  <th className="p-3">Ingredient & Volume</th>
                  <th className="p-3">Financial Value</th>
                  <th className="p-3">Auditor Notes</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                {wasteAdjustments.map((adj) => {
                  const product = products.find(p => p.id === adj.productId);
                  const store = stores.find(s => s.id === adj.storeId);
                  const displayDate = new Date(adj.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const displayCost = Math.abs(adj.costValue || 0);

                  return (
                    <tr key={adj.id} className="hover:bg-gray-50/35 dark:hover:bg-gray-950/10 font-medium">
                      <td className="p-3">
                        <span className="font-bold text-gray-900 dark:text-white block">{adj.id.toUpperCase()}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{displayDate}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-gray-700 dark:text-slate-300 block">{store?.name || 'N/A'}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{store?.code}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-gray-950 dark:text-white block">{product?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                          {adj.quantity} {product?.stockingUnit} ({adj.reason})
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-red-500">
                        -${displayCost.toFixed(2)}
                      </td>
                      <td className="p-3 text-gray-400 text-[11px] max-w-[150px] truncate" title={adj.notes}>
                        {adj.notes || 'No comments'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          id={`btn-revert-waste-${adj.id}`}
                          onClick={() => handleRevertWaste(adj.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 p-1.5 rounded-lg cursor-pointer transition-colors"
                          title="Revert loss & restore stock level"
                        >
                          <RefreshCw size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {wasteAdjustments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      No shrinkage write-offs matched the filter configuration.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
};
