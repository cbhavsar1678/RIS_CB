/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Plus, Search, Building2, Check, Edit2, Shield, Info, Sliders, Layers, RefreshCw } from 'lucide-react';
import { Store, Product, Inventory } from '../../types';

interface AdminLocationsProps {
  stores: Store[];
  setStores: React.Dispatch<React.SetStateAction<Store[]>>;
  products: Product[];
  inventories: Inventory[];
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>;
  adminStoreId: string;
  setAdminStoreId: (storeId: string) => void;
}

export const AdminLocations: React.FC<AdminLocationsProps> = ({
  stores,
  setStores,
  products,
  inventories,
  setInventories,
  adminStoreId,
  setAdminStoreId,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'outlets' | 'inventory-mapping'>('outlets');
  
  // Create / Edit Outlet Form state
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeLat, setStoreLat] = useState('');
  const [storeLng, setStoreLng] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMappingStoreId, setSelectedMappingStoreId] = useState<string>(stores[0]?.id || '');
  
  // Geo-location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [nearestStoreId, setNearestStoreId] = useState<string | null>(null);

  // Haversine formula to compute distance in miles between coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Perform geolocation detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsDetecting(false);

        // Find closest store
        let closestStore: Store | null = null;
        let minDistance = Infinity;

        stores.forEach((store) => {
          if (store.latitude && store.longitude && store.isActive) {
            const dist = calculateDistance(latitude, longitude, store.latitude, store.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              closestStore = store;
            }
          }
        });

        if (closestStore) {
          setNearestStoreId((closestStore as Store).id);
        }
      },
      (error) => {
        console.warn('Geolocation warning (using fallback):', error.message || error);
        setIsDetecting(false);
        // Fallback or explain coordinates
        setGeoError(`Access denied or unavailable (${error.message}). Simulating coordinate detection near New York City...`);
        
        // Simulating coordinate detection near Empire State Building for robust fallback
        setTimeout(() => {
          const simLat = 40.7484;
          const simLng = -73.9857;
          setUserLocation({ lat: simLat, lng: simLng });
          
          let closestStore: Store | null = null;
          let minDistance = Infinity;

          stores.forEach((store) => {
            if (store.latitude && store.longitude && store.isActive) {
              const dist = calculateDistance(simLat, simLng, store.latitude, store.longitude);
              if (dist < minDistance) {
                minDistance = dist;
                closestStore = store;
              }
            }
          });

          if (closestStore) {
            setNearestStoreId((closestStore as Store).id);
          }
        }, 1000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Select nearest store immediately
  const handleSelectNearestStore = () => {
    if (nearestStoreId) {
      setAdminStoreId(nearestStoreId);
      setSelectedMappingStoreId(nearestStoreId);
      alert(`Auto-selected the nearest commercial outlet: "${stores.find(s => s.id === nearestStoreId)?.name || 'Store'}" based on real-time telemetry calculation.`);
    }
  };

  // Auto-detect physical coordinate location on mount
  useEffect(() => {
    handleDetectLocation();
  }, []);

  // Reset form
  const resetForm = () => {
    setEditingStoreId(null);
    setStoreName('');
    setStoreCode('');
    setStoreAddress('');
    setStorePhone('');
    setStoreLat('');
    setStoreLng('');
  };

  // Fill edit form
  const handleEditStore = (store: Store) => {
    setEditingStoreId(store.id);
    setStoreName(store.name);
    setStoreCode(store.code);
    setStoreAddress(store.address);
    setStorePhone(store.phone);
    setStoreLat(store.latitude ? store.latitude.toString() : '');
    setStoreLng(store.longitude ? store.longitude.toString() : '');
    setActiveSubTab('outlets');
  };

  // Submit new or edited Store outlet
  const handleStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !storeCode || !storeAddress) {
      alert('Required parameters: Outlet Name, Unique Code, and Address.');
      return;
    }

    const latVal = parseFloat(storeLat) || 40.7306; // Defaults to general NYC latitude
    const lngVal = parseFloat(storeLng) || -73.9352;

    if (editingStoreId) {
      // Edit existing outlet
      setStores((prev) =>
        prev.map((s) =>
          s.id === editingStoreId
            ? {
                ...s,
                name: storeName,
                code: storeCode.toUpperCase(),
                address: storeAddress,
                phone: storePhone,
                latitude: latVal,
                longitude: lngVal,
              }
            : s
        )
      );
      alert(`Location Outlet "${storeName}" modified successfully.`);
    } else {
      // Create new outlet
      const newId = `st-${storeCode.toLowerCase().replace(/\s+/g, '-') || Date.now().toString().slice(-4)}`;
      const newStore: Store = {
        id: newId,
        name: storeName,
        code: storeCode.toUpperCase(),
        address: storeAddress,
        phone: storePhone,
        isActive: true,
        latitude: latVal,
        longitude: lngVal,
      };

      setStores((prev) => [...prev, newStore]);

      // Bootstrap inventories for ALL active products for this store
      const newInvs: Inventory[] = products.map((prod, idx) => ({
        id: `inv-boot-${Date.now().toString().slice(-4)}-${idx}`,
        productId: prod.id,
        storeId: newId,
        theoreticalStock: 10.0, // Standard starting bootstrap level
        reorderPoint: 5.0,
        parLevel: 15.0,
        storageLocation: 'Primary Chiller Box A',
      }));

      setInventories((prev) => [...prev, ...newInvs]);
      alert(`New Outlet "${storeName}" successfully established! Bootstrapped inventory parameters for ${products.length} catalog products.`);
    }

    resetForm();
  };

  // Toggle active/inactive state of a store outlet
  const handleToggleStoreActive = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, isActive: !s.isActive } : s))
    );
  };

  // Update specific item in inventory storage mapping
  const handleUpdateInventoryMapping = (invId: string, updates: Partial<Inventory>) => {
    setInventories((prev) =>
      prev.map((inv) => (inv.id === invId ? { ...inv, ...updates } : inv))
    );
  };

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="admin-locations-manager">
      {/* PERSISTENT GEO-LOCATION HUD BANNER */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-100 dark:border-blue-950/40 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-md">
            <Navigation size={18} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              Real-time Outlet GPS Telemetry & Geo-Routing
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mt-1 leading-snug">
              Auto-detect your browser coordinates to determine proximity indices, map local kitchen hubs, and auto-select your active physical inventory store.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            id="btn-trigger-geodetect"
            onClick={handleDetectLocation}
            disabled={isDetecting}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-black px-4.5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/10"
          >
            {isDetecting ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Detecting Satellites...
              </>
            ) : (
              <>
                <Navigation size={12} />
                Auto-Detect Location
              </>
            )}
          </button>

          {nearestStoreId && (
            <button
              id="btn-select-nearest-outlet"
              onClick={handleSelectNearestStore}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-4.5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
            >
              🎯 Select Nearest ({stores.find(s => s.id === nearestStoreId)?.name})
            </button>
          )}
        </div>
      </div>

      {/* Geolocation Details HUD */}
      {userLocation && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 px-5 py-3.5 rounded-2xl flex flex-wrap gap-4 items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
            <span>📡 Coordinates: <strong className="font-mono text-blue-500">{userLocation.lat.toFixed(5)}°N</strong>, <strong className="font-mono text-blue-500">{userLocation.lng.toFixed(5)}°W</strong></span>
            {geoError && <span className="text-amber-500 font-medium">({geoError})</span>}
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block text-right">Computed Proximity Table</span>
            <div className="flex gap-3 text-[10px]">
              {stores.filter(s => s.latitude && s.longitude).map((store) => {
                const dist = calculateDistance(userLocation.lat, userLocation.lng, store.latitude!, store.longitude!);
                const isClosest = store.id === nearestStoreId;
                return (
                  <span key={store.id} className={`px-2 py-0.5 rounded-full border ${isClosest ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200' : 'bg-gray-50 dark:bg-gray-850 text-gray-500 border-gray-100'}`}>
                    {store.name}: {dist.toFixed(1)} mi {isClosest && '⭐'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-850 pb-3">
        <button
          id="btn-subtab-locations-outlets"
          onClick={() => setActiveSubTab('outlets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeSubTab === 'outlets'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Building2 size={14} className="inline mr-1" /> Physical Outlets ({stores.length})
        </button>

        <button
          id="btn-subtab-locations-mapping"
          onClick={() => setActiveSubTab('inventory-mapping')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeSubTab === 'inventory-mapping'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Layers size={14} className="inline mr-1" /> Storage Location Mapping
        </button>
      </div>

      {/* OUTLETS SUB-TAB */}
      {activeSubTab === 'outlets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Create / Edit Form (Col Span 4) */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm self-start">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>{editingStoreId ? '📝 Edit Outlet Parameters' : '➕ Register New Outlet'}</span>
            </h3>

            <form onSubmit={storeSubmit => handleStoreSubmit(storeSubmit)} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Outlet Commercial Name *</label>
                <input
                  id="input-outlet-name"
                  type="text"
                  required
                  placeholder="e.g. Westside Grill & Cantina"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Unique Code *</label>
                  <input
                    id="input-outlet-code"
                    type="text"
                    required
                    placeholder="ST-WEST"
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Phone Number</label>
                  <input
                    id="input-outlet-phone"
                    type="text"
                    placeholder="555-0199"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Physical Address *</label>
                <input
                  id="input-outlet-address"
                  type="text"
                  required
                  placeholder="Street No., Area, Postal Code"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-50 dark:border-gray-850 mt-2">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1">
                    <span>Latitude</span>
                    <span className="text-[8px] text-blue-500 font-normal">(Auto-filled)</span>
                  </label>
                  <input
                    id="input-outlet-lat"
                    type="number"
                    step="0.0001"
                    placeholder="40.7306"
                    value={storeLat}
                    onChange={(e) => setStoreLat(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1.5 text-[11px] font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1">
                    <span>Longitude</span>
                    <span className="text-[8px] text-blue-500 font-normal">(Auto-filled)</span>
                  </label>
                  <input
                    id="input-outlet-lng"
                    type="number"
                    step="0.0001"
                    placeholder="-73.9352"
                    value={storeLng}
                    onChange={(e) => setStoreLng(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1.5 text-[11px] font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                {editingStoreId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-600 dark:text-gray-300 font-bold py-2 rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  id="btn-outlet-submit"
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-black py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-blue-500/10 transition-colors"
                >
                  {editingStoreId ? 'Apply Changes' : 'Add Outlet'}
                </button>
              </div>
            </form>
          </div>

          {/* Location Outlets Grid (Col Span 8) */}
          <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-sm font-extrabold uppercase text-slate-900 dark:text-white">Active Commercial Kitchens & Storefronts</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">List of physical store bins with real-time state routing, address indices, and maps.</p>
              </div>

              <div className="relative">
                <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="search-locations"
                  type="text"
                  placeholder="Filter outlets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none font-semibold w-48"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStores.map((store) => {
                const totalInvs = inventories.filter((i) => i.storeId === store.id);
                const lowStockCount = totalInvs.filter((i) => i.theoreticalStock <= i.reorderPoint).length;
                const isSelected = adminStoreId === store.id;

                return (
                  <div
                    key={store.id}
                    className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-950/10'
                        : 'border-gray-100 dark:border-gray-850 hover:border-gray-200 dark:hover:border-gray-800'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white font-black text-[8px] px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                        <Check size={8} /> Active Workspace
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[9px] font-bold text-gray-400 tracking-wider uppercase block">{store.code}</span>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{store.name}</h4>
                        </div>
                        <button
                          id={`btn-toggle-active-${store.id}`}
                          onClick={() => handleToggleStoreActive(store.id)}
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border cursor-pointer ${
                            store.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100'
                              : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100'
                          }`}
                        >
                          {store.isActive ? '● Active' : '○ Inactive'}
                        </button>
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-1"><MapPin size={10} className="shrink-0 text-slate-400" /> {store.address}</p>
                        <p>📞 Phone: {store.phone}</p>
                        {store.latitude && store.longitude && (
                          <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            🌐 GPS: {store.latitude.toFixed(4)}°N, {store.longitude.toFixed(4)}°W
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t mt-4 flex justify-between items-center text-[10px] font-bold text-gray-400">
                      <div>
                        Stock lines: <span className="text-slate-800 dark:text-slate-200">{totalInvs.length}</span> •{' '}
                        <span className={lowStockCount > 0 ? 'text-red-500' : 'text-emerald-500'}>
                          {lowStockCount} Low stock
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          id={`btn-edit-outlet-${store.id}`}
                          onClick={() => handleEditStore(store)}
                          className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-600 dark:text-slate-300 p-1.5 rounded-lg cursor-pointer"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          id={`btn-select-workspace-${store.id}`}
                          onClick={() => {
                            setAdminStoreId(store.id);
                            setSelectedMappingStoreId(store.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg cursor-pointer text-[9px] font-black uppercase ${
                            isSelected
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                              : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Use'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STORAGE LOCATION MAPPING SUB-TAB */}
      {activeSubTab === 'inventory-mapping' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-sm font-extrabold uppercase text-slate-900 dark:text-white">Store Inventory Parameters & Bins</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Map precise layout storage racks, custom reorder limits, and par limits per individual store catalog.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 shrink-0">Configure Store:</span>
              <select
                id="select-mapping-store"
                value={selectedMappingStoreId}
                onChange={(e) => setSelectedMappingStoreId(e.target.value)}
                className="bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-1.5 text-xs font-black focus:outline-none"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    📍 {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-850 border-b text-[9px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Product Item</th>
                  <th className="px-5 py-3">Current Stock</th>
                  <th className="px-5 py-3">Storage Location / Bin Room</th>
                  <th className="px-5 py-3">Reorder Point (Min)</th>
                  <th className="px-5 py-3">Par Level (Max)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.filter(p => !p.isArchived).map((prod) => {
                  const inv = inventories.find((i) => i.productId === prod.id && i.storeId === selectedMappingStoreId);
                  if (!inv) {
                    return (
                      <tr key={prod.id} className="text-gray-400 italic">
                        <td className="px-5 py-3 font-semibold">{prod.name}</td>
                        <td className="px-5 py-3" colSpan={4}>
                          No inventory mapping logged for this store. Click "Use Store" to initialize parameters.
                        </td>
                      </tr>
                    );
                  }

                  const isLow = inv.theoreticalStock <= inv.reorderPoint;

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/20">
                      <td className="px-5 py-3 font-extrabold text-slate-900 dark:text-white">
                        {prod.name}
                        <span className="text-[9px] text-gray-400 font-mono block font-normal">SKU: {prod.sku} • {prod.category}</span>
                      </td>

                      <td className="px-5 py-3 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={inv.theoreticalStock}
                            onChange={(e) =>
                              handleUpdateInventoryMapping(inv.id, {
                                theoreticalStock: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 text-center border bg-gray-50 dark:bg-gray-850 py-0.5 rounded-md focus:outline-none text-[11px]"
                          />
                          <span className="text-gray-400 font-normal">{prod.stockingUnit}s</span>
                          {isLow && (
                            <span className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[8px] font-black px-1.5 rounded uppercase">
                              Low
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3 font-semibold">
                        <input
                          type="text"
                          value={inv.storageLocation || ''}
                          placeholder="e.g. Walk-In Freezer Shelf 1"
                          onChange={(e) =>
                            handleUpdateInventoryMapping(inv.id, {
                              storageLocation: e.target.value,
                            })
                          }
                          className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-1 text-xs focus:outline-none focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-200"
                        />
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={inv.reorderPoint}
                            onChange={(e) =>
                              handleUpdateInventoryMapping(inv.id, {
                                reorderPoint: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-0.5 font-mono font-bold focus:outline-none"
                          />
                          <span className="text-[10px] text-gray-400">{prod.stockingUnit}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={inv.parLevel}
                            onChange={(e) =>
                              handleUpdateInventoryMapping(inv.id, {
                                parLevel: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-0.5 font-mono font-bold focus:outline-none"
                          />
                          <span className="text-[10px] text-gray-400">{prod.stockingUnit}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
