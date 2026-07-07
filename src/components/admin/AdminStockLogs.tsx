/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeftRight, Trash2, Plus, AlertTriangle, FileText, Check, Truck, LogIn, LogOut, Phone, Mail } from 'lucide-react';
import { StockTransfer, StockAdjustment, Supplier, Store, Product, Inventory } from '../../types';

interface AdminStockLogsProps {
  transfers: StockTransfer[];
  setTransfers: React.Dispatch<React.SetStateAction<StockTransfer[]>>;
  adjustments: StockAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  stores: Store[];
  products: Product[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
}

export const AdminStockLogs: React.FC<AdminStockLogsProps> = ({
  transfers,
  setTransfers,
  adjustments,
  setAdjustments,
  suppliers,
  setSuppliers,
  stores,
  products,
  setInventories,
}) => {
  const [activeTab, setActiveTab] = useState<'transfers' | 'adjustments' | 'suppliers'>('transfers');

  // Request Transfer Form State
  const [fromStoreId, setFromStoreId] = useState(stores[1]?.id || '');
  const [toStoreId, setToStoreId] = useState(stores[0]?.id || '');
  const [transferLines, setTransferLines] = useState<{ productId: string; quantity: number }[]>([]);
  const [transferNotes, setTransferNotes] = useState('');

  // Add Adjustment State
  const [adjProductId, setAdjProductId] = useState(products[0]?.id || '');
  const [adjStoreId, setAdjStoreId] = useState(stores[0]?.id || '');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState<StockAdjustment['reason']>('Wastage');
  const [adjNotes, setAdjNotes] = useState('');

  // Add Supplier State
  const [supName, setSupName] = useState('');
  const [supCode, setSupCode] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supLead, setSupLead] = useState('2');
  const [supMin, setSupMin] = useState('250.00');
  const [supTerms, setSupTerms] = useState('Net 30');

  // Submit Inter-store Transfer Request
  const handleRequestTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromStoreId === toStoreId) {
      alert('Routing Error: Source and destination stores cannot be identical.');
      return;
    }
    if (transferLines.length === 0) {
      alert('Add at least one transfer item line.');
      return;
    }

    const newTransfer: StockTransfer = {
      id: `tr-${Date.now().toString().slice(-4)}`,
      fromStoreId,
      toStoreId,
      requestDate: new Date().toISOString(),
      status: 'Requested',
      requestedBy: 'Marcus Brody',
      notes: transferNotes,
      items: transferLines.map((line) => {
        const prod = products.find((p) => p.id === line.productId)!;
        return {
          productId: line.productId,
          quantity: line.quantity,
          unit: prod.stockingUnit,
        };
      }),
    };

    setTransfers((prev) => [newTransfer, ...prev]);
    setTransferLines([]);
    setTransferNotes('');
    alert('Stock transfer requested! Dispatched into logistical buffers.');
  };

  const handleAddTransferLine = () => {
    if (products.length === 0) return;
    setTransferLines([...transferLines, { productId: products[0].id, quantity: 1 }]);
  };

  const handleRemoveTransferLine = (idx: number) => {
    setTransferLines(transferLines.filter((_, i) => i !== idx));
  };

  // Dispatch Transfer (Mark In Transit)
  const handleDispatchTransfer = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: 'In Transit' } : t))
    );
  };

  // Complete Transfer (Mark Completed, deduct source, add destination)
  const handleCompleteTransfer = (transferId: string) => {
    const t = transfers.find((trans) => trans.id === transferId);
    if (!t) return;

    // 1. Mark status completed
    setTransfers((prev) =>
      prev.map((trans) => (trans.id === transferId ? { ...trans, status: 'Completed', transferDate: new Date().toISOString() } : trans))
    );

    // 2. Perform double-entry stock ledger updates:
    // Source: Deduct quantities
    // Destination: Add quantities
    setInventories((prev) =>
      prev.map((inv) => {
        const matchedItem = t.items.find((item) => item.productId === inv.productId);
        if (!matchedItem) return inv;

        if (inv.storeId === t.fromStoreId) {
          return {
            ...inv,
            theoreticalStock: Math.max(0, inv.theoreticalStock - matchedItem.quantity),
          };
        }

        if (inv.storeId === t.toStoreId) {
          return {
            ...inv,
            theoreticalStock: inv.theoreticalStock + matchedItem.quantity,
          };
        }

        return inv;
      })
    );

    alert('Stock transfer finalized! Double-entry stock routing complete.');
  };

  // Submit manual adjustment logs (Theft, wastage, audit gains/losses)
  const handleAddAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(adjQty);
    if (isNaN(qty) || qty === 0) {
      alert('Please enter a valid non-zero adjustment quantity');
      return;
    }

    const prod = products.find((p) => p.id === adjProductId);
    if (!prod) return;

    const unitCost = prod.basePrice / prod.unitsPerPackage;
    const value = qty * unitCost;

    const newAdj: StockAdjustment = {
      id: `adj-man-${Date.now().toString().slice(-4)}`,
      productId: adjProductId,
      storeId: adjStoreId,
      date: new Date().toISOString(),
      quantity: qty,
      reason: adjReason,
      costValue: value,
      notes: adjNotes,
      performedBy: 'Marcus Brody',
    };

    // Update theoretical inventory count immediately
    setInventories((prev) =>
      prev.map((inv) => {
        if (inv.storeId === adjStoreId && inv.productId === adjProductId) {
          return {
            ...inv,
            theoreticalStock: Math.max(0, inv.theoreticalStock + qty),
          };
        }
        return inv;
      })
    );

    setAdjustments((prev) => [newAdj, ...prev]);

    // Reset Form
    setAdjQty('');
    setAdjNotes('');
    alert('Inventory adjustment logged! Core warehouse stock updated.');
  };

  // Add Supplier submit
  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSup: Supplier = {
      id: `sup-${Date.now().toString().slice(-4)}`,
      name: supName,
      code: supCode || `SUP-${Date.now().toString().slice(-3)}`,
      contactName: supContact,
      email: supEmail,
      phone: supPhone,
      leadTimeDays: parseInt(supLead) || 2,
      minOrderValue: parseFloat(supMin) || 100.0,
      paymentTerms: supTerms,
      isActive: true,
    };

    setSuppliers((prev) => [...prev, newSup]);

    // Reset
    setSupName('');
    setSupCode('');
    setSupContact('');
    setSupEmail('');
    setSupPhone('');
    alert('Supplier contract activated inside Master Supply records.');
  };

  return (
    <div className="space-y-6" id="admin-stocklogs-panel">
      {/* Subtab selection */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <button
          id="btn-subtab-logs-transfers"
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'transfers'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          Inter-Store Transfers ({transfers.filter((t)=>t.status === 'Requested' || t.status === 'In Transit').length})
        </button>

        <button
          id="btn-subtab-logs-adjustments"
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'adjustments'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          Wastage & Adjustments Logger
        </button>

        <button
          id="btn-subtab-logs-suppliers"
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          Contract Suppliers Management
        </button>
      </div>

      {/* INTER-STORE TRANSFERS VIEW */}
      {activeTab === 'transfers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Request Form (SPAN 5) */}
          <form onSubmit={handleRequestTransferSubmit} className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">Request Inter-store Dispatch</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Source Store</label>
                <select
                  id="select-transfer-from"
                  value={fromStoreId}
                  onChange={(e) => setFromStoreId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Destination Store</label>
                <select
                  id="select-transfer-to"
                  value={toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Line Items</span>
                <button
                  id="btn-transfer-add-line"
                  type="button"
                  onClick={handleAddTransferLine}
                  className="text-[10px] font-bold text-orange-500 hover:underline cursor-pointer"
                >
                  + Add Line
                </button>
              </div>

              {transferLines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    id={`transfer-line-prod-${idx}`}
                    value={line.productId}
                    onChange={(e) => {
                      const updated = [...transferLines];
                      updated[idx].productId = e.target.value;
                      setTransferLines(updated);
                    }}
                    className="flex-1 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1 text-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.stockingUnit})
                      </option>
                    ))}
                  </select>
                  <input
                    id={`transfer-line-qty-${idx}`}
                    type="number"
                    min="1"
                    required
                    value={line.quantity}
                    onChange={(e) => {
                      const updated = [...transferLines];
                      updated[idx].quantity = parseInt(e.target.value) || 1;
                      setTransferLines(updated);
                    }}
                    className="w-16 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1 text-center text-xs"
                  />
                  <button
                    id={`btn-remove-transfer-line-${idx}`}
                    type="button"
                    onClick={() => handleRemoveTransferLine(idx)}
                    className="text-red-500 cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Logistics Notes</label>
              <textarea
                id="textarea-transfer-notes"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Write reason for urgent stock swap..."
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none h-16 resize-none"
              />
            </div>

            <button
              id="btn-transfer-submit"
              type="submit"
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-2 rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Dispatch Transfer Request
            </button>
          </form>

          {/* Transfers Activity Logs list (SPAN 7) */}
          <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">Active Dispatch Matrix</h3>
            
            <div className="space-y-4">
              {transfers.map((t) => {
                const fromName = stores.find(s=>s.id === t.fromStoreId)?.name || 'Downtown';
                const toName = stores.find(s=>s.id === t.toStoreId)?.name || 'Uptown';
                return (
                  <div key={t.id} className="border border-gray-50 dark:border-gray-850 rounded-2xl p-4 space-y-3 bg-gray-50/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                          t.status === 'In Transit' ? 'bg-indigo-50 text-indigo-600 animate-pulse' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {t.status}
                        </span>
                        <span className="font-mono text-xs font-bold">Transfer #{t.id}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{new Date(t.requestDate).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="text-center font-bold px-2 py-1.5 bg-white dark:bg-gray-900 border rounded-xl w-5/12">
                        <LogOut size={12} className="inline mr-1 text-red-500" /> {fromName}
                      </div>
                      <ArrowLeftRight size={14} className="text-gray-400" />
                      <div className="text-center font-bold px-2 py-1.5 bg-white dark:bg-gray-900 border rounded-xl w-5/12">
                        <LogIn size={12} className="inline mr-1 text-emerald-500" /> {toName}
                      </div>
                    </div>

                    {/* Lines list */}
                    <div className="text-[11px] bg-white dark:bg-gray-900 rounded-xl p-2.5 border">
                      {t.items.map((item, idx) => {
                        const prod = products.find(p=>p.id === item.productId);
                        return (
                          <div key={idx} className="flex justify-between">
                            <span>{prod?.name}</span>
                            <span className="font-bold font-mono">{item.quantity} {item.unit}s</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end pt-1">
                      {t.status === 'Requested' && (
                        <button
                          id={`btn-transfer-dispatch-${t.id}`}
                          onClick={() => handleDispatchTransfer(t.id)}
                          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-sm"
                        >
                          <Truck size={12} /> Dispatch (In Transit)
                        </button>
                      )}

                      {t.status === 'In Transit' && (
                        <button
                          id={`btn-transfer-complete-${t.id}`}
                          onClick={() => handleCompleteTransfer(t.id)}
                          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-sm"
                        >
                          <Check size={12} /> Confirm Receipt & Swap Inventory
                        </button>
                      )}

                      {t.status === 'Completed' && (
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                          <Check size={12} /> Completed & Re-balanced
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WASTAGE & ADJUSTMENTS VIEW */}
      {activeTab === 'adjustments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Log adjustment form (SPAN 5) */}
          <form onSubmit={handleAddAdjustmentSubmit} className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">Log Manual Stock Depletion</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Location Outlet</label>
                <select
                  id="select-adj-store"
                  value={adjStoreId}
                  onChange={(e) => setAdjStoreId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Deduction Reason</label>
                <select
                  id="select-adj-reason"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value as StockAdjustment['reason'])}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                >
                  <option value="Wastage">Wastage (Chef error)</option>
                  <option value="Spoilage">Spoilage (Expired)</option>
                  <option value="Theft">Theft</option>
                  <option value="Audit Gain">Audit Gain (Found extra)</option>
                  <option value="Audit Loss">Audit Loss</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Target Product Node</label>
                <select
                  id="select-adj-product"
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Unit: {p.stockingUnit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Deduction Quantity (Negative for loss, Positive for gains)</label>
              <input
                id="input-adj-qty"
                type="number"
                step="0.01"
                required
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                placeholder="e.g. -2.5 (Loss) or 1.2 (Gain)"
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Incident Report Notes</label>
              <textarea
                id="textarea-adj-notes"
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                placeholder="Write exact incident description..."
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none h-16 resize-none"
              />
            </div>

            <button
              id="btn-adj-submit"
              type="submit"
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-2 rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Log Incident & Update Stock
            </button>
          </form>

          {/* Adjustments audit list (SPAN 7) */}
          <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-4">Historical Wastage Logs</h3>

            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
              {adjustments.map((a) => {
                const prod = products.find(p => p.id === a.productId);
                const store = stores.find(s => s.id === a.storeId);
                return (
                  <div key={a.id} className="border-b border-gray-50 dark:border-gray-850 pb-3 last:border-0 last:pb-0 text-xs flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          a.reason === 'Wastage' || a.reason === 'Spoilage' ? 'bg-red-50 text-red-600 border border-red-100' :
                          a.reason === 'Recipe Outward' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {a.reason}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">{prod?.name || 'Raw material'}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                        Outlet: {store?.name} • Quantity: {a.quantity} {prod?.stockingUnit}s
                      </p>
                      {a.notes && <p className="text-[10px] text-gray-500 italic mt-1 bg-gray-50 dark:bg-gray-850 p-2 rounded-lg">"{a.notes}"</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-mono font-bold text-xs ${a.costValue < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {a.costValue < 0 ? '-' : '+'}${Math.abs(a.costValue).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIERS VIEW */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Supplier Form (SPAN 5) */}
          <form onSubmit={handleAddSupplierSubmit} className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">Register Supplier Contract</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Supplier Name</label>
                <input
                  id="input-sup-name"
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Sysco Food Services"
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Universal Vendor Code</label>
                <input
                  id="input-sup-code"
                  type="text"
                  required
                  value={supCode}
                  onChange={(e) => setSupCode(e.target.value)}
                  placeholder="SUP-SYSCO"
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Lead Time (Days)</label>
                <input
                  id="input-sup-lead"
                  type="number"
                  required
                  value={supLead}
                  onChange={(e) => setSupLead(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Min order value ($)</label>
                <input
                  id="input-sup-min"
                  type="number"
                  required
                  value={supMin}
                  onChange={(e) => setSupMin(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Payment Aging</label>
                <select
                  id="select-sup-terms"
                  value={supTerms}
                  onChange={(e) => setSupTerms(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2 py-2 text-xs focus:outline-none animate-none"
                >
                  <option value="Net 30">Net 30</option>
                  <option value="Net 15">Net 15</option>
                  <option value="COD">Cash on delivery</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Contact Rep</label>
                <input
                  id="input-sup-contact"
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="Robert Vance"
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Hotline Phone</label>
                <input
                  id="input-sup-phone"
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="555-0155"
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Routing Email</label>
              <input
                id="input-sup-email"
                type="email"
                required
                value={supEmail}
                onChange={(e) => setSupEmail(e.target.value)}
                placeholder="orders@vance.com"
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <button
              id="btn-sup-submit"
              type="submit"
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-2 rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Activate Supplier Contract
            </button>
          </form>

          {/* Suppliers registry list (SPAN 7) */}
          <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">Sourcing Directory</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map((sup) => (
                <div key={sup.id} className="border border-gray-50 dark:border-gray-850 rounded-2xl p-4.5 bg-gray-50/40">
                  <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wide block">{sup.code}</span>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white mt-1 leading-snug">{sup.name}</h4>
                  
                  <div className="space-y-1.5 mt-3 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Phone size={10} className="text-gray-400" /> <span>{sup.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail size={10} className="text-gray-400" /> <span>{sup.email}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 font-mono text-[10px] text-gray-400 flex justify-between">
                      <span>Terms: <strong>{sup.paymentTerms}</strong></span>
                      <span>Min Order: <strong>${sup.minOrderValue}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
