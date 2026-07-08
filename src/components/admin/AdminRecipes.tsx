/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChefHat, Plus, Layers, Play, Check, TrendingUp, AlertCircle, Trash2 } from 'lucide-react';
import { Recipe, Product, BatchJob, Store, Inventory, StockAdjustment } from '../../types';

interface AdminRecipesProps {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  products: Product[];
  stores: Store[];
  inventories: Inventory[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  batchJobs: BatchJob[];
  setBatchJobs: React.Dispatch<React.SetStateAction<BatchJob[]>>;
  adjustments: StockAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
}

export const AdminRecipes: React.FC<AdminRecipesProps> = ({
  recipes,
  setRecipes,
  products,
  stores,
  inventories,
  setInventories,
  batchJobs,
  setBatchJobs,
  adjustments,
  setAdjustments,
}) => {
  const [activeTab, setActiveTab] = useState<'recipes' | 'create' | 'batches'>('recipes');
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Create Recipe Form State
  const [recipeName, setRecipeName] = useState('');
  const [yieldQty, setYieldQty] = useState('1');
  const [yieldUnit, setYieldUnit] = useState('Serving');
  const [retailPrice, setRetailPrice] = useState('');
  const [salesPlu, setSalesPlu] = useState('');
  const [category, setCategory] = useState<Recipe['category']>('Mains');
  const [ingredientsLines, setIngredientsLines] = useState<{ productId: string; quantity: number }[]>([]);

  // Create Batch Job State
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipes[0]?.id || '');
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
  const [batchQty, setBatchQty] = useState('1');

  // Calculates fractional ingredient cost for a recipe
  const calculateRecipeIngredientsCost = (recipe: Recipe) => {
    return recipe.ingredients.reduce((sum, ing) => {
      const prod = products.find((p) => p.id === ing.productId);
      if (!prod) return sum;
      // unitCost is basePrice / unitsPerPackage
      const unitCost = prod.basePrice / prod.unitsPerPackage;
      return sum + ing.quantity * unitCost;
    }, 0);
  };

  const handleEditRecipeClick = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeName(recipe.name);
    setYieldQty(recipe.yieldQty.toString());
    setYieldUnit(recipe.yieldUnit);
    setRetailPrice(recipe.retailPrice.toString());
    setSalesPlu(recipe.salesPlu);
    setCategory(recipe.category);
    setIngredientsLines(recipe.ingredients.map((ing) => ({
      productId: ing.productId,
      quantity: ing.quantity,
    })));
    setActiveTab('create');
  };

  const handleAddIngredientLine = () => {
    if (products.length === 0) return;
    setIngredientsLines([...ingredientsLines, { productId: products[0].id, quantity: 1 }]);
  };

  const handleRemoveIngredientLine = (idx: number) => {
    setIngredientsLines(ingredientsLines.filter((_, i) => i !== idx));
  };

  const handleCreateRecipeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ingredientsLines.length === 0) {
      alert('Please add at least one ingredient raw component');
      return;
    }

    if (editingRecipeId) {
      // Update existing recipe
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === editingRecipeId
            ? {
                ...r,
                name: recipeName,
                yieldQty: parseFloat(yieldQty) || 1,
                yieldUnit: yieldUnit,
                salesPlu: salesPlu,
                retailPrice: parseFloat(retailPrice) || 0,
                category: category,
                ingredients: ingredientsLines.map((line) => {
                  const prod = products.find((p) => p.id === line.productId);
                  return {
                    productId: line.productId,
                    quantity: line.quantity,
                    unit: prod ? prod.stockingUnit : 'Unit',
                  };
                }),
              }
            : r
        )
      );
      setEditingRecipeId(null);
      alert('Recipe successfully updated!');
    } else {
      // Create new recipe
      const newRecipe: Recipe = {
        id: `rec-${Date.now()}`,
        name: recipeName,
        yieldQty: parseFloat(yieldQty) || 1,
        yieldUnit: yieldUnit,
        salesPlu: salesPlu || `PLU-${Date.now().toString().slice(-3)}`,
        retailPrice: parseFloat(retailPrice) || 0,
        category: category,
        ingredients: ingredientsLines.map((line) => {
          const prod = products.find((p) => p.id === line.productId)!;
          return {
            productId: line.productId,
            quantity: line.quantity,
            unit: prod.stockingUnit,
          };
        }),
        isActive: true,
      };

      setRecipes((prev) => [newRecipe, ...prev]);
      alert('Recipe successfully created!');
    }

    // Reset Form
    setRecipeName('');
    setYieldQty('1');
    setYieldUnit('Serving');
    setRetailPrice('');
    setSalesPlu('');
    setCategory('Mains');
    setIngredientsLines([]);
    setActiveTab('recipes');
  };

  // Launch pre-assembly Batch production job
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const recipe = recipes.find((r) => r.id === selectedRecipeId);
    if (!recipe) return;

    const qty = parseFloat(batchQty) || 1;

    const newJob: BatchJob = {
      id: `bt-${Date.now().toString().slice(-4)}`,
      recipeId: selectedRecipeId,
      storeId: selectedStoreId,
      batchDate: new Date().toISOString(),
      quantityProduced: qty,
      status: 'Processing',
      performedBy: 'Marcus Brody',
      notes: `Batch pre-assembly for recipe ${recipe.name}`,
    };

    setBatchJobs((prev) => [newJob, ...prev]);
    setBatchQty('1');
    alert('Batch Job triggered! Track progress in the list below.');
  };

  // Complete Batch Job (Triggers automated raw stock deduction & logs depletions/adjustments)
  const handleCompleteBatchJob = (jobId: string) => {
    const job = batchJobs.find((j) => j.id === jobId);
    if (!job) return;

    const recipe = recipes.find((r) => r.id === job.recipeId);
    if (!recipe) return;

    // 1. Loop ingredients, compute required amount, and deduct from store inventories
    setInventories((prev) =>
      prev.map((inv) => {
        if (inv.storeId !== job.storeId) return inv;
        const ing = recipe.ingredients.find((i) => i.productId === inv.productId);
        if (!ing) return inv;

        // Consume = (Batch qty produced / Recipe yield_qty) * Ingredient quantity
        const consumedAmount = (job.quantityProduced / recipe.yieldQty) * ing.quantity;

        return {
          ...inv,
          theoreticalStock: Math.max(0, inv.theoreticalStock - consumedAmount),
        };
      })
    );

    // 2. Log corresponding stock adjustments for recipe depletion de-stocking logs
    const newAdjustments: StockAdjustment[] = recipe.ingredients.map((ing) => {
      const prod = products.find((p) => p.id === ing.productId)!;
      const consumedAmount = (job.quantityProduced / recipe.yieldQty) * ing.quantity;
      const unitCost = prod.basePrice / prod.unitsPerPackage;

      return {
        id: `adj-batch-${job.id}-${ing.productId}`,
        productId: ing.productId,
        storeId: job.storeId,
        date: new Date().toISOString(),
        quantity: -consumedAmount,
        reason: 'Recipe Outward',
        costValue: -(consumedAmount * unitCost),
        notes: `Automated batch recipe depletion for Job #${job.id}`,
        performedBy: 'Marcus Brody',
      };
    });

    setAdjustments((prev) => [...newAdjustments, ...prev]);

    // 3. Mark batch job completed
    setBatchJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: 'Completed' } : j))
    );

    alert('Batch production finalized! Raw inventory levels have been automatically depleted.');
  };

  return (
    <div className="space-y-6" id="admin-recipes-panel">
      {/* Subtab Navigation */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <button
          id="btn-subtab-recipe-list"
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'recipes'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          Recipes & Cost Yields
        </button>

        <button
          id="btn-subtab-recipe-create"
          onClick={() => {
            setEditingRecipeId(null);
            setRecipeName('');
            setYieldQty('1');
            setYieldUnit('Serving');
            setRetailPrice('');
            setSalesPlu('');
            setCategory('Mains');
            setIngredientsLines([]);
            setActiveTab('create');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          {editingRecipeId ? 'Edit Active Recipe' : 'Build Recipe & Cost Modeling'}
        </button>

        <button
          id="btn-subtab-recipe-batches"
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          Batches Sub-Assembly Production ({batchJobs.filter(b=>b.status==='Processing').length})
        </button>
      </div>

      {/* RECIPES CATALOG LIST */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipes.map((recipe) => {
            const ingCost = calculateRecipeIngredientsCost(recipe);
            const foodCostPercent = recipe.retailPrice ? (ingCost / recipe.retailPrice) * 100 : 0;
            return (
              <div
                key={recipe.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-50 dark:bg-gray-850 border px-2.5 py-0.5 rounded-full">
                      {recipe.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-gray-400">
                        PLU: {recipe.salesPlu}
                      </span>
                      <button
                        onClick={() => handleEditRecipeClick(recipe)}
                        className="text-[10px] text-blue-500 font-extrabold hover:underline cursor-pointer border border-blue-100 bg-blue-50/30 px-1.5 py-0.5 rounded-md"
                        title="Edit Recipe"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <h4 className="font-black text-sm text-gray-900 dark:text-white mb-2">{recipe.name}</h4>
                  
                  {/* Yield quantity description */}
                  <div className="text-[11px] text-gray-400 mb-4 font-sans leading-relaxed">
                    Produces: <strong>{recipe.yieldQty} {recipe.yieldUnit}s</strong> of FOH portion.
                  </div>

                  {/* Raw materials nested list */}
                  <div className="bg-gray-50 dark:bg-gray-850 rounded-2xl p-3 border border-gray-50 mb-5">
                    <div className="text-[9px] font-bold uppercase text-gray-400 mb-2">Recipe Compositions</div>
                    <div className="space-y-1.5">
                      {recipe.ingredients.map((ing, idx) => {
                        const product = products.find((p) => p.id === ing.productId);
                        return (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="text-gray-600 dark:text-gray-400">{product?.name || 'Raw product'}</span>
                            <span className="font-bold font-mono">
                              {ing.quantity} {ing.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Costs Margin Box */}
                <div className="border-t pt-4 flex items-center justify-between">
                  <div className="grid grid-cols-3 gap-4 text-center w-full">
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase">Ingredient Cost</div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                        ${ingCost.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase">Menu Sales Price</div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                        {recipe.retailPrice ? `$${recipe.retailPrice.toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase">Food Cost Margin</div>
                      <div className={`text-xs font-black mt-1 ${foodCostPercent > 35 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {recipe.retailPrice ? `${foodCostPercent.toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE RECIPE FORM & COST MODELER */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateRecipeSubmit} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white tracking-wider mb-5">Build Recipe</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Recipe / Dish Name</label>
              <input
                id="input-create-recipe-name"
                type="text"
                required
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="e.g. Creamy Tuscan Penne Chicken"
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Menu Sales Price ($)</label>
              <input
                id="input-create-recipe-price"
                type="number"
                step="0.01"
                required
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="24.50"
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Yield Quantity</label>
              <input
                id="input-create-recipe-yieldqty"
                type="number"
                required
                value={yieldQty}
                onChange={(e) => setYieldQty(e.target.value)}
                placeholder="1"
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Yield Unit</label>
              <input
                id="input-create-recipe-yieldunit"
                type="text"
                required
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value)}
                placeholder="Serving / Liter"
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">POS Sales PLU Link</label>
              <input
                id="input-create-recipe-plu"
                type="text"
                required
                value={salesPlu}
                onChange={(e) => setSalesPlu(e.target.value)}
                placeholder="PLU-501"
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Recipe Ingredients nested selection */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Recipe Compositions</h4>
              <button
                id="btn-recipe-add-ing-line"
                type="button"
                onClick={handleAddIngredientLine}
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
              >
                <Plus size={12} /> Add Ingredient Component
              </button>
            </div>

            <div className="space-y-3">
              {ingredientsLines.map((line, idx) => {
                const matchedProd = products.find((p) => p.id === line.productId);
                return (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center border border-gray-100 dark:border-gray-850 p-4 rounded-2xl bg-gray-50/40">
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Ingredient Raw Goods</label>
                      <select
                        id={`recipe-ing-select-${idx}`}
                        value={line.productId}
                        onChange={(e) => {
                          const updated = [...ingredientsLines];
                          updated[idx].productId = e.target.value;
                          setIngredientsLines(updated);
                        }}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock Unit: {p.stockingUnit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 flex-1 w-full">
                      <div>
                        <label className="block text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Required Quantity</label>
                        <input
                          id={`recipe-ing-qty-${idx}`}
                          type="number"
                          step="0.001"
                          required
                          value={line.quantity}
                          onChange={(e) => {
                            const updated = [...ingredientsLines];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setIngredientsLines(updated);
                          }}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between text-right mt-4 pl-4">
                        <span className="text-gray-400 font-mono text-[10px]">{matchedProd?.stockingUnit}</span>
                        <button
                          id={`btn-remove-recipe-ing-${idx}`}
                          type="button"
                          onClick={() => handleRemoveIngredientLine(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              id="btn-recipe-submit"
              type="submit"
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
            >
              🚀 Save Recipe & Bind PLU Code
            </button>
          </div>
        </form>
      )}

      {/* BATCHES SUB-ASSEMBLY PRODUCTION VIEW */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          {/* Create Batch Trigger form */}
          <form onSubmit={handleCreateBatch} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Trigger Sub-Assembly Batch Processing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Select Batch Formula</label>
                <select
                  id="select-batch-recipe"
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Outlet Store Location</label>
                <select
                  id="select-batch-store"
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
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Quantity to Produce (Yield Units)</label>
                <div className="flex gap-2">
                  <input
                    id="input-batch-qty"
                    type="number"
                    required
                    value={batchQty}
                    onChange={(e) => setBatchQty(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                  <button
                    id="btn-batch-submit"
                    type="submit"
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm shrink-0"
                  >
                    Launch Batch
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Active & Historical Batch Logs */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Production Jobs Register</h3>
            
            <div className="space-y-4">
              {batchJobs.map((job) => {
                const recipeName = recipes.find(r=>r.id === job.recipeId)?.name || 'House Formula';
                const storeName = stores.find(s=>s.id === job.storeId)?.name || 'Downtown';
                const isExpanded = expandedJobId === job.id;
                const recipeObj = recipes.find(r=>r.id === job.recipeId);

                return (
                  <div key={job.id} className="border border-gray-100 dark:border-gray-850 rounded-2xl overflow-hidden bg-gray-50/20">
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50"
                      onClick={() => job.status === 'Completed' && setExpandedJobId(isExpanded ? null : job.id)}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            job.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-orange-50 text-orange-600 animate-pulse'
                          }`}>
                            {job.status}
                          </span>
                          <span className="font-bold text-xs text-gray-900 dark:text-white">Job #{job.id}</span>
                        </div>
                        <h4 className="font-bold text-xs">{recipeName}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Factory Node: {storeName} • Batch Quantity: {job.quantityProduced} • Date: {new Date(job.batchDate).toLocaleString()}
                        </p>
                      </div>

                      <div className="mt-3 sm:mt-0 flex items-center gap-3">
                        {job.status === 'Processing' ? (
                          <button
                            id={`btn-complete-batch-${job.id}`}
                            onClick={(e) => { e.stopPropagation(); handleCompleteBatchJob(job.id); }}
                            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-sm"
                          >
                            <Check size={12} /> Complete & Deplete Raw Stock
                          </button>
                        ) : (
                          <div className="flex flex-col items-end text-xs">
                            <span className="text-emerald-500 font-bold flex items-center gap-1">
                              <Check size={14} /> Completed & Deducted
                            </span>
                            <span className="text-[9px] text-indigo-500 font-extrabold underline hover:text-indigo-600 mt-1">
                              {isExpanded ? 'Hide Consumption Audit' : '🔍 Audit Raw Deductions'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isExpanded && recipeObj && (
                      <div className="bg-white dark:bg-gray-900/60 p-4 border-t border-gray-100 dark:border-gray-850 text-xs space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest">Raw Ingredient Deduction Audit Trace</span>
                          <span className="text-[10px] text-gray-400 font-mono">Job Ref: #{job.id}</span>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                          {recipeObj.ingredients.map((ing) => {
                            const prod = products.find((p) => p.id === ing.productId);
                            if (!prod) return null;
                            const consumedAmount = (job.quantityProduced / recipeObj.yieldQty) * ing.quantity;
                            const unitCost = prod.basePrice / prod.unitsPerPackage;
                            const totalLoss = consumedAmount * unitCost;

                            return (
                              <div key={ing.productId} className="py-2 flex justify-between items-center font-medium">
                                <div>
                                  <span className="font-bold text-gray-900 dark:text-white">{prod.name}</span>
                                  <span className="text-[10px] text-gray-400 block mt-0.5">
                                    Deducted: -{consumedAmount.toFixed(2)} {prod.stockingUnit} from inventory at {storeName}
                                  </span>
                                </div>
                                <div className="text-right font-mono">
                                  <span className="text-gray-400 text-[10px] block">${unitCost.toFixed(2)} / {prod.stockingUnit}</span>
                                  <span className="text-gray-900 dark:text-white font-bold">${totalLoss.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t pt-2 flex justify-between items-center font-bold text-xs bg-gray-50/50 dark:bg-gray-850/10 p-2 rounded-xl">
                          <span className="text-gray-500">Total Pre-Batch Material Cost:</span>
                          <span className="font-mono text-slate-900 dark:text-white font-extrabold">
                            ${recipeObj.ingredients.reduce((sum, ing) => {
                              const prod = products.find((p) => p.id === ing.productId);
                              if (!prod) return sum;
                              const consumedAmount = (job.quantityProduced / recipeObj.yieldQty) * ing.quantity;
                              return sum + consumedAmount * (prod.basePrice / prod.unitsPerPackage);
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
