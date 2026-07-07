/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingCart, FileText, CheckCircle, XCircle, ArrowLeftRight, Truck, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { PurchaseOrder, Supplier, Product, Store, Inventory } from '../../types';

interface AdminOrdersProps {
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  suppliers: Supplier[];
  products: Product[];
  stores: Store[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  purchaseOrders,
  setPurchaseOrders,
  suppliers,
  products,
  stores,
  setInventories,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'approve' | 'deliveries' | 'returns'>('approve');

  // Create Order State
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
  const [poLines, setPoLines] = useState<{ productId: string; quantity: number }[]>([]);

  // Detailed Discrepancy Matching State for Delivery Receiving
  const [activeReceivingPoId, setActiveReceivingPoId] = useState<string | null>(null);
  const [receivingQuantities, setReceivingQuantities] = useState<{ [key: string]: number }>({});
  const [returningQuantities, setReturningQuantities] = useState<{ [key: string]: number }>({});

  const supplier = suppliers.find((s) => s.id === selectedSupplierId);
  const supplierProducts = products.filter((p) => p.supplierId === selectedSupplierId && !p.isArchived);

  // Line calculations for PO Creation
  const handleAddLine = () => {
    if (supplierProducts.length === 0) return;
    setPoLines([...poLines, { productId: supplierProducts[0].id, quantity: 1 }]);
  };

  const handleRemoveLine = (idx: number) => {
    setPoLines(poLines.filter((_, i) => i !== idx));
  };

  const calculatePoTotal = () => {
    return poLines.reduce((sum, line) => {
      const prod = products.find((p) => p.id === line.productId);
      if (!prod) return sum;
      return sum + prod.basePrice * line.quantity;
    }, 0);
  };

  // Submit purchase order
  const handleCreatePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (poLines.length === 0) {
      alert('Add at least one line item');
      return;
    }

    const total = calculatePoTotal();
    const minVal = supplier?.minOrderValue || 0;
    if (total < minVal) {
      alert(`Vendor Constraint: Sysco/Produce requirements mandate a minimum order of $${minVal}. Current: $${total}`);
      return;
    }

    const newPO: PurchaseOrder = {
      id: `po-${Date.now().toString().slice(-4)}`,
      supplierId: selectedSupplierId,
      storeId: selectedStoreId,
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + (supplier?.leadTimeDays || 2) * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Pending Approval',
      totalAmount: total,
      createdBy: 'Sarah Jenkins',
      items: poLines.map((line) => {
        const prod = products.find((p) => p.id === line.productId)!;
        return {
          productId: line.productId,
          quantityOrdered: line.quantity,
          packageUnit: prod.packagingUnit,
          costPerPackage: prod.basePrice,
          totalCost: prod.basePrice * line.quantity,
        };
      }),
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    setPoLines([]);
    setActiveTab('approve');
  };

  // Approve PO
  const handleApprovePO = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'Approved', approvedBy: 'Sarah Jenkins' } : po))
    );
  };

  // Dispatch PO
  const handleDispatchPO = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'Sent' } : po))
    );
  };

  // Reject PO
  const handleRejectPO = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'Rejected' } : po))
    );
  };

  // Initiate receiving form
  const handleStartReceiving = (po: PurchaseOrder) => {
    setActiveReceivingPoId(po.id);
    const initialRec: { [key: string]: number } = {};
    const initialRet: { [key: string]: number } = {};
    po.items.forEach((item) => {
      initialRec[item.productId] = item.quantityOrdered;
      initialRet[item.productId] = 0;
    });
    setReceivingQuantities(initialRec);
    setReturningQuantities(initialRet);
  };

  // Submit delivery receiving and update physical inventory stock counts
  const handleSubmitDelivery = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    setPurchaseOrders((prev) =>
      prev.map((p) => {
        if (p.id !== poId) return p;
        return {
          ...p,
          status: 'Delivered',
          items: p.items.map((item) => ({
            ...item,
            quantityReceived: receivingQuantities[item.productId] || 0,
            quantityReturned: returningQuantities[item.productId] || 0,
          })),
        };
      })
    );

    // Update theoretical stock inside matching location inventory nodes!
    // Added stock = Received Packages * Units Per Package
    setInventories((prev) =>
      prev.map((inv) => {
        if (inv.storeId !== po.storeId) return inv;
        const poItem = po.items.find((item) => item.productId === inv.productId);
        if (!poItem) return inv;

        const receivedPkgs = receivingQuantities[inv.productId] || 0;
        const prod = products.find((p) => p.id === inv.productId);
        const multiplier = prod ? prod.unitsPerPackage : 1;

        const addedStock = receivedPkgs * multiplier;

        return {
          ...inv,
          theoreticalStock: inv.theoreticalStock + addedStock,
        };
      })
    );

    setActiveReceivingPoId(null);
    alert('Delivery accepted! Local inventory balances have been increased.');
  };

  return (
    <div className="space-y-6" id="admin-orders-panel">
      {/* Tab select menu */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <button
          id="btn-subtab-order-approve"
          onClick={() => { setActiveTab('approve'); setActiveReceivingPoId(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'approve'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          Approval Queue ({purchaseOrders.filter((po) => po.status === 'Pending Approval').length})
        </button>

        <button
          id="btn-subtab-order-create"
          onClick={() => { setActiveTab('create'); setActiveReceivingPoId(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          Create Purchase Order
        </button>

        <button
          id="btn-subtab-order-deliveries"
          onClick={() => { setActiveTab('deliveries'); setActiveReceivingPoId(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'deliveries'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          Delivery Gate (Receiving)
        </button>
      </div>

      {/* CREATE PURCHASE ORDER VIEW */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreatePurchaseOrder} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white mb-5 tracking-wider">Purchase Order Procurement</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Target Vendor</label>
              <select
                id="select-po-supplier"
                value={selectedSupplierId}
                onChange={(e) => { setSelectedSupplierId(e.target.value); setPoLines([]); }}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.paymentTerms})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Destination Location</label>
              <select
                id="select-po-store"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier constraints notification */}
          {supplier && (
            <div className="bg-gray-50 dark:bg-gray-850 border p-4 rounded-2xl flex items-center justify-between mb-6">
              <div className="text-xs">
                <span className="font-bold text-gray-900 dark:text-white">Vendor Constraint Metrics:</span>
                <span className="ml-2 text-gray-500">
                  Min Purchase Amount: <strong className="text-gray-800 dark:text-white">${supplier.minOrderValue}</strong> • Contracted Lead Time: <strong>{supplier.leadTimeDays} days</strong>
                </span>
              </div>
            </div>
          )}

          {/* Lines Table */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">PO Line Items</h4>
              <button
                id="btn-po-add-line"
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
              >
                <Plus size={12} /> Add Line SKU
              </button>
            </div>

            <div className="space-y-3">
              {poLines.map((line, idx) => {
                const matchedProd = products.find((p) => p.id === line.productId);
                return (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center border border-gray-100 dark:border-gray-850 p-4.5 rounded-2xl bg-gray-50/40 dark:bg-gray-850/10">
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Ingredient Product</label>
                      <select
                        id={`po-line-prod-select-${idx}`}
                        value={line.productId}
                        onChange={(e) => {
                          const updated = [...poLines];
                          updated[idx].productId = e.target.value;
                          setPoLines(updated);
                        }}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                      >
                        {supplierProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${p.basePrice.toFixed(2)} / {p.packagingUnit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 flex-1 w-full">
                      <div>
                        <label className="block text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Package Quantity</label>
                        <input
                          id={`po-line-qty-input-${idx}`}
                          type="number"
                          required
                          min="1"
                          value={line.quantity}
                          onChange={(e) => {
                            const updated = [...poLines];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setPoLines(updated);
                          }}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="text-right flex items-center justify-between mt-4">
                        <span className="font-bold text-xs">
                          ${matchedProd ? (matchedProd.basePrice * line.quantity).toFixed(2) : '0.00'}
                        </span>
                        <button
                          id={`po-line-remove-btn-${idx}`}
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {poLines.length === 0 && (
                <div className="text-center py-8 text-gray-400 border border-dashed rounded-2xl">
                  Procurement list is empty. Click Add Line to select raw goods.
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 mb-6 flex justify-between items-center text-xs">
            <span className="text-gray-500">Consolidated PO Value:</span>
            <span className="text-base font-extrabold text-gray-900 dark:text-white">
              ${calculatePoTotal().toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end">
            <button
              id="btn-po-submit"
              type="submit"
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer shadow-md shadow-gray-900/10"
            >
              Dispatch for Manager Approval
            </button>
          </div>
        </form>
      )}

      {/* APPROVAL QUEUE VIEW */}
      {activeTab === 'approve' && (
        <div className="space-y-4">
          {purchaseOrders.filter(po=>po.status === 'Pending Approval' || po.status === 'Approved' || po.status === 'Sent').map((po) => {
            const supplierName = suppliers.find(s=>s.id === po.supplierId)?.name || 'Preferred Vendor';
            const storeName = stores.find(s=>s.id === po.storeId)?.name || 'Downtown';
            return (
              <div
                key={po.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                      {po.status}
                    </span>
                    <span className="font-bold text-xs text-gray-900 dark:text-white">PO #{po.id.toUpperCase()}</span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-1.5">{supplierName}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Destination: {storeName} • Sum: <strong>${po.totalAmount.toFixed(2)}</strong> • Created: {new Date(po.orderDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {po.status === 'Pending Approval' && (
                    <>
                      <button
                        id={`btn-approve-po-${po.id}`}
                        onClick={() => handleApprovePO(po.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                      >
                        Approve Order
                      </button>
                      <button
                        id={`btn-reject-po-${po.id}`}
                        onClick={() => handleRejectPO(po.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {po.status === 'Approved' && (
                    <button
                      id={`btn-dispatch-po-${po.id}`}
                      onClick={() => handleDispatchPO(po.id)}
                      className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                    >
                      Dispatch Order to Vendor
                    </button>
                  )}

                  {po.status === 'Sent' && (
                    <span className="text-xs text-indigo-500 font-semibold flex items-center gap-1">
                      <Truck size={14} /> Dispatched to Supplier (Lead time pending)
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {purchaseOrders.filter(po=>po.status === 'Pending Approval' || po.status === 'Approved' || po.status === 'Sent').length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-900 border rounded-3xl">
              No active purchase orders inside authorization routing buffers.
            </div>
          )}
        </div>
      )}

      {/* DELIVERY GATE / RECEIVING VIEW */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          {activeReceivingPoId ? (
            // Receiving Form: Discrepancy Matching (Ordered vs Received vs Returned)
            (() => {
              const po = purchaseOrders.find(p=>p.id === activeReceivingPoId)!;
              return (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">Accepting Delivery PO #{po.id.toUpperCase()}</h4>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Please verify and match actual packaging counts upon physical offloading.</p>
                    </div>
                    <button
                      id="btn-cancel-receiving"
                      onClick={() => setActiveReceivingPoId(null)}
                      className="text-xs text-gray-500 font-bold hover:underline cursor-pointer"
                    >
                      Cancel Receiving
                    </button>
                  </div>

                  <div className="space-y-4">
                    {po.items.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      if (!product) return null;
                      return (
                        <div key={item.productId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-100 dark:border-gray-850 rounded-2xl bg-gray-50/40">
                          <div className="sm:w-1/3">
                            <span className="font-bold text-xs text-gray-900 dark:text-white">{product.name}</span>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                              SKU: {product.sku} • Expected Pack Unit: {item.packageUnit}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 flex-1 text-xs">
                            {/* Ordered quantity (Static) */}
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Ordered</div>
                              <div className="font-bold text-gray-900 dark:text-white py-1">{item.quantityOrdered} Packages</div>
                            </div>

                            {/* Received quantity */}
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Received Actual</div>
                              <input
                                id={`receiving-qty-${item.productId}`}
                                type="number"
                                min="0"
                                value={receivingQuantities[item.productId] ?? 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setReceivingQuantities({ ...receivingQuantities, [item.productId]: val });
                                }}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-center"
                              />
                            </div>

                            {/* Damaged / Returned quantity */}
                            <div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Damaged/Return</div>
                              <input
                                id={`returning-qty-${item.productId}`}
                                type="number"
                                min="0"
                                value={returningQuantities[item.productId] ?? 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setReturningQuantities({ ...returningQuantities, [item.productId]: val });
                                }}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-center text-red-500 font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Warning if discrepancies exist */}
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl flex items-start gap-2.5 text-xs text-orange-600 border border-orange-100">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5 text-orange-500" />
                    <div>
                      <strong className="font-bold">Receiving Alert:</strong> Damaged, spoiled, or short-shipped items logged in the Damaged/Return column will trigger an automatic vendor credit claim note.
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      id="btn-submit-delivery-verify"
                      onClick={() => handleSubmitDelivery(po.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-500/15"
                    >
                      Verify Match & Store Inventory
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            // Active POs in transit ready to receive
            purchaseOrders.filter((po) => po.status === 'Sent' || po.status === 'Delivered').map((po) => {
              const supplierName = suppliers.find(s=>s.id === po.supplierId)?.name || 'Preferred Vendor';
              const storeName = stores.find(s=>s.id === po.storeId)?.name || 'Downtown';
              return (
                <div
                  key={po.id}
                  className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        po.status === 'Sent' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {po.status === 'Sent' ? 'In Transit' : 'Accepted'}
                      </span>
                      <span className="font-bold text-xs">PO #{po.id.toUpperCase()}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-1.5">{supplierName}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Destination Outlet: {storeName} • Total amount: ${po.totalAmount.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    {po.status === 'Sent' ? (
                      <button
                        id={`btn-receive-delivery-po-${po.id}`}
                        onClick={() => handleStartReceiving(po)}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm"
                      >
                        Accept Delivery Offloading
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle size={14} /> Received into Stock
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {purchaseOrders.filter((po) => po.status === 'Sent' || po.status === 'Delivered').length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-900 border rounded-3xl">
              No outstanding transit POs awaiting physical offloading.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
