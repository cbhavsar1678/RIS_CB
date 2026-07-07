/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Search, Plus, Trash2, RotateCcw, Save, Grid, FileSpreadsheet, Package, AlertTriangle, Layers, Image, Camera, Edit3 } from 'lucide-react';
import { Product, Allergen, Store, Supplier, Inventory } from '../../types';
import { ALLERGENS, INITIAL_SUPPLIERS } from '../../data/mockData';
import { AllergenGrid, AllergenBadge } from '../AllergenIcons';

interface AdminProductsProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  inventories: Inventory[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  stores: Store[];
  suppliers: Supplier[];
}

export const AdminProducts: React.FC<AdminProductsProps> = ({
  products,
  setProducts,
  inventories,
  setInventories,
  stores,
  suppliers,
}) => {
  const [subTab, setSubTab] = useState<'list' | 'add' | 'spreadsheet' | 'package' | 'archive'>('list');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Dry Goods' as Product['category'],
    basePrice: '',
    taxRate: '0.00',
    packagingUnit: 'Box',
    unitsPerPackage: '1',
    stockingUnit: 'Kg',
    supplierId: suppliers[0]?.id || '',
    allergens: [] as string[],
    imageUrl: '',
    storeAllocations: stores.map((s) => ({ storeId: s.id, reorderPoint: '10', parLevel: '30', parLoc: 'Shelf' })),
  });

  // Image Upload pipeline mock
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter products
  const activeProducts = products.filter((p) => !p.isArchived);
  const archivedProducts = products.filter((p) => p.isArchived);

  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Multiphase Add Form: Stage State
  const [formStage, setFormStage] = useState<1 | 2 | 3>(1);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAllergen = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(id)
        ? prev.allergens.filter((a) => a !== id)
        : [...prev.allergens, id],
    }));
  };

  // Archive (Soft Delete)
  const handleArchiveProduct = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isArchived: true } : p))
    );
  };

  // Restore Product
  const handleRestoreProduct = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isArchived: false } : p))
    );
  };

  const handleEditProductClick = (prod: Product) => {
    setEditingProductId(prod.id);
    const prodInvs = inventories.filter((inv) => inv.productId === prod.id);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      basePrice: prod.basePrice.toString(),
      taxRate: prod.taxRate.toString(),
      packagingUnit: prod.packagingUnit,
      unitsPerPackage: prod.unitsPerPackage.toString(),
      stockingUnit: prod.stockingUnit,
      supplierId: prod.supplierId,
      allergens: prod.allergens,
      imageUrl: prod.imageUrl || '',
      storeAllocations: stores.map((s) => {
        const inv = prodInvs.find((i) => i.storeId === s.id);
        return {
          storeId: s.id,
          reorderPoint: inv ? inv.reorderPoint.toString() : '10',
          parLevel: inv ? inv.parLevel.toString() : '30',
          parLoc: inv ? inv.storageLocation || 'Shelf' : 'Shelf',
        };
      }),
    });
    setPreviewImage(prod.imageUrl || null);
    setFormStage(1);
    setSubTab('add');
  };

  // Form Submit
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProductId) {
      // Update existing product
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProductId
            ? {
                ...p,
                name: formData.name,
                sku: formData.sku,
                category: formData.category,
                basePrice: parseFloat(formData.basePrice) || 0,
                taxRate: parseFloat(formData.taxRate) || 0,
                packagingUnit: formData.packagingUnit,
                unitsPerPackage: parseFloat(formData.unitsPerPackage) || 1,
                stockingUnit: formData.stockingUnit,
                supplierId: formData.supplierId,
                allergens: formData.allergens,
                imageUrl: formData.imageUrl || p.imageUrl,
              }
            : p
        )
      );

      // Update associated inventories
      setInventories((prev) => {
        const filtered = prev.filter((inv) => inv.productId !== editingProductId);
        const updatedInvs = formData.storeAllocations.map((alloc) => {
          const oldInv = prev.find((i) => i.productId === editingProductId && i.storeId === alloc.storeId);
          return {
            id: oldInv ? oldInv.id : `inv-${Date.now()}-${alloc.storeId}`,
            productId: editingProductId,
            storeId: alloc.storeId,
            theoreticalStock: oldInv ? oldInv.theoreticalStock : 0,
            reorderPoint: parseFloat(alloc.reorderPoint) || 10,
            parLevel: parseFloat(alloc.parLevel) || 30,
            storageLocation: alloc.parLoc || 'Dry Shelf',
          };
        });
        return [...filtered, ...updatedInvs];
      });

      setEditingProductId(null);
      alert('Product and location allocations updated successfully!');
    } else {
      // Create new product
      const newId = `prod-${Date.now()}`;
      const newProduct: Product = {
        id: newId,
        name: formData.name,
        sku: formData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        category: formData.category,
        basePrice: parseFloat(formData.basePrice) || 0,
        taxRate: parseFloat(formData.taxRate) || 0,
        packagingUnit: formData.packagingUnit,
        unitsPerPackage: parseFloat(formData.unitsPerPackage) || 1,
        stockingUnit: formData.stockingUnit,
        allergens: formData.allergens,
        imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
        isActive: true,
        isArchived: false,
        supplierId: formData.supplierId,
      };

      // Add corresponding allocations to Inventories
      const newInvs: Inventory[] = formData.storeAllocations.map((alloc) => ({
        id: `inv-${Date.now()}-${alloc.storeId}`,
        productId: newId,
        storeId: alloc.storeId,
        theoreticalStock: 0,
        reorderPoint: parseFloat(alloc.reorderPoint) || 10,
        parLevel: parseFloat(alloc.parLevel) || 30,
        storageLocation: alloc.parLoc || 'Dry Shelf',
      }));

      setProducts((prev) => [newProduct, ...prev]);
      setInventories((prev) => [...prev, ...newInvs]);
      alert('Product created successfully!');
    }

    // Reset Form
    setFormData({
      name: '',
      sku: '',
      category: 'Dry Goods',
      basePrice: '',
      taxRate: '0.00',
      packagingUnit: 'Box',
      unitsPerPackage: '1',
      stockingUnit: 'Kg',
      supplierId: suppliers[0]?.id || '',
      allergens: [],
      imageUrl: '',
      storeAllocations: stores.map((s) => ({ storeId: s.id, reorderPoint: '10', parLevel: '30', parLoc: 'Shelf' })),
    });
    setPreviewImage(null);
    setFormStage(1);
    setSubTab('list');
  };

  // Price overrides matrix state
  const [pricingOverrides, setPricingOverrides] = useState<{ [key: string]: string }>({});

  const handleSavePriceOverride = (productId: string) => {
    const newPrice = parseFloat(pricingOverrides[productId]);
    if (isNaN(newPrice)) return;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, basePrice: newPrice } : p))
    );
    alert('Base price updated successfully');
  };

  return (
    <div className="space-y-6" id="admin-products-panel">
      {/* Tab Selectors */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <button
          id="btn-subtab-prod-list"
          onClick={() => setSubTab('list')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            subTab === 'list'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:bg-gray-50'
          }`}
        >
          <Package size={14} /> Catalog List
        </button>

        <button
          id="btn-subtab-prod-add"
          onClick={() => {
            setEditingProductId(null);
            setFormData({
              name: '',
              sku: '',
              category: 'Dry Goods',
              basePrice: '',
              taxRate: '0.00',
              packagingUnit: 'Box',
              unitsPerPackage: '1',
              stockingUnit: 'Kg',
              supplierId: suppliers[0]?.id || '',
              allergens: [],
              imageUrl: '',
              storeAllocations: stores.map((s) => ({ storeId: s.id, reorderPoint: '10', parLevel: '30', parLoc: 'Shelf' })),
            });
            setPreviewImage(null);
            setFormStage(1);
            setSubTab('add');
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            subTab === 'add'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:bg-gray-50'
          }`}
        >
          <Plus size={14} /> {editingProductId ? 'Edit Product' : 'Add Product (Wizard)'}
        </button>

        <button
          id="btn-subtab-prod-spreadsheet"
          onClick={() => setSubTab('spreadsheet')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            subTab === 'spreadsheet'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:bg-gray-50'
          }`}
        >
          <FileSpreadsheet size={14} /> Spreadsheet price overrides
        </button>

        <button
          id="btn-subtab-prod-archive"
          onClick={() => setSubTab('archive')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            subTab === 'archive'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:bg-gray-50'
          }`}
        >
          <Trash2 size={14} /> Soft-Archived Queue
        </button>
      </div>

      {/* RENDER CURRENT SUB-TAB */}
      {subTab === 'list' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                id="search-products-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products SKU, descriptors..."
                className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
              {['All', 'Dry Goods', 'Produce', 'Protein', 'Dairy', 'Beverage', 'Packaging'].map((cat) => (
                <button
                  key={cat}
                  id={`btn-prod-cat-filter-${cat.replace(/\s+/g, '-')}`}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200'
                      : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Master List Data Table */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-850 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-gray-600 dark:text-gray-300">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-850 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Ingredient Descriptor</th>
                    <th className="px-6 py-4">SKU Code</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Supplier Cost</th>
                    <th className="px-6 py-4">Pack Specifications</th>
                    <th className="px-6 py-4">Allergen Safety</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-850/20">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700">
                          <img src={prod.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        {prod.name}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">{prod.sku}</td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {prod.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        ${prod.basePrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {prod.packagingUnit} ({prod.unitsPerPackage} {prod.stockingUnit}s)
                      </td>
                      <td className="px-6 py-4">
                        <AllergenGrid codes={prod.allergens} />
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <button
                          id={`btn-edit-prod-${prod.id}`}
                          onClick={() => handleEditProductClick(prod)}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 p-2 rounded-lg cursor-pointer transition-colors"
                          title="Edit Product Details"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          id={`btn-archive-prod-${prod.id}`}
                          onClick={() => handleArchiveProduct(prod.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-lg cursor-pointer transition-colors"
                          title="Soft-Delete Archive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        No products match the filter search queries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Multiphase Add Form Wizard */}
      {subTab === 'add' && (
        <form onSubmit={handleAddProduct} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm">
          {/* Phase Indicators */}
          <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    formStage === step
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
                      : formStage > step
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white dark:bg-gray-850 border-gray-200 dark:border-gray-800 text-gray-400'
                  }`}
                >
                  {step}
                </div>
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                  {step === 1 ? 'General' : step === 2 ? 'Packaging / Safety' : 'Store Allocations'}
                </span>
              </div>
            ))}
          </div>

          {/* STAGE 1: General details */}
          {formStage === 1 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                {editingProductId ? `Stage 1: Edit base details for ${formData.name}` : 'Stage 1: Base Details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Ingredient Name</label>
                  <input
                    id="input-add-prod-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Prime Beef Ribeye"
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">SKU / Code</label>
                  <input
                    id="input-add-prod-sku"
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="PR-RIB-001"
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Product Category</label>
                  <select
                    id="select-add-prod-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Product['category'] })}
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                  >
                    <option value="Dry Goods">Dry Goods</option>
                    <option value="Produce">Produce</option>
                    <option value="Protein">Protein</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Primary Supplier</label>
                  <select
                    id="select-add-prod-supplier"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drag-and-drop / mobile camera attachment UI pipeline */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Product Attachment Image</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    dragActive
                      ? 'border-orange-500 bg-orange-50/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                  }`}
                >
                  {previewImage ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden border">
                        <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <button
                        id="btn-remove-preview-img"
                        type="button"
                        onClick={() => { setPreviewImage(null); setFormData({ ...formData, imageUrl: '' }); }}
                        className="text-xs text-red-500 font-bold hover:underline cursor-pointer"
                      >
                        Remove Attachment
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-850 flex items-center justify-center text-gray-500">
                        <Camera size={18} />
                      </div>
                      <p className="text-xs text-gray-500">
                        Drag and drop product photos, or <span className="text-orange-500 font-semibold cursor-pointer" onClick={() => fileInputRef.current?.click()}>browse files</span>
                      </p>
                      <p className="text-[10px] text-gray-400">Supports direct mobile device camera capture</p>
                    </div>
                  )}
                  <input
                    id="file-capture-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment" // direct camera support for mobile
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  id="btn-add-prod-next-1"
                  type="button"
                  onClick={() => setFormStage(2)}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  Continue to Packaging Specs
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: Packaging specs & allergens */}
          {formStage === 2 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Stage 2: Pack Rules & Allergen Matrix</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Base Price / Package</label>
                  <input
                    id="input-add-prod-price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="280.00"
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Packaging Unit Name</label>
                  <input
                    id="input-add-prod-packunit"
                    type="text"
                    required
                    value={formData.packagingUnit}
                    onChange={(e) => setFormData({ ...formData, packagingUnit: e.target.value })}
                    placeholder="Box (20 Kg)"
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Internal Stocking Unit</label>
                  <input
                    id="input-add-prod-stockunit"
                    type="text"
                    required
                    value={formData.stockingUnit}
                    onChange={(e) => setFormData({ ...formData, stockingUnit: e.target.value })}
                    placeholder="Kg"
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Units per Package</label>
                  <input
                    id="input-add-prod-unitmult"
                    type="number"
                    required
                    value={formData.unitsPerPackage}
                    onChange={(e) => setFormData({ ...formData, unitsPerPackage: e.target.value })}
                    placeholder="20"
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Tax Rate (Surcharges)</label>
                  <input
                    id="input-add-prod-tax"
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Allergen Matrix Selector */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Safety Allergen Cross-Reference</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {ALLERGENS.map((allergen) => {
                    const selected = formData.allergens.includes(allergen.code);
                    return (
                      <button
                        key={allergen.id}
                        id={`btn-allerg-alloc-${allergen.code}`}
                        type="button"
                        onClick={() => toggleAllergen(allergen.code)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold gap-1 transition-all cursor-pointer ${
                          selected
                            ? 'bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-950/20'
                            : 'bg-gray-50 border-gray-100 text-gray-600 dark:bg-gray-850 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-lg">{allergen.icon}</span>
                        <span>{allergen.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  id="btn-add-prod-back-1"
                  type="button"
                  onClick={() => setFormStage(1)}
                  className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  Back to Base General Details
                </button>
                <button
                  id="btn-add-prod-next-2"
                  type="button"
                  onClick={() => setFormStage(3)}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  Continue to Store Allocation
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: Store Allocations */}
          {formStage === 3 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Stage 3: Multi-Store Stock Targets</h3>
              
              <div className="space-y-4">
                {formData.storeAllocations.map((alloc, idx) => {
                  const store = stores.find((s) => s.id === alloc.storeId);
                  return (
                    <div key={alloc.storeId} className="flex flex-col sm:flex-row gap-4 items-center border border-gray-100 dark:border-gray-850 p-4 rounded-2xl">
                      <div className="font-bold text-xs text-gray-900 dark:text-white sm:w-1/4">
                        🏪 {store?.name || 'Downtown Bistro'}
                      </div>
                      <div className="grid grid-cols-3 gap-3 flex-1 w-full">
                        <div>
                          <label className="block text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Reorder Warning Point</label>
                          <input
                            id={`alloc-reorder-${idx}`}
                            type="number"
                            value={alloc.reorderPoint}
                            onChange={(e) => {
                              const updated = [...formData.storeAllocations];
                              updated[idx].reorderPoint = e.target.value;
                              setFormData({ ...formData, storeAllocations: updated });
                            }}
                            className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Optimal Par Level</label>
                          <input
                            id={`alloc-par-${idx}`}
                            type="number"
                            value={alloc.parLevel}
                            onChange={(e) => {
                              const updated = [...formData.storeAllocations];
                              updated[idx].parLevel = e.target.value;
                              setFormData({ ...formData, storeAllocations: updated });
                            }}
                            className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Bin / Shelf Location</label>
                          <input
                            id={`alloc-loc-${idx}`}
                            type="text"
                            value={alloc.parLoc}
                            onChange={(e) => {
                              const updated = [...formData.storeAllocations];
                              updated[idx].parLoc = e.target.value;
                              setFormData({ ...formData, storeAllocations: updated });
                            }}
                            className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-3">
                <button
                  id="btn-add-prod-back-2"
                  type="button"
                  onClick={() => setFormStage(2)}
                  className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  Back to Packaging Specs
                </button>
                <button
                  id="btn-add-prod-submit"
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  🚀 Save Product & Allocate Store Stock Nodes
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Pricing Matrix / Spreadsheet editing */}
      {subTab === 'spreadsheet' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4 mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Spreadsheet Base Price overrides</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Rapid grid override for contractor pricing terms.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-850 border-b text-gray-400 text-[10px] uppercase font-bold">
                  <th className="px-6 py-3">Ingredient</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Current Base Price</th>
                  <th className="px-6 py-3">Quick Base Override ($)</th>
                  <th className="px-6 py-3 text-right">Commit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeProducts.map((prod) => (
                  <tr key={prod.id}>
                    <td className="px-6 py-3.5 font-bold">{prod.name}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px]">{prod.sku}</td>
                    <td className="px-6 py-3.5 font-bold">${prod.basePrice.toFixed(2)} / {prod.packagingUnit}</td>
                    <td className="px-6 py-3.5">
                      <input
                        id={`override-price-${prod.id}`}
                        type="number"
                        step="0.01"
                        placeholder={prod.basePrice.toFixed(2)}
                        value={pricingOverrides[prod.id] || ''}
                        onChange={(e) => setPricingOverrides({ ...pricingOverrides, [prod.id]: e.target.value })}
                        className="w-24 bg-gray-50 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1 text-xs text-center focus:outline-none"
                      />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        id={`btn-commit-price-override-${prod.id}`}
                        onClick={() => handleSavePriceOverride(prod.id)}
                        className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg cursor-pointer"
                        title="Commit base override"
                      >
                        <Save size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Archive Tab */}
      {subTab === 'archive' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Soft-Archived Product Buffer</h3>
          <p className="text-xs text-gray-400 mb-5">These items are soft-deleted from inventory calculations and can be safely restored.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-850 border-b text-[10px] font-bold text-gray-400 uppercase">
                  <th className="px-6 py-3">Ingredient</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {archivedProducts.map((prod) => (
                  <tr key={prod.id}>
                    <td className="px-6 py-3.5 font-bold">{prod.name}</td>
                    <td className="px-6 py-3.5 font-mono">{prod.sku}</td>
                    <td className="px-6 py-3.5">{prod.category}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        id={`btn-restore-prod-${prod.id}`}
                        onClick={() => handleRestoreProduct(prod.id)}
                        className="text-emerald-500 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg cursor-pointer transition-colors"
                        title="Restore Product Node"
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                    </td>
                  </tr>
                ))}

                {archivedProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400">
                      Archive buffer is empty. No soft-deleted items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
