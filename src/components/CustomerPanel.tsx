/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Clock, ArrowRight, User, MapPin, X, Plus, Minus, Info, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { Recipe, CustomerOrder, Store, Product } from '../types';
import { ALLERGENS, INITIAL_STORES } from '../data/mockData';
import { AllergenGrid } from './AllergenIcons';

interface CustomerPanelProps {
  stores: Store[];
  recipes: Recipe[];
  products: Product[];
  currentStoreId: string;
  setCurrentStoreId: (id: string) => void;
  customerOrders: CustomerOrder[];
  onPlaceOrder: (order: CustomerOrder) => void;
}

export const CustomerPanel: React.FC<CustomerPanelProps> = ({
  stores,
  recipes,
  products,
  currentStoreId,
  setCurrentStoreId,
  customerOrders,
  onPlaceOrder,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Starters' | 'Mains' | 'Desserts' | 'Beverages'>('All');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cart, setCart] = useState<{ recipe: Recipe; quantity: number; modifications: string[] }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'Dine-In' | 'Takeaway'>('Dine-In');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // Modal modifications state
  const [modOptions, setModOptions] = useState<string[]>([]);
  const [customMod, setCustomMod] = useState('');

  const currentStore = stores.find((s) => s.id === currentStoreId) || stores[0];

  const filteredRecipes = recipes.filter(
    (r) => r.isActive && (selectedCategory === 'All' || r.category === selectedCategory)
  );

  const activeOrder = customerOrders.find((o) => o.id === activeOrderId);

  // Add item to cart logic
  const handleOpenRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setModOptions([]);
  };

  const handleAddToCart = () => {
    if (!selectedRecipe) return;
    const finalMods = [...modOptions];
    if (customMod.trim()) {
      finalMods.push(customMod.trim());
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.recipe.id === selectedRecipe.id && 
                  item.modifications.join(',') === finalMods.join(',')
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, { recipe: selectedRecipe, quantity: 1, modifications: finalMods }];
    });

    setSelectedRecipe(null);
    setCustomMod('');
    setModOptions([]);
    // Visual indicator: briefly open cart drawer
    setShowCartDrawer(true);
  };

  const updateCartQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[idx].quantity += delta;
      if (updated[idx].quantity <= 0) {
        updated.splice(idx, 1);
      }
      return updated;
    });
  };

  const toggleMod = (mod: string) => {
    setModOptions((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const getRecipeAllergens = (recipe: Recipe) => {
    const allergenCodes = new Set<string>();
    recipe.ingredients.forEach((ing) => {
      const prod = products.find((p) => p.id === ing.productId);
      if (prod && prod.allergens) {
        prod.allergens.forEach((a) => allergenCodes.add(a));
      }
    });
    return Array.from(allergenCodes);
  };

  const getRecipeCostDetails = (recipe: Recipe) => {
    // Calculate simulated nutrition
    let calories = 320;
    let protein = '18g';
    let carbs = '35g';

    if (recipe.id.includes('steak')) {
      calories = 840; protein = '54g'; carbs = '2g';
    } else if (recipe.id.includes('pasta')) {
      calories = 680; protein = '32g'; carbs = '68g';
    } else if (recipe.id.includes('shrimp')) {
      calories = 410; protein = '24g'; carbs = '8g';
    } else if (recipe.id.includes('salad')) {
      calories = 290; protein = '6g'; carbs = '12g';
    }
    return { calories, protein, carbs };
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.recipe.retailPrice! * item.quantity, 0);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (fulfillmentType === 'Dine-In' && !tableNumber.trim()) {
      alert('Please enter your table number');
      return;
    }

    const newOrder: CustomerOrder = {
      id: `ord-cust-${Date.now().toString().slice(-4)}`,
      storeId: currentStoreId,
      customerName,
      tableNumber: fulfillmentType === 'Dine-In' ? `Table ${tableNumber}` : undefined,
      fulfillmentType: fulfillmentType === 'Dine-In' ? 'Dine-In' : 'Takeaway',
      status: 'Received',
      orderDate: new Date().toISOString(),
      totalAmount: cartTotal,
      items: cart.map((c) => ({
        recipeId: c.recipe.id,
        name: c.recipe.name,
        quantity: c.quantity,
        unitPrice: c.recipe.retailPrice!,
        modifications: c.modifications,
      })),
    };

    onPlaceOrder(newOrder);
    setActiveOrderId(newOrder.id);
    setCart([]);
    setShowCartDrawer(false);
  };

  const handleReorder = (pastOrder: CustomerOrder) => {
    const newItems = pastOrder.items.map((item) => {
      const matchedRecipe = recipes.find((r) => r.id === item.recipeId);
      return {
        recipe: matchedRecipe!,
        quantity: item.quantity,
        modifications: item.modifications || [],
      };
    }).filter(i => i.recipe !== undefined);

    setCart(newItems);
    setShowCartDrawer(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 font-sans text-gray-800 dark:text-gray-100" id="foh-customer-panel-container">
      {/* Tabletop / FOH Floating Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/20">
              🍳
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Bistro Tableside Ordering</h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={12} className="text-orange-500" />
                <select
                  id="foh-store-selector"
                  value={currentStoreId}
                  onChange={(e) => setCurrentStoreId(e.target.value)}
                  className="bg-transparent font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer border-none p-0 focus:ring-0"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id} className="dark:bg-gray-900">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active order status pill */}
            {activeOrder && (
              <button
                id="btn-active-order-tracking"
                onClick={() => {
                  setSelectedCategory('All');
                  // scroll to bottom tracking section
                  document.getElementById('foh-order-tracking-anchor')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hidden sm:flex items-center gap-2 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-orange-100 dark:border-orange-900/30 animate-pulse cursor-pointer"
              >
                <Clock size={12} />
                Tracking Order #{activeOrder.id.replace('ord-cust-', '')} ({activeOrder.status})
              </button>
            )}

            <button
              id="foh-cart-button"
              onClick={() => setShowCartDrawer(true)}
              className="relative p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 transition-all cursor-pointer"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 dark:bg-orange-600 text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-900 animate-bounce">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Banner Area */}
        <div className="mb-8 rounded-3xl overflow-hidden relative bg-gradient-to-r from-orange-600 to-amber-500 p-8 text-white shadow-xl shadow-orange-600/15">
          <div className="absolute right-0 bottom-0 opacity-15 text-[150px] pointer-events-none select-none translate-x-10 translate-y-10">
            🥗
          </div>
          <div className="relative z-10 max-w-lg">
            <span className="bg-white/20 text-white backdrop-blur-md text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-white/10">
              Smart Table {tableNumber ? `#${tableNumber}` : 'Service'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 mb-2 leading-tight">
              Fresh Ingredients, Cost-Analyzed Masterpieces
            </h2>
            <p className="text-white/80 text-sm font-light leading-relaxed">
              Every dish is dynamically mapped to raw storage quantities. Direct-cost transparency, local allergens disclosure, and instantaneous kitchen dispatch.
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-6 overflow-x-auto no-scrollbar py-2 flex items-center gap-2">
          {(['All', 'Starters', 'Mains', 'Desserts', 'Beverages'] as const).map((cat) => (
            <button
              key={cat}
              id={`filter-cat-${cat}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-2xl text-sm font-medium tracking-wide whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-950 border-gray-900 dark:border-white shadow-md shadow-gray-900/10'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850'
              }`}
            >
              {cat === 'All' ? '🍽️ Show All' : cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <section className="mb-12">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 tracking-wide uppercase">
            Menu Selection ({filteredRecipes.length} dishes available)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => {
              const allergenCodes = getRecipeAllergens(recipe);
              const { calories } = getRecipeCostDetails(recipe);
              return (
                <motion.div
                  layoutId={`recipe-card-${recipe.id}`}
                  key={recipe.id}
                  className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-850 hover:border-gray-200 dark:hover:border-gray-800 hover:shadow-xl transition-all duration-300 flex flex-col group"
                >
                  <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'}
                      alt={recipe.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md text-gray-900 dark:text-white px-3 py-1 rounded-2xl text-xs font-bold border border-gray-100 dark:border-gray-800 shadow-sm">
                      ${recipe.retailPrice?.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="mb-2">
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 dark:bg-orange-950/30 px-2.5 py-0.5 rounded-full">
                        {recipe.category}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-orange-500 transition-colors">
                      {recipe.name}
                    </h4>

                    {/* Nutrition estimate */}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4 font-mono">
                      ~{calories} kcal • Serving Size: {recipe.yieldQty} {recipe.yieldUnit}
                    </p>

                    {/* Allergens visualization block */}
                    <div className="mt-auto pt-3 border-t border-gray-50 dark:border-gray-850">
                      <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Allergen Flags</div>
                      <AllergenGrid codes={allergenCodes} />
                    </div>

                    <button
                      id={`btn-open-recipe-${recipe.id}`}
                      onClick={() => handleOpenRecipeDetails(recipe)}
                      className="mt-4 w-full bg-gray-50 dark:bg-gray-850 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 text-gray-700 dark:text-gray-300 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1"
                    >
                      Configure & Add <Plus size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Detailed Dish Modal / Exploded View */}
        <AnimatePresence>
          {selectedRecipe && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedRecipe(null)}
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              />

              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                id="foh-dish-detail-modal"
                className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden z-10 border border-gray-100 dark:border-gray-800"
              >
                {/* Image & Header */}
                <div className="relative h-60 bg-gray-100 dark:bg-gray-800">
                  <img
                    src={selectedRecipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'}
                    alt={selectedRecipe.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <button
                    id="btn-close-recipe-modal"
                    onClick={() => setSelectedRecipe(null)}
                    className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full cursor-pointer transition-all"
                  >
                    <X size={18} />
                  </button>

                  <div className="absolute bottom-4 left-5 right-5 text-white">
                    <span className="bg-orange-500 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full">
                      {selectedRecipe.category}
                    </span>
                    <h3 className="text-xl font-bold tracking-tight mt-2">{selectedRecipe.name}</h3>
                  </div>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Details */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Recipe Costing & Ingredients</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                      Hand-crafted using fresh, locally sourced materials. Yields {selectedRecipe.yieldQty} {selectedRecipe.yieldUnit} of pristine FOH portioning.
                    </p>

                    {/* Nutrition Metrics Box */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-850 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/60 mb-5">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">CALORIES</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{getRecipeCostDetails(selectedRecipe).calories}</div>
                      </div>
                      <div className="text-center border-x border-gray-100 dark:border-gray-800">
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">PROTEIN</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{getRecipeCostDetails(selectedRecipe).protein}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">CARBS</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{getRecipeCostDetails(selectedRecipe).carbs}</div>
                      </div>
                    </div>

                    {/* Allergen list */}
                    <div className="mb-4">
                      <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Allergens List</div>
                      <AllergenGrid codes={getRecipeAllergens(selectedRecipe)} showNames={true} size="sm" />
                    </div>
                  </div>

                  {/* Right Column: Custom Modifications & Action */}
                  <div className="flex flex-col">
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Custom Modifications</h4>

                    {/* Modification Presets */}
                    <div className="flex flex-col gap-2 mb-4">
                      {['No Dairy Substitute', 'Extra Dressing/Sauce', 'Substitute Wheat-Free Pasta (Gluten Free)', 'Cook Medium Well'].map((opt) => (
                        <button
                          key={opt}
                          id={`mod-opt-${opt.replace(/\s+/g, '-')}`}
                          type="button"
                          onClick={() => toggleMod(opt)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                            modOptions.includes(opt)
                              ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-500 text-orange-600 dark:text-orange-400'
                              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850'
                          }`}
                        >
                          <span>{opt}</span>
                          {modOptions.includes(opt) ? <Check size={14} className="text-orange-500" /> : <Plus size={14} className="text-gray-400" />}
                        </button>
                      ))}
                    </div>

                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Special Chef Instructions</label>
                      <input
                        id="input-foh-special-instructions"
                        type="text"
                        value={customMod}
                        onChange={(e) => setCustomMod(e.target.value)}
                        placeholder="e.g., Allergen warning, butter on side..."
                        className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">Total Unit Price:</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">${selectedRecipe.retailPrice?.toFixed(2)}</span>
                      </div>
                      <button
                        id="btn-add-to-cart-confirm"
                        onClick={handleAddToCart}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl text-sm tracking-wide shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingCart size={16} /> Add to Cart Basket
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Order Tracking Dashboard Anchor & Activity Screen */}
        <div id="foh-order-tracking-anchor" className="scroll-mt-24">
          {activeOrder ? (
            <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-3xl p-6 shadow-md shadow-gray-100/5 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5 mb-5 gap-3">
                <div>
                  <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-extrabold tracking-wider px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/40">
                    Live Order Tracker
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                    Current Active Order #{activeOrder.id.replace('ord-cust-', '')}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Placed at {new Date(activeOrder.orderDate).toLocaleTimeString()} • {activeOrder.fulfillmentType} ({activeOrder.tableNumber || 'Takeaway'})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right md:mr-3">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Amount Due</div>
                    <div className="text-base font-extrabold text-gray-950 dark:text-white">${activeOrder.totalAmount.toFixed(2)}</div>
                  </div>
                  {activeOrder.status === 'Paid' && (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Check size={12} /> Paid & Dispatched
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Stepper Timeline */}
              <div className="mb-8">
                <div className="flex items-center justify-between max-w-xl mx-auto relative px-4">
                  {/* Background Connector line */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 z-0" />
                  {/* Dynamic Filled Connector Line */}
                  <div
                    className="absolute top-1/2 left-0 h-1 bg-orange-500 -translate-y-1/2 z-0 transition-all duration-1000"
                    style={{
                      width:
                        activeOrder.status === 'Received' ? '15%' :
                        activeOrder.status === 'Preparing' ? '50%' :
                        activeOrder.status === 'Ready' ? '85%' : '100%'
                    }}
                  />

                  {/* Step 1: Received */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      ['Received', 'Preparing', 'Ready', 'Delivered', 'Paid'].includes(activeOrder.status)
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500'
                    }`}>
                      1
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mt-2">Received</span>
                  </div>

                  {/* Step 2: Preparing */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      ['Preparing', 'Ready', 'Delivered', 'Paid'].includes(activeOrder.status)
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                    }`}>
                      2
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mt-2">Preparing</span>
                  </div>

                  {/* Step 3: Ready */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      ['Ready', 'Delivered', 'Paid'].includes(activeOrder.status)
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                    }`}>
                      3
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mt-2">Ready</span>
                  </div>

                  {/* Step 4: Dispatched */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      ['Delivered', 'Paid'].includes(activeOrder.status)
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                    }`}>
                      ✓
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mt-2">Dispatched</span>
                  </div>
                </div>
              </div>

              {/* Items ordered in current active order */}
              <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/60 max-w-xl mx-auto">
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Order Summary</div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-sans">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white">{item.quantity}x</span> {item.name}
                        {item.modifications && item.modifications.length > 0 && (
                          <div className="text-[10px] text-orange-500 mt-0.5">
                            Mods: {item.modifications.join(', ')}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 mb-8 max-w-xl mx-auto">
              <Info size={28} className="mx-auto text-gray-400 mb-2" />
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No active tableside order found</h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                Select items from the menu, customize modifications, and checkout to see real-time updates!
              </p>
            </div>
          )}
        </div>

        {/* Purchase History / Past orders */}
        <section className="mb-12">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 tracking-wide uppercase">
            Your Tableside Purchase History
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerOrders.filter(o => o.id !== activeOrderId).slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl flex items-center justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">Order #{order.id.replace('ord-cust-', '')}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {order.items.map(i => `${i.quantity}x ${i.name.split(' ')[0]}`).join(', ')}
                  </div>
                  <div className="text-xs font-bold text-orange-500 mt-1.5">${order.totalAmount.toFixed(2)}</div>
                </div>

                <button
                  id={`btn-reorder-${order.id}`}
                  onClick={() => handleReorder(order)}
                  className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-white hover:bg-orange-500 border border-orange-100 dark:border-orange-900/40 px-3 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw size={12} /> Reorder
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Cart Drawer Overlay */}
      <AnimatePresence>
        {showCartDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCartDrawer(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              id="foh-cart-drawer"
              className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-100 dark:border-gray-850 z-10"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-850">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-orange-500" size={18} />
                  <h3 className="font-bold text-gray-900 dark:text-white">FOH Ordering Basket</h3>
                </div>
                <button
                  id="btn-close-cart-drawer"
                  onClick={() => setShowCartDrawer(false)}
                  className="p-1.5 bg-gray-200/60 dark:bg-gray-800 hover:bg-orange-500 hover:text-white text-gray-500 rounded-full cursor-pointer transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Basket Items List */}
              <div className="flex-1 overflow-y-auto p-5 no-scrollbar divide-y divide-gray-100 dark:divide-gray-800">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingCart size={36} className="mx-auto text-gray-300 mb-3" />
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Basket is empty</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                      Explore the gourmet menu, customize your steaks, pastas, or shrimp skewers, and load them in!
                    </p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="py-4 flex gap-3 first:pt-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        <img
                          src={item.recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'}
                          alt={item.recipe.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{item.recipe.name}</h4>
                        {item.modifications.length > 0 && (
                          <div className="text-[10px] text-orange-500 mt-1 flex flex-wrap gap-1">
                            {item.modifications.map((m, mIdx) => (
                              <span key={mIdx} className="bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded-md border border-orange-100 dark:border-orange-900/30">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2.5">
                          <span className="text-xs font-bold text-gray-950 dark:text-white">${(item.recipe.retailPrice! * item.quantity).toFixed(2)}</span>
                          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 px-2 py-1 rounded-xl">
                            <button
                              id={`cart-qty-dec-${idx}`}
                              onClick={() => updateCartQty(idx, -1)}
                              className="p-1 text-gray-500 hover:text-orange-500 cursor-pointer"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <button
                              id={`cart-qty-inc-${idx}`}
                              onClick={() => updateCartQty(idx, 1)}
                              className="p-1 text-gray-500 hover:text-orange-500 cursor-pointer"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Form & Panel Footer */}
              {cart.length > 0 && (
                <form onSubmit={handleCheckout} className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850">
                  <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Service Allocation</div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Customer Name</label>
                      <input
                        id="input-cart-customer-name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder=" Sarah"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Fulfillment</label>
                      <select
                        id="select-cart-fulfillment"
                        value={fulfillmentType}
                        onChange={(e) => setFulfillmentType(e.target.value as 'Dine-In' | 'Takeaway')}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-none"
                      >
                        <option value="Dine-In">Dine-In Table</option>
                        <option value="Takeaway">Takeaway Box</option>
                      </select>
                    </div>
                  </div>

                  {fulfillmentType === 'Dine-In' && (
                    <div className="mb-4">
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Table Number</label>
                      <input
                        id="input-cart-table-number"
                        type="text"
                        required
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. 4, 12, 15"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-800/80 pt-4 mb-4">
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="text-gray-400 dark:text-gray-500">Subtotal Amount:</span>
                      <span className="font-bold">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="text-gray-400 dark:text-gray-500">Tax & FOH Surcharges:</span>
                      <span className="font-bold text-emerald-500">FREE</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-gray-900 dark:text-white">Order Total:</span>
                      <span className="font-extrabold text-orange-500 text-base">${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    id="btn-cart-submit"
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl text-sm tracking-wide shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Confirm Order & Send to Kitchen <ArrowRight size={14} />
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
