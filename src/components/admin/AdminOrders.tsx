/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingCart, FileText, CheckCircle, XCircle, ArrowLeftRight, Truck, Plus, Trash2, ShieldAlert, Sparkles, QrCode } from 'lucide-react';
import { PurchaseOrder, Supplier, Product, Store, Inventory } from '../../types';

interface AdminOrdersProps {
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  suppliers: Supplier[];
  products: Product[];
  stores: Store[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  inventories: Inventory[];
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  purchaseOrders,
  setPurchaseOrders,
  suppliers,
  products,
  stores,
  setInventories,
  inventories,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'approve' | 'deliveries' | 'returns' | 'scan'>('approve');

  // Invoice Scanner states
  const [invoiceInputText, setInvoiceInputText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [selectedScanStoreId, setSelectedScanStoreId] = useState(stores[0]?.id || '');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Live Camera Scanner States
  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // QR Code Scanner States
  const [scanMode, setScanMode] = useState<'invoice' | 'qrcode'>('invoice');
  const [qrScannedResult, setQrScannedResult] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    batchNumber: string;
    expiryDate: string;
    supplierName: string;
  } | null>(null);
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [showQrCameraView, setShowQrCameraView] = useState(false);

  const handleQrScanPreset = (preset: {
    productId: string;
    productName: string;
    quantity: number;
    batchNumber: string;
    expiryDate: string;
    supplierName: string;
  }) => {
    setIsQrScanning(true);
    setQrScannedResult(null);
    setTimeout(() => {
      setQrScannedResult(preset);
      setIsQrScanning(false);
      alert(`Beep! Decoded delivery QR code successfully. Identified ingredient: "${preset.productName}"`);
    }, 1000);
  };

  const handleIngestQrDelivery = () => {
    if (!qrScannedResult) return;
    
    // Deduct/Increase stock in inventories
    setInventories((prev) =>
      prev.map((inv) => {
        if (inv.storeId === selectedScanStoreId && inv.productId === qrScannedResult.productId) {
          return {
            ...inv,
            theoreticalStock: inv.theoreticalStock + qrScannedResult.quantity,
          };
        }
        return inv;
      })
    );

    alert(`Success! Checked in ${qrScannedResult.quantity} units of "${qrScannedResult.productName}" into inventory. Batch trace logged under #${qrScannedResult.batchNumber}`);
    setQrScannedResult(null);
  };

  const startInvoiceCamera = async () => {
    setCameraError(null);
    setShowCameraView(true);
    setTimeout(async () => {
      try {
        const video = document.getElementById('invoice-scanner-video') as HTMLVideoElement;
        if (!video) return;
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        video.srcObject = stream;
        video.play();
      } catch (err: any) {
        console.warn('Camera capture permission blocked or unavailable:', err);
        setCameraError('Physical camera blocked or iframe sandbox permission restriction active. Falling back to High-Fidelity Tableside Scan Simulator.');
      }
    }, 100);
  };

  const stopInvoiceCamera = () => {
    try {
      const video = document.getElementById('invoice-scanner-video') as HTMLVideoElement;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      console.error(e);
    }
    setShowCameraView(false);
  };

  const captureInvoiceSnapshot = () => {
    try {
      const video = document.getElementById('invoice-scanner-video') as HTMLVideoElement;
      if (!video) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        handleScanInvoiceImage(dataUrl, 'image/png');
        stopInvoiceCamera();
      }
    } catch (err) {
      console.error(err);
      alert('Error capturing physical snapshot. Proceeding with simulator fallback.');
      simulateCameraScan();
    }
  };

  const simulateCameraScan = () => {
    setIsScanning(true);
    setScannedResult(null);
    stopInvoiceCamera();
    
    setTimeout(() => {
      setScannedResult({
        success: true,
        vendor: "US Foods Inc.",
        invoiceNumber: "INV-992-881",
        totalAmount: 495.00,
        items: [
          { name: "Wagyu Beef Ribeye", quantity: 5, unitCost: 85.00, totalCost: 425.00 },
          { name: "Organic Whole Milk", quantity: 10, unitCost: 7.00, totalCost: 70.00 }
        ]
      });
      setIsScanning(false);
      alert("AI Camera Scanner successful! Extracted 2 high-value items from vendor 'US Foods Inc.' reference #INV-992-881");
    }, 1200);
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files (JPEG, PNG, WEBP) are supported for AI OCR Scanning.');
      return;
    }

    const reader = new FileReader();
    setUploadProgress(10);
    reader.onloadstart = () => setUploadProgress(20);
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 60) + 20;
        setUploadProgress(pct);
      }
    };
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setUploadProgress(100);
      setIsDragging(false);
      
      // Auto trigger the scanner with the image data!
      setTimeout(() => {
        setUploadProgress(null);
        handleScanInvoiceImage(base64String, file.type);
      }, 600);
    };
    reader.readAsDataURL(file);
  };

  const handleScanInvoiceImage = async (base64Data: string, mimeType: string) => {
    setIsScanning(true);
    setScannedResult(null);
    try {
      const response = await fetch('/api/ai/scan-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          imageBase64: base64Data, 
          mimeType: mimeType 
        })
      });
      if (!response.ok) {
        throw new Error('Failed to reach AI invoice parser');
      }
      const data = await response.json();
      if (data.success) {
        setScannedResult(data);
        alert('AI Image Analysis successful! Review extracted parameters in the right column.');
      } else {
        alert('Could not parse image invoice. Try selecting a clear image or paste text instead.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error during AI image scanning: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

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

  const handleAutoSuggestRestock = () => {
    const suggested: { productId: string; quantity: number }[] = [];
    const vendorProds = products.filter(p => p.supplierId === selectedSupplierId && !p.isArchived);
    
    vendorProds.forEach(prod => {
      const inv = inventories.find(i => i.productId === prod.id && i.storeId === selectedStoreId);
      if (inv) {
        if (inv.theoreticalStock <= inv.reorderPoint) {
          const deficit = Math.max(0, inv.parLevel - inv.theoreticalStock);
          if (deficit > 0) {
            const packsNeeded = Math.ceil(deficit / prod.unitsPerPackage);
            if (packsNeeded > 0) {
              suggested.push({
                productId: prod.id,
                quantity: packsNeeded
              });
            }
          }
        }
      }
    });
    
    if (suggested.length === 0) {
      alert("All products for this vendor are currently well-stocked above reorder safety limits at this location. No automatic reorders suggested!");
      return;
    }
    
    setPoLines(suggested);
    alert(`Success! Auto-suggested ${suggested.length} replenishment lines based on low inventory & safety par levels at this branch.`);
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

  const handleScanInvoice = async (inputText: string) => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/ai/scan-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invoiceText: inputText })
      });
      if (!response.ok) {
        throw new Error('Failed to reach AI invoice parser');
      }
      const data = await response.json();
      if (data.success) {
        setScannedResult(data);
      } else {
        alert('Could not parse invoice layout.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error during AI invoice scanning: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleApproveScannedInvoice = () => {
    if (!scannedResult) return;

    // Fuzzy match supplier
    const matchedSupplier = suppliers.find(
      s => s.name.toLowerCase().includes(scannedResult.vendor.toLowerCase()) || 
           scannedResult.vendor.toLowerCase().includes(s.name.toLowerCase())
    ) || suppliers[0];

    const newPO: PurchaseOrder = {
      id: `po-scan-${Date.now().toString().slice(-4)}`,
      supplierId: matchedSupplier.id,
      storeId: selectedScanStoreId,
      orderDate: scannedResult.date || new Date().toISOString(),
      expectedDeliveryDate: new Date().toISOString(),
      status: 'Delivered',
      totalAmount: scannedResult.totalAmount || 0,
      createdBy: 'Sarah Jenkins (AI Scanned)',
      approvedBy: 'Sarah Jenkins (AI Scanned)',
      items: scannedResult.items.map((item: any) => {
        // Fuzzy product match
        const matchedProd = products.find(
          p => p.name.toLowerCase().includes(item.name.toLowerCase()) || 
               item.name.toLowerCase().includes(p.name.toLowerCase())
        ) || products[0];

        return {
          productId: matchedProd.id,
          quantityOrdered: item.quantity,
          quantityReceived: item.quantity,
          packageUnit: item.packageUnit || matchedProd.packagingUnit,
          costPerPackage: item.unitCost || matchedProd.basePrice,
          totalCost: item.totalCost || (item.quantity * item.unitCost),
        };
      })
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Increase theoretical inventory levels!
    setInventories((prev) =>
      prev.map((inv) => {
        if (inv.storeId !== selectedScanStoreId) return inv;
        const scannedItem = newPO.items.find((item) => item.productId === inv.productId);
        if (!scannedItem) return inv;

        const prod = products.find((p) => p.id === inv.productId);
        const multiplier = prod ? prod.unitsPerPackage : 1;
        const addedStock = (scannedItem.quantityReceived || 0) * multiplier;

        return {
          ...inv,
          theoreticalStock: inv.theoreticalStock + addedStock,
        };
      })
    );

    alert(`AI Invoice #${scannedResult.invoiceNumber || 'N/A'} successfully processed! Associated stock counts have been automatically received into inventory.`);
    setScannedResult(null);
    setInvoiceInputText('');
    setActiveTab('approve');
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

        <button
          id="btn-subtab-order-scan"
          onClick={() => { setActiveTab('scan'); setActiveReceivingPoId(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'scan'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          📄 AI Invoice Scanner
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
              <div className="flex gap-2">
                <button
                  id="btn-po-auto-suggest"
                  type="button"
                  onClick={handleAutoSuggestRestock}
                  className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/40 font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  <Sparkles size={12} className="animate-pulse" /> Auto-Suggest Restock
                </button>
                <button
                  id="btn-po-add-line"
                  type="button"
                  onClick={handleAddLine}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                >
                  <Plus size={12} /> Add Line SKU
                </button>
              </div>
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

      {/* AI INVOICE SCANNING & PARSING WORKFLOW */}
      {activeTab === 'scan' && (
        <div className="space-y-6">
          {/* Scan Mode Selector Switcher */}
          <div className="flex gap-2">
            <button
              id="btn-scan-mode-invoice"
              onClick={() => setScanMode('invoice')}
              className={`px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                scanMode === 'invoice'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15'
                  : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-850 hover:bg-gray-50'
              }`}
            >
              📄 Paper Invoice OCR Scan
            </button>
            <button
              id="btn-scan-mode-qrcode"
              onClick={() => setScanMode('qrcode')}
              className={`px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                scanMode === 'qrcode'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/15'
                  : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-850 hover:bg-gray-50'
              }`}
            >
              <QrCode size={13} className="inline mr-1" /> QR Case Laser Scanner
            </button>
          </div>

          {scanMode === 'invoice' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <span className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">📄</span>
                AI Invoice Parser & Automatic Stock Ingestion
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-2xl mb-6">
                Paste raw invoice receipts, delivery slips, or select one of our ready-made restaurant vendor presets. The AI will extract line-item parameters, match products, and let you review counts before instant inventory increase.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Preset select & Paste Area */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Select Ready-Made Presets</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        {
                          title: "🥩 Meat Masters Beef Delivery Invoice",
                          text: "INVOICE #INV-MEAT-4229\nDate: 2026-07-06\nSupplier: Meat Masters Inc.\nItems:\n- Wagyu Beef Ribeye: 5 cases @ $280.00 each\n- Chicken Breast Tenderloin: 2 cases @ $65.00 each\nTotal Amount: $1530.00\nTax: $0.00"
                        },
                        {
                          title: "🥬 Produce Farm Veg-Supply Invoice",
                          text: "INVOICE #INV-VEG-9981\nDate: 2026-07-07\nSupplier: Quality Produce Co.\nItems:\n- Romaine Lettuce Heads: 10 boxes @ $12.50 each\n- Fresh Roma Tomatoes: 8 boxes @ $15.00 each\n- Yellow Onions Sweet: 3 bags @ $9.00 each\nTotal Amount: $272.00"
                        },
                        {
                          title: "🥛 Dairy Farm Fresh Consolidated Delivery",
                          text: "INVOICE #INV-DAIRY-8839\nDate: 2026-07-07\nSupplier: Dairy Fresh Farms\nItems:\n- Whole Milk (Organic): 12 cases @ $32.00 each\n- Premium Heavy Cream: 4 cases @ $41.50 each\nTotal Amount: $550.00"
                        }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInvoiceInputText(preset.text);
                          }}
                          className="text-left text-xs bg-gray-50 dark:bg-gray-850 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-gray-100 dark:border-gray-800 p-3 rounded-xl cursor-pointer font-semibold transition-colors flex items-center justify-between"
                        >
                          <span>{preset.title}</span>
                          <span className="text-[10px] text-blue-500 hover:underline">Apply preset</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File/Image Upload Dropzone */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Or Upload Invoice Image (Drag-and-Drop / Browse)</label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center transition-all ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20' 
                          : 'border-gray-200 dark:border-gray-800 hover:border-blue-500/50 hover:bg-gray-50/50 bg-gray-50/25 dark:bg-gray-900/10'
                      }`}
                    >
                      <span className="text-2xl mb-1.5">📸</span>
                      <strong className="text-xs font-extrabold text-gray-700 dark:text-gray-300">
                        Drag & Drop Invoice Image
                      </strong>
                      <span className="text-[10px] text-gray-400 block mt-0.5 mb-3">
                        Accepts JPEG, PNG, WEBP files
                      </span>

                      <label className="bg-blue-500 hover:bg-blue-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer transition-all shadow-sm">
                        Browse Files
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </label>

                      <button
                        id="btn-trigger-camera-scan"
                        type="button"
                        onClick={startInvoiceCamera}
                        className="mt-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                      >
                        📷 Use Mobile Camera Scanner
                      </button>

                      {showCameraView && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
                          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
                            <div className="w-full flex justify-between items-center mb-4 border-b border-slate-800 pb-2.5">
                              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                <span>📷</span> LIVE INVOICE SCANNER VIEW
                              </h4>
                              <button
                                type="button"
                                onClick={stopInvoiceCamera}
                                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                              Position the printed or digital invoice inside the camera framing guidelines. AI OCR extracts prices and items automatically.
                            </p>

                            {/* Camera Container Frame */}
                            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center mb-5">
                              <video 
                                id="invoice-scanner-video" 
                                className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
                                playsInline 
                                muted 
                              />

                              {/* Framing Box & Scanline Laser */}
                              <div className="absolute inset-4 border-2 border-dashed border-indigo-500/50 rounded-xl pointer-events-none flex items-center justify-center">
                                <div className="absolute top-0 inset-x-0 h-0.5 bg-indigo-500 shadow-[0_0_8px_#6366f1] animate-bounce" />
                                
                                {/* Overlay alignment corners */}
                                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-indigo-500 rounded-tl-sm" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-indigo-500 rounded-tr-sm" />
                                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-indigo-500 rounded-bl-sm" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-indigo-500 rounded-br-sm" />
                              </div>

                              {cameraError && (
                                <div className="p-4 space-y-3.5 text-center">
                                  <span className="text-2xl">⚡</span>
                                  <h5 className="text-xs font-bold text-amber-500">Iframe Sandbox Capture Mode</h5>
                                  <p className="text-[9px] text-slate-500 max-w-xs leading-normal">
                                    {cameraError}
                                  </p>
                                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 text-left space-y-1 max-w-[280px] mx-auto">
                                    <span className="text-[8px] font-black uppercase text-indigo-400 block">Simulated Paper Invoice</span>
                                    <div className="text-[9px] text-slate-300 font-mono space-y-0.5">
                                      <div>US FOODS DISTRIBUTION CENTRE</div>
                                      <div>Ref: INV-992-881 | Date: Jul 07</div>
                                      <div className="text-emerald-500 font-bold">• 5x Wagyu Ribeye @ $85.00</div>
                                      <div className="text-emerald-500 font-bold">• 10x Organic Milk @ $7.00</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-3 w-full">
                              <button
                                type="button"
                                onClick={stopInvoiceCamera}
                                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold py-2 rounded-xl text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                              {cameraError ? (
                                <button
                                  type="button"
                                  onClick={simulateCameraScan}
                                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-black py-2 rounded-xl text-[10px] cursor-pointer shadow-md shadow-indigo-500/10"
                                >
                                  Simulate Scan
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={captureInvoiceSnapshot}
                                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-black py-2 rounded-xl text-[10px] cursor-pointer shadow-md shadow-indigo-500/10"
                                >
                                  Capture Snapshot
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {uploadProgress !== null && (
                        <div className="w-full max-w-xs mt-3.5 space-y-1">
                          <div className="flex justify-between text-[9px] font-bold text-gray-500">
                            <span>Reading image data...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-850 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Or Paste Raw Invoice Text / OCR Dump</label>
                    <textarea
                      id="textarea-invoice-raw"
                      value={invoiceInputText}
                      onChange={(e) => setInvoiceInputText(e.target.value)}
                      placeholder="Paste invoice line-items here..."
                      rows={8}
                      className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-xs focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">Destination Store Outlet</label>
                      <select
                        id="select-scan-store"
                        value={selectedScanStoreId}
                        onChange={(e) => setSelectedScanStoreId(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none font-bold text-gray-700 dark:text-gray-300"
                      >
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            📍 {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-5 shrink-0">
                      <button
                        id="btn-trigger-ai-scan"
                        type="button"
                        disabled={!invoiceInputText.trim() || isScanning}
                        onClick={() => handleScanInvoice(invoiceInputText)}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-all flex items-center gap-2"
                      >
                        {isScanning ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Parsing with Gemini...
                          </>
                        ) : (
                          "🚀 Trigger AI Scan"
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Extraction Review Grid */}
                <div className="border border-gray-100 dark:border-gray-850 p-5 rounded-2xl bg-gray-50/20 dark:bg-gray-950/20 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Review AI Extraction Results</h4>

                    {scannedResult ? (
                      <div className="space-y-4">
                        {/* Meta parameters */}
                        <div className="grid grid-cols-2 gap-3 bg-white dark:bg-gray-900 border p-3 rounded-xl text-xs">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Supplier Match</div>
                            <input
                              type="text"
                              value={scannedResult.vendor}
                              onChange={(e) => setScannedResult({ ...scannedResult, vendor: e.target.value })}
                              className="font-bold text-gray-800 dark:text-white bg-transparent border-b focus:outline-none w-full mt-0.5"
                            />
                          </div>
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Invoice Reference #</div>
                            <input
                              type="text"
                              value={scannedResult.invoiceNumber}
                              onChange={(e) => setScannedResult({ ...scannedResult, invoiceNumber: e.target.value })}
                              className="font-bold text-gray-800 dark:text-white bg-transparent border-b focus:outline-none w-full mt-0.5"
                            />
                          </div>
                        </div>

                        {/* Items table */}
                        <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-gray-50 dark:bg-gray-850 text-[9px] uppercase font-bold text-gray-400 border-b">
                              <tr>
                                <th className="px-3 py-2">Parsed Product</th>
                                <th className="px-3 py-2 text-center">Qty</th>
                                <th className="px-3 py-2 text-right">Unit cost</th>
                                <th className="px-3 py-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {scannedResult.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2.5">
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => {
                                        const updatedItems = [...scannedResult.items];
                                        updatedItems[idx].name = e.target.value;
                                        setScannedResult({ ...scannedResult, items: updatedItems });
                                      }}
                                      className="font-bold text-gray-800 dark:text-white bg-transparent border-b border-transparent focus:border-gray-200 focus:outline-none w-full"
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const updatedItems = [...scannedResult.items];
                                        updatedItems[idx].quantity = val;
                                        updatedItems[idx].totalCost = val * item.unitCost;
                                        setScannedResult({
                                          ...scannedResult,
                                          items: updatedItems,
                                          totalAmount: updatedItems.reduce((acc, curr) => acc + curr.totalCost, 0)
                                        });
                                      }}
                                      className="text-center font-semibold text-gray-800 dark:text-white bg-transparent border-b border-transparent focus:border-gray-200 focus:outline-none w-10"
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitCost}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const updatedItems = [...scannedResult.items];
                                        updatedItems[idx].unitCost = val;
                                        updatedItems[idx].totalCost = item.quantity * val;
                                        setScannedResult({
                                          ...scannedResult,
                                          items: updatedItems,
                                          totalAmount: updatedItems.reduce((acc, curr) => acc + curr.totalCost, 0)
                                        });
                                      }}
                                      className="text-right font-semibold text-gray-800 dark:text-white bg-transparent border-b border-transparent focus:border-gray-200 focus:outline-none w-12"
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono font-bold">
                                    ${item.totalCost.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Total valuation summary */}
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-850 px-4 py-3 rounded-xl border">
                          <span className="text-[10px] uppercase font-black text-gray-400">Total Invoice Valuation</span>
                          <span className="font-mono font-black text-sm text-gray-900 dark:text-white">
                            ${scannedResult.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-24 text-gray-400">
                        <div className="text-3xl mb-2">🤖</div>
                        <p className="text-xs font-bold text-gray-500">Awaiting AI Parsing Scan</p>
                        <p className="text-[10px] text-gray-400 mt-1">Select a preset or paste an invoice raw text dump on the left, then click Trigger AI Scan.</p>
                      </div>
                    )}
                  </div>

                  {scannedResult && (
                    <div className="pt-6 border-t mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setScannedResult(null)}
                        className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-600 dark:text-gray-300 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                      >
                        Clear result
                      </button>
                      <button
                        id="btn-scan-approve-receive"
                        type="button"
                        onClick={handleApproveScannedInvoice}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-5 py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-500/10 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle size={12} /> Approve & Ingest Stock
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {scanMode === 'qrcode' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <span className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <QrCode size={16} />
                </span>
                Raw Goods Case QR Laser Scanner
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-2xl mb-6">
                Scan the high-density QR code labels affixed to vendor crates or delivery pallets. Decoding QR labels automatically extracts critical batch numbers, supplier trace logs, product SKUs, and counts for instant BOH check-in.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: QR Presets & Live Laser simulation */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Select Ready-Made Delivery Crates QR Codes</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        {
                          title: "📦 Sysco Crate: Wagyu Beef Ribeye",
                          desc: "Affixed label for 5 units of premium beef - Batch #SYS-88219",
                          data: {
                            productId: "p-beef",
                            productName: "Wagyu Beef Ribeye",
                            quantity: 5,
                            batchNumber: "B-SYS-88219-WAGYU",
                            expiryDate: "2026-07-25",
                            supplierName: "Meat Masters Inc."
                          }
                        },
                        {
                          title: "📦 Farm Box: Fresh Roma Tomatoes",
                          desc: "Affixed label for 10 units of field vegetables - Batch #VEG-09182",
                          data: {
                            productId: "p-tomato",
                            productName: "Fresh Roma Tomatoes",
                            quantity: 10,
                            batchNumber: "B-VEG-09182-ROMA",
                            expiryDate: "2026-07-16",
                            supplierName: "Quality Produce Co."
                          }
                        },
                        {
                          title: "📦 Dairy Tub: Premium Heavy Cream",
                          desc: "Affixed label for 4 cases of premium cream - Batch #DRY-77165",
                          data: {
                            productId: "p-cream",
                            productName: "Premium Heavy Cream",
                            quantity: 4,
                            batchNumber: "B-DRY-77165-CREAM",
                            expiryDate: "2026-07-20",
                            supplierName: "Dairy Fresh Farms"
                          }
                        }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQrScanPreset(preset.data)}
                          className="text-left text-xs bg-gray-50 dark:bg-gray-850 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-gray-100 dark:border-gray-800 p-3 rounded-xl cursor-pointer font-semibold transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-extrabold text-gray-800 dark:text-white block">{preset.title}</span>
                            <span className="text-[10px] text-gray-400 font-medium">{preset.desc}</span>
                          </div>
                          <span className="text-[10px] text-indigo-500 hover:underline shrink-0 ml-2">Scan Case label</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Simulated Camera Viewfinder with laser */}
                  <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex flex-col items-center justify-center text-center p-4">
                    {/* Glowing green corner alignments */}
                    <div className="absolute inset-8 border-2 border-dashed border-emerald-500/30 rounded-xl pointer-events-none flex items-center justify-center">
                      <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce" />
                      
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl-sm" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr-sm" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl-sm" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br-sm" />
                    </div>

                    {isQrScanning ? (
                      <div className="space-y-3 z-10">
                        <span className="text-2xl animate-spin inline-block">🎯</span>
                        <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Laser Targeting QR Label...</h5>
                        <p className="text-[9px] text-slate-500 max-w-xs">Acquiring matrix data payload & check-sum verification.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 z-10">
                        <span className="text-2xl animate-pulse">📹</span>
                        <h5 className="text-xs font-bold text-slate-300 font-mono tracking-wide">Live BOH Camera Scanner Viewfinder</h5>
                        <p className="text-[9px] text-slate-500 max-w-xs leading-normal">
                          Position delivery pallet labels inside the viewfinder. Click on any crate preset above to simulate scanning.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Scanned QR decoded parameters Review Grid */}
                <div className="border border-gray-100 dark:border-gray-850 p-5 rounded-2xl bg-gray-50/20 dark:bg-gray-950/20 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Decoded QR label Parameters</h4>

                    {qrScannedResult ? (
                      <div className="space-y-4">
                        {/* Meta Decoded parameters */}
                        <div className="grid grid-cols-2 gap-3 bg-white dark:bg-gray-900 border p-3 rounded-xl text-xs">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Supplier Matching</div>
                            <span className="font-bold text-gray-800 dark:text-white block mt-1">{qrScannedResult.supplierName}</span>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Trace Batch Code #</div>
                            <span className="font-mono font-bold text-indigo-500 block mt-1">{qrScannedResult.batchNumber}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-white dark:bg-gray-900 border p-3 rounded-xl text-xs">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Decoded SKU Match</div>
                            <span className="font-bold text-gray-800 dark:text-white block mt-1">{qrScannedResult.productName}</span>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Delivery Expiry Cell</div>
                            <span className="font-mono font-semibold text-rose-500 block mt-1">{qrScannedResult.expiryDate}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 bg-white dark:bg-gray-900 border p-3 rounded-xl text-xs">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Crate Packaging Quantity</div>
                            <span className="text-sm font-black text-slate-800 dark:text-white block mt-1">
                              {qrScannedResult.quantity} Packages / Boxes
                            </span>
                          </div>
                        </div>

                        {/* Destination store outlet selector */}
                        <div className="bg-white dark:bg-gray-900 border p-4 rounded-xl text-xs">
                          <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Check-in Destination Location</label>
                          <select
                            id="select-qr-store"
                            value={selectedScanStoreId}
                            onChange={(e) => setSelectedScanStoreId(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none font-bold"
                          >
                            {stores.map((s) => (
                              <option key={s.id} value={s.id}>
                                📍 {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-center text-gray-400 border border-dashed rounded-xl bg-white dark:bg-gray-900">
                        <span className="text-3xl mb-2">🎯</span>
                        <p className="text-xs font-bold">No active QR label decoded.</p>
                        <p className="text-[9px] text-gray-400 max-w-[200px] mt-1">
                          Click any ready-made crate label on the left column to run the laser check.
                        </p>
                      </div>
                    )}
                  </div>

                  {qrScannedResult && (
                    <div className="mt-6 pt-4 border-t">
                      <button
                        id="btn-qr-ingest"
                        type="button"
                        onClick={handleIngestQrDelivery}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={12} /> Confirm Delivery Ingestion & Increase Stock
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
