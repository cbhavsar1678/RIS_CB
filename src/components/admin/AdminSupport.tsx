/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Settings, Server, RefreshCw, Users, Key, Building2, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, Lock } from 'lucide-react';
import { User, Store } from '../../types';

interface AdminSupportProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  setCurrentUser: (u: User) => void;
  restaurantDetails: {
    name: string;
    logoEmoji: string;
    cuisine: string;
    phone: string;
    email: string;
    address: string;
  };
  setRestaurantDetails: React.Dispatch<React.SetStateAction<{
    name: string;
    logoEmoji: string;
    cuisine: string;
    phone: string;
    email: string;
    address: string;
  }>>;
  onResetDatabaseState: () => void;
}

export const AdminSupport: React.FC<AdminSupportProps> = ({
  users,
  setUsers,
  currentUser,
  setCurrentUser,
  restaurantDetails,
  setRestaurantDetails,
  onResetDatabaseState,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'branding' | 'logs'>('users');

  // General Settings variables state
  const [taxRate, setTaxRate] = useState('8.25');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [lowStockWarning, setLowStockWarning] = useState('5');
  const [posApiEndpoint, setPosApiEndpoint] = useState('https://api.pos-ingest.local/v1/sync');

  // Brand Form State
  const [brandName, setBrandName] = useState(restaurantDetails.name);
  const [logoEmoji, setLogoEmoji] = useState(restaurantDetails.logoEmoji);
  const [cuisine, setCuisine] = useState(restaurantDetails.cuisine);
  const [phone, setPhone] = useState(restaurantDetails.phone);
  const [email, setEmail] = useState(restaurantDetails.email);
  const [address, setAddress] = useState(restaurantDetails.address);

  // User Form State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'Owner' | 'Manager' | 'Staff' | 'Support Team'>('Manager');
  const [userPermissions, setUserPermissions] = useState<{ [key: string]: boolean }>({
    dashboard: true,
    products: true,
    orders: true,
    recipes: true,
    logistics: true,
    stocks: true,
    sales: true,
    suppliers: true,
    events: true,
    support: true,
  });

  const PAGE_LABELS: { [key: string]: string } = {
    dashboard: 'Admin Dashboard',
    products: 'Products & Wizard',
    orders: 'Procure Orders',
    recipes: 'Recipes & Manufacturing',
    logistics: 'Logistics Transfers',
    stocks: 'Stock & Schema',
    sales: 'Sales & POS Link',
    suppliers: 'Supplier Directory',
    events: 'Events & Forecast',
    support: 'Support & Settings',
  };

  const handleResetAction = () => {
    if (confirm('Database state reset: This action resets the entire in-memory ERP to its pristine starting mock states. Proceed?')) {
      onResetDatabaseState();
      alert('Pristine mock data restored!');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert('System operational variables successfully committed to database.');
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    setRestaurantDetails({
      name: brandName,
      logoEmoji,
      cuisine,
      phone,
      email,
      address,
    });
    alert('Restaurant brand identity successfully updated!');
  };

  const handleAddOrUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();

    const permissionsArray = Object.keys(userPermissions).filter(k => userPermissions[k]);

    if (editingUserId) {
      // Update
      setUsers(prev =>
        prev.map(u =>
          u.id === editingUserId
            ? {
                ...u,
                name: userName,
                email: userEmail,
                role: userRole as any,
                permissions: permissionsArray,
              }
            : u
        )
      );
      // If we updated the currently logged-in user, refresh their active profile details
      if (currentUser.id === editingUserId) {
        setCurrentUser({
          id: editingUserId,
          name: userName,
          email: userEmail,
          role: userRole as any,
          permissions: permissionsArray,
        } as any);
      }
      setEditingUserId(null);
      alert('User access profile updated!');
    } else {
      // Create new
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: userName,
        email: userEmail,
        role: userRole as any,
        permissions: permissionsArray,
      } as any;
      setUsers(prev => [...prev, newUser]);
      alert('New user successfully provisioned in auth directory!');
    }

    // Reset Form
    setUserName('');
    setUserEmail('');
    setUserRole('Manager');
    setUserPermissions({
      dashboard: true,
      products: true,
      orders: true,
      recipes: true,
      logistics: true,
      stocks: true,
      sales: true,
      suppliers: true,
      events: true,
      support: true,
    });
  };

  const handleEditUserClick = (u: any) => {
    setEditingUserId(u.id);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role || 'Manager');
    
    // Map permissions array back to map state
    const defaultPerms: { [key: string]: boolean } = {
      dashboard: false,
      products: false,
      orders: false,
      recipes: false,
      logistics: false,
      stocks: false,
      sales: false,
      suppliers: false,
      events: false,
      support: false,
    };
    
    const userPermsArray = u.permissions || ['dashboard', 'products', 'orders', 'recipes', 'logistics', 'stocks', 'sales', 'suppliers', 'events', 'support'];
    userPermsArray.forEach((p: string) => {
      defaultPerms[p] = true;
    });
    setUserPermissions(defaultPerms);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert('Cannot delete: This user is currently logged in.');
      return;
    }
    if (confirm('Are you sure you want to permanently remove this user and revoke all access tokens?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('User successfully de-provisioned.');
    }
  };

  const togglePermission = (key: string) => {
    setUserPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6" id="admin-support-panel">
      {/* Subtab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <button
          id="btn-subtab-support-users"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Users size={14} className="inline mr-1" /> User Directory & Page Access
        </button>

        <button
          id="btn-subtab-support-branding"
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Building2 size={14} className="inline mr-1" /> Outlet Details & Logo
        </button>

        <button
          id="btn-subtab-support-settings"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Settings size={14} className="inline mr-1" /> System Variables
        </button>

        <button
          id="btn-subtab-support-logs"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Server size={14} className="inline mr-1" /> Daemon Support Logs
        </button>
      </div>

      {/* USER MANAGEMENT & ACCESS RIGHTS TAB */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* User Form Editor (SPAN 5) */}
          <form onSubmit={handleAddOrUpdateUser} className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest flex items-center gap-1.5">
              <Key size={14} className="text-blue-500" />
              {editingUserId ? 'Edit Account Permissions' : 'Provision Staff Account'}
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Full Name</label>
                <input
                  id="input-user-fullname"
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Jimmy Vance"
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Email / SSO Handle</label>
                <input
                  id="input-user-email"
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Functional Role</label>
                <select
                  id="select-user-role"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none font-medium"
                >
                  <option value="Owner">Restaurant Owner / Partner</option>
                  <option value="Manager">Outlet Store Manager</option>
                  <option value="Staff">Kitchen / FOH Staff</option>
                  <option value="Support Team">Support Team / SysAdmin</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Toggle Page access rights</label>
                <div className="bg-gray-50 dark:bg-gray-850 rounded-2xl p-3 border border-gray-50 dark:border-gray-800 space-y-2 max-h-48 overflow-y-auto">
                  {Object.keys(PAGE_LABELS).map((key) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">{PAGE_LABELS[key]}</span>
                      <input
                        type="checkbox"
                        checked={userPermissions[key]}
                        onChange={() => togglePermission(key)}
                        className="rounded text-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3.5">
              {editingUserId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingUserId(null);
                    setUserName('');
                    setUserEmail('');
                    setUserRole('Manager');
                    setUserPermissions({
                      dashboard: true,
                      products: true,
                      orders: true,
                      recipes: true,
                      logistics: true,
                      stocks: true,
                      sales: true,
                      suppliers: true,
                      events: true,
                      support: true,
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs bg-gray-105 hover:bg-gray-200 text-gray-600"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm"
              >
                {editingUserId ? 'Commit Access Rights' : 'Create User Profile'}
              </button>
            </div>
          </form>

          {/* User List and Switcher simulation (SPAN 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Identity Switcher Simulator Banner */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-xs uppercase font-bold tracking-widest text-slate-400">Identity Switcher Simulation</h4>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-850 p-4 rounded-2xl border border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400">Current Active Operator Session</span>
                  <p className="text-xs font-black text-white">{currentUser.name} ({currentUser.role})</p>
                  <p className="text-[10px] text-blue-400 font-semibold truncate max-w-[200px]">{currentUser.email}</p>
                </div>

                <div className="shrink-0">
                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Simulate Login As</label>
                  <select
                    id="select-active-session-user"
                    value={currentUser.id}
                    onChange={(e) => {
                      const matched = users.find(u => u.id === e.target.value);
                      if (matched) {
                        setCurrentUser(matched);
                        alert(`Session updated! Simulating session for: ${matched.name}. Page access restrictions applied.`);
                      }
                    }}
                    className="bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-xl focus:outline-none"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Shield size={12} className="text-blue-400 shrink-0" />
                <span>Simulating user sessions lets you inspect limited page permissions in real time.</span>
              </div>
            </div>

            {/* Auth Directory */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-5 rounded-3xl shadow-sm">
              <h4 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-wider">Authentication & Access Token Directory</h4>

              <div className="space-y-3">
                {users.map((u: any) => {
                  const isCurrent = currentUser.id === u.id;
                  const uPerms = u.permissions || ['dashboard', 'products', 'orders', 'recipes', 'logistics', 'stocks', 'sales', 'suppliers', 'events', 'support'];
                  return (
                    <div key={u.id} className="p-4 border border-gray-50 dark:border-gray-850 rounded-2xl flex items-center justify-between gap-4 bg-gray-50/20 hover:bg-gray-50/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900 dark:text-white">{u.name}</span>
                          {isCurrent && (
                            <span className="text-[8px] uppercase font-extrabold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">ACTIVE</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{u.email}</span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            Role: {u.role || 'Manager'}
                          </span>
                          <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full">
                            {uPerms.length} Pages Accessible
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEditUserClick(u)}
                          className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer font-bold"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-500 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer font-bold"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OUTLET BRAND & LOGO CONFIGURATION TAB */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight">Restaurant Branding Configurator</h3>
              <p className="text-xs text-gray-400">Establish corporate identity details and logo markers printed on invoices and client receipts</p>
            </div>
            <div className="text-3xl bg-slate-50 dark:bg-slate-800 border p-3.5 rounded-2xl shrink-0">{logoEmoji}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Establishment Name</label>
              <input
                id="input-brand-name"
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Corporate Logo Emoji</label>
              <select
                id="select-brand-logo"
                value={logoEmoji}
                onChange={(e) => setLogoEmoji(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none font-medium"
              >
                <option value="🍳">🍳 Cast Iron Skillet</option>
                <option value="🍔">🍔 Gourmet Burger</option>
                <option value="🍕">🍕 Wood-fired Pizza</option>
                <option value="🍣">🍣 Sushi Chef</option>
                <option value="🥗">🥗 Organic Greens</option>
                <option value="🍷">🍷 Wine & Bistro</option>
                <option value="🥩">🥩 High-end Steakhouse</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Cuisine Accent / Tag</label>
              <input
                id="input-brand-cuisine"
                type="text"
                required
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Primary Support Desk Email</label>
              <input
                id="input-brand-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Primary Outlet Phone</label>
              <input
                id="input-brand-phone"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">HQ Billing / Dispatch Address</label>
            <textarea
              id="input-brand-address"
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-3 border-t">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Commit Corporate Identity
            </button>
          </div>
        </form>
      )}

      {/* SYSTEM VARIABLES TAB */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveSettings} className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">Global ERP Parameters</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Tax Rate Percentage (%)</label>
                <input
                  id="input-setting-tax"
                  type="text"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Currency Symbol</label>
                <input
                  id="input-setting-currency"
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Low Stock Notify Limit (Packages)</label>
                <input
                  id="input-setting-lowstock"
                  type="number"
                  value={lowStockWarning}
                  onChange={(e) => setLowStockWarning(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">POS API Gateway Endpoint</label>
                <input
                  id="input-setting-pos"
                  type="text"
                  value={posApiEndpoint}
                  onChange={(e) => setPosApiEndpoint(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <button
              id="btn-settings-save"
              type="submit"
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Commit Configuration Changes
            </button>
          </form>

          {/* Database maintenance */}
          <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">Core Database Maintenance</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              If manual stock depletion simulated logs or customer orders have exhausted inventory, perform a complete data-state re-seeding to restore initial pristine vectors.
            </p>

            <button
              id="btn-database-reset-state"
              onClick={handleResetAction}
              className="w-full flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-2xl text-xs cursor-pointer border border-red-200 transition-all shadow-sm"
            >
              <RefreshCw size={14} /> Clear State & Re-Seed SQL Database
            </button>
          </div>
        </div>
      )}

      {/* MICROSERVICES DAEMON LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="bg-gray-950 rounded-3xl overflow-hidden p-5 border border-gray-800 flex flex-col">
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pb-3 border-b border-gray-900 mb-4">
            <span>DAEMON EVENT TRACER OUT</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> STABLE
            </span>
          </div>

          <div className="font-mono text-[10px] text-gray-300 space-y-3.5 max-h-[380px] overflow-y-auto no-scrollbar">
            {[
              { timestamp: new Date(Date.now() - 5000).toLocaleString(), component: 'POS_INGEST_DAEMON', level: 'INFO', msg: 'Sales log synchronization loop active. Waiting on next polling sequence...' },
              { timestamp: new Date(Date.now() - 25000).toLocaleString(), component: 'BACKUP_CRON', level: 'SUCCESS', msg: 'Nightly incremental backup database snapshot committed successfully to cloud-run store.' },
              { timestamp: new Date(Date.now() - 45000).toLocaleString(), component: 'STOCK_MONITOR', level: 'WARNING', msg: 'Low stock warning threshold breached at location Downtown.' },
              { timestamp: new Date(Date.now() - 65000).toLocaleString(), component: 'LEDGER_ENGINE', level: 'INFO', msg: 'Real-time COGS matching recalculations executed for 15 related menu recipe nodes.' },
              { timestamp: new Date(Date.now() - 110000).toLocaleString(), component: 'OAUTH_ROUTER', level: 'SUCCESS', msg: 'SAML enterprise Single Sign-On handshake completed.' }
            ].map((log, idx) => {
              let clr = 'text-gray-400';
              if (log.level === 'SUCCESS') clr = 'text-emerald-400 font-semibold';
              if (log.level === 'WARNING') clr = 'text-yellow-400 font-semibold';
              return (
                <div key={idx} className="border-b border-gray-900 pb-2.5 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-650">[{log.timestamp}]</span>
                    <span className="text-indigo-400 font-bold">{log.component}</span>
                    <span className={clr}>{log.level}</span>
                  </div>
                  <p className="text-gray-250 leading-relaxed pl-4">{log.msg}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
