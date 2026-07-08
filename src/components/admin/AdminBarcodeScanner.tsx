/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, ShieldAlert, CheckCircle, RefreshCw, Layers, Plus, Minus, FileText, AlertTriangle } from 'lucide-react';
import { Store, Product, Inventory, StockAdjustment } from '../../types';

interface AdminBarcodeScannerProps {
  stores: Store[];
  products: Product[];
  inventories: Inventory[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  adjustments: StockAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
  currentUser: any;
}

export const AdminBarcodeScanner: React.FC<AdminBarcodeScannerProps> = ({
  stores,
  products,
  inventories,
  setInventories,
  adjustments,
  setAdjustments,
  currentUser,
}) => {
  const [useDeviceCamera, setUseDeviceCamera] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scannedInventory, setScannedInventory] = useState<Inventory | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<Array<{
    id: string;
    productName: string;
    sku: string;
    timestamp: string;
    action: string;
  }>>([]);

  // Quick action states
  const [auditQty, setAuditQty] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState<'Wastage' | 'Spoilage' | 'Theft'>('Spoilage');
  const [wasteNotes, setWasteNotes] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setCameraPermissionError('Could not start live camera feed (Permission denied or no device connected). Standard high-fidelity laser simulator is active!');
      setUseDeviceCamera(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleCameraToggle = () => {
    if (!useDeviceCamera) {
      setUseDeviceCamera(true);
      startCamera();
    } else {
      setUseDeviceCamera(false);
      stopCamera();
    }
  };

  // Play a beautiful synthetic "laser beep" sound using Web Audio API
  const playBeepSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480, ctx.currentTime); // High pitched laser beep
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); // Quick fadeout
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio context could not start:', e);
    }
  };

  // Trigger a simulated laser scan
  const executeScan = (sku: string) => {
    setIsScanning(true);
    setScannedProduct(null);
    setScannedInventory(null);

    // Simulate laser swipe taking 500ms
    setTimeout(() => {
      const product = products.find(p => p.sku === sku || p.id === sku);
      if (product) {
        playBeepSound();
        setScannedProduct(product);
        
        // Find matching inventory record for selected store
        const inventory = inventories.find(
          inv => inv.productId === product.id && inv.storeId === selectedStoreId
        );
        
        setScannedInventory(inventory || {
          id: `inv-new-${Date.now()}`,
          productId: product.id,
          storeId: selectedStoreId,
          theoreticalStock: 0,
          reorderPoint: 5,
          parLevel: 15,
          storageLocation: 'Unassigned Shelf'
        });

        // Add to history log
        setScanHistory(prev => [
          {
            id: `scan-${Date.now().toString().slice(-4)}`,
            productName: product.name,
            sku: product.sku,
            timestamp: new Date().toLocaleTimeString(),
            action: 'Lookup'
          },
          ...prev.slice(0, 9)
        ]);

        // Prefill forms
        setAuditQty((inventory ? inventory.theoreticalStock : 0).toString());
        setWasteQty('');
        setWasteNotes('');
      } else {
        alert(`SKU/Barcode "${sku}" not recognized in the ingredient catalog database.`);
      }
      setIsScanning(false);
    }, 600);
  };

  // Quick Audit Action
  const handleQuickAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct) return;

    const actualCount = parseFloat(auditQty);
    if (isNaN(actualCount) || actualCount < 0) {
      alert('Please enter a valid positive counted stock level.');
      return;
    }

    const currentTheoretical = scannedInventory ? scannedInventory.theoreticalStock : 0;
    const variance = actualCount - currentTheoretical;

    // Update parent inventories state
    setInventories(prev => {
      const exists = prev.some(inv => inv.productId === scannedProduct.id && inv.storeId === selectedStoreId);
      if (exists) {
        return prev.map(inv => {
          if (inv.productId === scannedProduct.id && inv.storeId === selectedStoreId) {
            return { ...inv, theoreticalStock: actualCount };
          }
          return inv;
        });
      } else {
        const newInv: Inventory = {
          id: `inv-gen-${Date.now()}`,
          productId: scannedProduct.id,
          storeId: selectedStoreId,
          theoreticalStock: actualCount,
          reorderPoint: 10,
          parLevel: 25,
          storageLocation: 'Walk-in Storage B'
        };
        return [...prev, newInv];
      }
    });

    // Write audit record to adjustments ledger if there is variance
    if (variance !== 0) {
      const unitCost = scannedProduct.basePrice / scannedProduct.unitsPerPackage;
      const financialValue = variance * unitCost;

      const newAdjustment: StockAdjustment = {
        id: `adj-audit-${Date.now().toString().slice(-4)}`,
        productId: scannedProduct.id,
        storeId: selectedStoreId,
        date: new Date().toISOString(),
        quantity: variance,
        reason: variance > 0 ? 'Audit Gain' : 'Audit Loss',
        costValue: financialValue,
        notes: `Barcoded scanner quick audit. Count changed from ${currentTheoretical} to ${actualCount}.`,
        performedBy: currentUser?.name || 'Scanner Terminal',
      };
      setAdjustments(prev => [newAdjustment, ...prev]);
    }

    // Refresh display inventory
    setScannedInventory(prev => prev ? { ...prev, theoreticalStock: actualCount } : null);

    // Update history action
    setScanHistory(prev => prev.map((h, i) => i === 0 ? { ...h, action: 'Audited' } : h));

    alert(`✅ Quick Audit Saved!\n\n• Ingredient: ${scannedProduct.name}\n• New theoretical stock is set to ${actualCount} ${scannedProduct.stockingUnit}.\n• Variance: ${variance > 0 ? '+' : ''}${variance} registered.`);
  };

  // Quick Waste / Spoilage Logger
  const handleQuickWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct) return;

    const qty = parseFloat(wasteQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive write-off quantity.');
      return;
    }

    const currentTheoretical = scannedInventory ? scannedInventory.theoreticalStock : 0;
    if (qty > currentTheoretical) {
      if (!confirm(`Warning: Written-off quantity (${qty}) exceeds current theoretical stock (${currentTheoretical}). Proceed with negative floor inventory balance?`)) {
        return;
      }
    }

    const unitCost = scannedProduct.basePrice / scannedProduct.unitsPerPackage;
    const financialLoss = qty * unitCost;

    const newWasteAdjustment: StockAdjustment = {
      id: `adj-swaste-${Date.now().toString().slice(-4)}`,
      productId: scannedProduct.id,
      storeId: selectedStoreId,
      date: new Date().toISOString(),
      quantity: -qty,
      reason: wasteReason,
      costValue: -financialLoss,
      notes: wasteNotes || `Quick Scanner register: ${wasteReason}`,
      performedBy: currentUser?.name || 'BOH Scanner Terminal',
    };

    // Deduct stock
    setInventories(prev => prev.map(inv => {
      if (inv.productId === scannedProduct.id && inv.storeId === selectedStoreId) {
        return {
          ...inv,
          theoreticalStock: Math.max(0, inv.theoreticalStock - qty)
        };
      }
      return inv;
    }));

    // Add adjustment
    setAdjustments(prev => [newWasteAdjustment, ...prev]);

    // Refresh inventory display
    setScannedInventory(prev => prev ? { ...prev, theoreticalStock: Math.max(0, prev.theoreticalStock - qty) } : null);

    // Update history action
    setScanHistory(prev => prev.map((h, i) => i === 0 ? { ...h, action: `Logged ${wasteReason}` } : h));

    setWasteQty('');
    setWasteNotes('');

    alert(`🔥 Loss Registered!\n\n• Product: ${scannedProduct.name}\n• Discarded: ${qty} ${scannedProduct.stockingUnit}\n• Financial Loss: -$${financialLoss.toFixed(2)}\n• Ledger successfully updated.`);
  };

  return (
    <div className="space-y-6" id="admin-laser-scanner-hub">
      {/* Top Title Banner */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">⚡</span>
            BOH Laser Barcode & QR Scanner
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Simulate or activate laser scans of case SKUs to audit real-time stock levels, check multi-outlet variances, and instantly execute scrap write-offs.
          </p>
        </div>

        {/* Store Node Selector */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Active Store</label>
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value);
              setScannedProduct(null);
            }}
            className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>📍 {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner Viewport & Presets (Col Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Laser Viewport Box */}
          <div className="bg-slate-950 rounded-3xl border-4 border-slate-900 overflow-hidden relative shadow-lg aspect-video flex flex-col items-center justify-center text-white">
            
            {useDeviceCamera ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-radial-gradient from-slate-900 to-black flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
                  <QrCode size={32} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">High-Fidelity Laser Simulation</h4>
                  <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                    Select any case product SKU below to simulate a physical handheld barcode scan and trigger instant beep response.
                  </p>
                </div>
              </div>
            )}

            {/* Glowing Laser Target Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-48 h-24 border-2 border-dashed border-indigo-500/40 rounded-xl relative flex items-center justify-center">
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
                
                {/* Laser line moving up/down */}
                <div className="absolute left-1 right-1 h-0.5 bg-red-500 shadow-md shadow-red-500/80 animate-bounce" style={{ animationDuration: '2.5s' }} />
              </div>
            </div>

            {/* Scanning Laser Line (Secondary indicator) */}
            {isScanning && (
              <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center pointer-events-none">
                <span className="text-red-500 text-xs font-black animate-ping uppercase tracking-widest">TRANSMITTING...</span>
              </div>
            )}

            {/* Floating control buttons */}
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={handleCameraToggle}
                className="bg-slate-900/90 hover:bg-slate-800 text-white font-black rounded-lg text-[9px] uppercase px-3 py-1.5 border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Camera size={10} />
                {useDeviceCamera ? 'Disable Camera' : 'Webcam Scan'}
              </button>
            </div>
          </div>

          {cameraPermissionError && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3.5 rounded-2xl flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{cameraPermissionError}</span>
            </div>
          )}

          {/* Catalog SKU Presets */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm space-y-3.5">
            <div>
              <h3 className="font-extrabold text-xs text-gray-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <span>📦</span> Ingredient Catalog Barcode Presets
              </h3>
              <p className="text-[10px] text-gray-400">
                Click any case packaging SKU label to simulate scanning the inventory box with a physical laser gunsight.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {products.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => executeScan(p.sku)}
                  className="bg-gray-50 hover:bg-indigo-50/50 dark:bg-gray-850 dark:hover:bg-slate-800 border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 text-left flex flex-col justify-between hover:border-indigo-200 transition-all cursor-pointer font-semibold group"
                >
                  <span className="text-gray-900 dark:text-white truncate block max-w-[120px] font-bold">{p.name}</span>
                  <div className="flex items-center justify-between mt-1 text-[9px]">
                    <span className="font-mono text-indigo-500 font-bold group-hover:text-indigo-600">{p.sku}</span>
                    <span className="text-gray-400 italic">({p.stockingUnit})</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Scan Result & Real-time Workflows (Col Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {scannedProduct ? (
            <div className="space-y-6 animate-fade-in">
              
              {/* Product Card */}
              <div className="bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-transparent border border-indigo-150 dark:border-indigo-950 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="bg-indigo-100 dark:bg-indigo-950/55 text-indigo-600 dark:text-indigo-400 font-black px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider">
                      Laser Match Found
                    </span>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mt-2">
                      {scannedProduct.name}
                    </h3>
                    <div className="flex items-center gap-3 font-mono text-[10px] font-bold text-gray-400">
                      <span>SKU: {scannedProduct.sku}</span>
                      <span>•</span>
                      <span>Category: {scannedProduct.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Theoretical Stock</span>
                    <h4 className={`text-2xl font-black mt-1 ${
                      scannedInventory && scannedInventory.theoreticalStock <= (scannedInventory.reorderPoint || 10)
                        ? 'text-red-500'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {scannedInventory ? scannedInventory.theoreticalStock : 0} {scannedProduct.stockingUnit}
                    </h4>
                    {scannedInventory && scannedInventory.theoreticalStock <= scannedInventory.reorderPoint && (
                      <span className="text-[10px] text-red-500 font-black flex items-center gap-0.5 justify-end mt-0.5">
                        ⚠️ Below Reorder Pt ({scannedInventory.reorderPoint})
                      </span>
                    )}
                  </div>
                </div>

                {/* Storage Info Bar */}
                <div className="bg-white/60 dark:bg-slate-900/40 p-3 rounded-2xl border border-indigo-100/30 dark:border-indigo-950/30 flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <span>📍</span> Location: <strong className="text-gray-700 dark:text-slate-200">{scannedInventory?.storageLocation || 'Main Cold Locker'}</strong>
                  </span>
                  <span className="text-gray-400">
                    Par level: <strong className="text-gray-700 dark:text-slate-200">{scannedInventory?.parLevel || 20} {scannedProduct.stockingUnit}</strong>
                  </span>
                </div>
              </div>

              {/* Action Tabs: Quick Audit vs Spoilage Logging */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Workflow 1: Quick Stocktake Audit */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm space-y-4">
                  <div className="border-b pb-2.5">
                    <h3 className="font-black text-xs text-gray-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle className="text-green-500" size={14} />
                      Terminal Count Audit
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Submit actual physically counted cases to instantly override database count.
                    </p>
                  </div>

                  <form onSubmit={handleQuickAuditSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                        Counted Stock Volume ({scannedProduct.stockingUnit})
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={auditQty}
                          onChange={(e) => setAuditQty(e.target.value)}
                          placeholder="Counted qty"
                          className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-white focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-[10px] font-bold text-gray-400">
                          {scannedProduct.stockingUnit}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAuditQty((parseFloat(auditQty || '0') + 1).toString())}
                        className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-white p-2 rounded-xl text-xs flex-1 font-bold cursor-pointer transition-colors"
                      >
                        +1 Case
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditQty(Math.max(0, parseFloat(auditQty || '0') - 1).toString())}
                        className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-white p-2 rounded-xl text-xs flex-1 font-bold cursor-pointer transition-colors"
                      >
                        -1 Case
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-2 rounded-xl text-[10px] uppercase cursor-pointer transition-colors shadow-sm"
                    >
                      💾 Commit Count Audit
                    </button>
                  </form>
                </div>

                {/* Workflow 2: Quick Spoilage Write-Off */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm space-y-4">
                  <div className="border-b pb-2.5">
                    <h3 className="font-black text-xs text-gray-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                      <AlertTriangle className="text-red-500" size={14} />
                      Log Case Loss
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Instantly record spillage, kitchen prep waste, or theft and subtract from stock.
                    </p>
                  </div>

                  <form onSubmit={handleQuickWasteSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                          Discarded Qty
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={wasteQty}
                          onChange={(e) => setWasteQty(e.target.value)}
                          placeholder="Qty"
                          className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-800 dark:text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                          Loss Vector
                        </label>
                        <select
                          value={wasteReason}
                          onChange={(e) => setWasteReason(e.target.value as any)}
                          className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl px-2 py-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-300 focus:outline-none"
                        >
                          <option value="Spoilage">Spoilage</option>
                          <option value="Wastage">Wastage</option>
                          <option value="Theft">Theft</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={wasteNotes}
                        onChange={(e) => setWasteNotes(e.target.value)}
                        placeholder="Incident comment (e.g. thermostat leak)"
                        className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl px-2.5 py-1.5 text-[10px] font-medium text-gray-700 dark:text-gray-300 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-2 rounded-xl text-[10px] uppercase cursor-pointer transition-colors shadow-sm"
                    >
                      🔥 Log Write-Off & Scrap
                    </button>
                  </form>
                </div>

              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-150 dark:border-gray-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3 aspect-[4/3] max-h-[380px]">
              <span className="text-4xl">🔫</span>
              <h4 className="font-extrabold text-sm text-gray-800 dark:text-slate-200">Terminal Standby Mode</h4>
              <p className="text-[10px] text-gray-400 max-w-xs leading-normal">
                handheld terminal laser is armed and awaiting target input. Click one of the ingredient barcode buttons on the left or type a SKU code to trigger lookup telemetry.
              </p>
            </div>
          )}

          {/* Scanned logs history */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm space-y-3">
            <h3 className="font-extrabold text-xs text-gray-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <span>📋</span> Scanned Terminal Log
            </h3>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-850 max-h-[160px] overflow-y-auto pr-1">
              {scanHistory.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-[11px] font-semibold">
                  <div>
                    <span className="text-gray-900 dark:text-white block font-bold">{log.productName}</span>
                    <span className="text-[9px] text-gray-400 font-mono">SKU: {log.sku} • {log.timestamp}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    log.action === 'Audited'
                      ? 'bg-green-50 dark:bg-green-950/20 text-green-600'
                      : log.action.startsWith('Logged')
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {log.action}
                  </span>
                </div>
              ))}

              {scanHistory.length === 0 && (
                <p className="text-center py-6 text-[10px] text-gray-400 font-medium">
                  Scan terminal feed empty. Scanned ingredients will be logged here.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
