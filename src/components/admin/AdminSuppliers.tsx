/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Truck, Plus, Mail, MessageSquare, Trash2, Edit3, CheckCircle, Search, ShieldAlert, Check } from 'lucide-react';
import { Supplier, Product } from '../../types';

interface AdminSuppliersProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  products: Product[];
}

export const AdminSuppliers: React.FC<AdminSuppliersProps> = ({
  suppliers,
  setSuppliers,
  products,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // WhatsApp States
  const [activeWASupplier, setActiveWASupplier] = useState<Supplier | null>(null);
  const [waMessageText, setWaMessageText] = useState('');
  const [waHistory, setWaHistory] = useState<{ sender: 'user' | 'supplier'; text: string; time: string }[]>([]);
  const [isWaTyping, setIsWaTyping] = useState(false);

  const handleOpenWASimulator = (sup: Supplier) => {
    setActiveWASupplier(sup);
    setWaHistory([
      {
        sender: 'supplier',
        text: `Hey there! This is ${sup.contactName} from ${sup.name}. How are kitchen operations going today? Let me know if you need to place a restocking order or check transit dispatch times! 🚛`,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendWAMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waMessageText.trim() || !activeWASupplier) return;

    const userMsg = waMessageText.trim();
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to history
    const updatedHistory = [
      ...waHistory,
      { sender: 'user' as const, text: userMsg, time: timeStr }
    ];
    setWaHistory(updatedHistory);
    setWaMessageText('');
    setIsWaTyping(true);

    try {
      const response = await fetch('/api/ai/supplier-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: activeWASupplier.name,
          contactName: activeWASupplier.contactName,
          messageHistory: updatedHistory,
          newMessage: userMsg
        })
      });

      if (!response.ok) throw new Error('Could not contact simulated chat gateway');
      const data = await response.json();
      
      setWaHistory(prev => [
        ...prev,
        {
          sender: 'supplier' as const,
          text: data.reply || 'Sorry, let me double check that and get back to you! 👍',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setWaHistory(prev => [
        ...prev,
        {
          sender: 'supplier' as const,
          text: `[SYSTEM AUTO-REPLY] Sorry, my cellular signal in the logistics dock is weak right now, but I received your message: "${userMsg}". I'll confirm soon!`,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsWaTyping(false);
    }
  };

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('2');
  const [minOrderValue, setMinOrderValue] = useState('150.00');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [isActive, setIsActive] = useState(true);

  // Filter list
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditClick = (sup: Supplier) => {
    setEditingSupplierId(sup.id);
    setName(sup.name);
    setCode(sup.code);
    setContactName(sup.contactName);
    setEmail(sup.email);
    setPhone(sup.phone);
    setLeadTimeDays(sup.leadTimeDays.toString());
    setMinOrderValue(sup.minOrderValue.toString());
    setPaymentTerms(sup.paymentTerms);
    setIsActive(sup.isActive);
    setShowAddForm(true);
  };

  const handleDeleteClick = (id: string) => {
    // Check if supplier has any active products
    const associatedProds = products.filter(p => p.supplierId === id && !p.isArchived);
    if (associatedProds.length > 0) {
      alert(`Cannot delete: This supplier has ${associatedProds.length} active products in the Catalog. Please reassign or archive those products first.`);
      return;
    }

    if (confirm('Are you sure you want to permanently remove this supplier?')) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      alert('Supplier removed successfully!');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSupplierId) {
      // Update supplier
      setSuppliers(prev =>
        prev.map(s =>
          s.id === editingSupplierId
            ? {
                ...s,
                name,
                code: code || `SUP-${name.toUpperCase().slice(0,4)}`,
                contactName,
                email,
                phone,
                leadTimeDays: parseInt(leadTimeDays) || 2,
                minOrderValue: parseFloat(minOrderValue) || 0,
                paymentTerms,
                isActive,
              }
            : s
        )
      );
      setEditingSupplierId(null);
      alert('Supplier updated successfully!');
    } else {
      // Add new supplier
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        name,
        code: code || `SUP-${name.toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-3)}`,
        contactName,
        email,
        phone,
        leadTimeDays: parseInt(leadTimeDays) || 2,
        minOrderValue: parseFloat(minOrderValue) || 150.00,
        paymentTerms,
        isActive: true,
      };
      setSuppliers(prev => [...prev, newSup]);
      alert('New Supplier successfully onboarded!');
    }

    // Reset Form
    setName('');
    setCode('');
    setContactName('');
    setEmail('');
    setPhone('');
    setLeadTimeDays('2');
    setMinOrderValue('150.00');
    setPaymentTerms('Net 30');
    setIsActive(true);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6" id="admin-suppliers-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Supplier Contacts & Directories</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage contracted food vendors, lead times, and dispatch integrations</p>
        </div>

        <button
          id="btn-supplier-toggle-add"
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (showAddForm) setEditingSupplierId(null);
          }}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm transition-all"
        >
          {showAddForm ? 'View Supplier Directory' : 'Onboard New Supplier'}
        </button>
      </div>

      {showAddForm ? (
        <form onSubmit={handleFormSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
          <h3 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            {editingSupplierId ? 'Update Partner Supplier Profile' : 'Partner Supplier Onboarding'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Supplier/Company Name</label>
              <input
                id="input-supplier-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. US Foods Inc."
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Contract / Internal Code</label>
              <input
                id="input-supplier-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SUP-USFOODS"
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Primary Account Manager Name</label>
              <input
                id="input-supplier-contact"
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Michael Scott"
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Direct Order Email</label>
              <input
                id="input-supplier-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@usfoods.com"
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Order Dispatch Phone / WhatsApp (Intl format)</label>
              <input
                id="input-supplier-phone"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +18005550192"
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Contract Lead Time (Days)</label>
              <input
                id="input-supplier-lead"
                type="number"
                required
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Min Order Requirement ($)</label>
              <input
                id="input-supplier-min"
                type="number"
                required
                min="0"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Payment Credit Terms</label>
              <select
                id="select-supplier-terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none font-medium"
              >
                <option value="Net 15">Net 15 (Credit check)</option>
                <option value="Net 30">Net 30 (Industry Std)</option>
                <option value="Net 45">Net 45 (Extended)</option>
                <option value="Net 60">Net 60 (Enterprise)</option>
                <option value="COD">COD (Cash on Delivery)</option>
              </select>
            </div>
          </div>

          {editingSupplierId && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="checkbox-supplier-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-blue-500"
              />
              <label htmlFor="checkbox-supplier-active" className="text-xs text-slate-500 font-bold">This supplier partner is Active</label>
            </div>
          )}

          <div className="flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setEditingSupplierId(null); }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Commit Supplier Profile
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              id="search-suppliers-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by vendor, contact name..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Supplier Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredSuppliers.map((sup) => {
              const activeProds = products.filter(p => p.supplierId === sup.id && !p.isArchived);
              return (
                <div
                  key={sup.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-800 dark:text-white leading-tight">{sup.name}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            sup.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-600'
                          }`}>
                            {sup.isActive ? 'Active Contract' : 'Paused'}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 mt-1 block">{sup.code}</span>
                      </div>
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-850 rounded-xl flex items-center justify-center text-slate-500 text-lg border border-slate-100 dark:border-slate-800">
                        🤝
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 my-4 bg-slate-50 dark:bg-slate-850/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Contact Person</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{sup.contactName}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Associated SKUs</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{activeProds.length} active items</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Lead Time</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{sup.leadTimeDays} working days</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Payment Terms</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{sup.paymentTerms}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-400" />
                        <span>{sup.email}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-slate-400" />
                          <span>{sup.phone}</span>
                        </div>
                        <button
                          id={`btn-wa-sup-${sup.id}`}
                          onClick={() => handleOpenWASimulator(sup)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-sm shadow-emerald-500/10"
                        >
                          💬 WhatsApp Secure Chat
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800 mt-4 pt-3">
                    <button
                      id={`btn-edit-sup-${sup.id}`}
                      onClick={() => handleEditClick(sup)}
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg cursor-pointer transition-colors"
                      title="Edit Supplier Profile"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      id={`btn-delete-sup-${sup.id}`}
                      onClick={() => handleDeleteClick(sup.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors"
                      title="Remove Supplier"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredSuppliers.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-400 bg-white dark:bg-slate-900 border rounded-2xl border-slate-150">
                No supplier partners match the search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Supplier Hub Overlay Modal */}
      {activeWASupplier && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-extrabold text-base border border-white/20">
                  💬
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                    {activeWASupplier.name} WhatsApp Hub
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
                  </h3>
                  <p className="text-[10px] text-emerald-100 mt-0.5">Secure B2B Dispatch Channel • Contact: *{activeWASupplier.contactName}*</p>
                </div>
              </div>

              <button
                onClick={() => setActiveWASupplier(null)}
                className="text-white hover:bg-white/15 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Portal
              </button>
            </div>

            {/* Quick Action bar: Native click-to-chat */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 px-5 py-3 border-b border-emerald-100/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">External WhatsApp Action:</span>
                <span className="text-[10px] text-slate-400">Launch real WhatsApp Web pre-populated order replenishment draft</span>
              </div>
              <a
                href={`https://wa.me/${activeWASupplier.phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`*RESTOBISTRO PO REPLENISHMENT REQUEST*\nHello ${activeWASupplier.contactName},\nWe would like to coordinate stock availability for premium goods under contract. Please let us know if you have dispatch trucks loading today! Thanks.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-center text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                🚀 Open WhatsApp Web Direct
              </a>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950/30">
              
              <div className="text-center">
                <span className="bg-slate-200/60 dark:bg-slate-800 text-slate-500 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  End-to-End Encrypted ERP Tunnel
                </span>
              </div>

              {waHistory.map((msg, idx) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl p-3.5 text-xs shadow-sm ${
                      isUser 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-900 border text-slate-800 dark:text-slate-200 rounded-tl-none'
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 dark:text-emerald-500 block mb-1">
                        {isUser ? 'ERP Admin' : activeWASupplier.contactName}
                      </span>
                      <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                      <span className={`text-[9px] text-right block mt-1 ${isUser ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isWaTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 border text-slate-500 text-xs rounded-2xl p-3 shadow-sm flex items-center gap-1.5 font-bold">
                    <span className="animate-bounce font-black">.</span>
                    <span className="animate-bounce delay-100 font-black">.</span>
                    <span className="animate-bounce delay-200 font-black">.</span>
                    <span>{activeWASupplier.contactName} is drafting response</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendWAMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3 items-center shrink-0">
              <input
                type="text"
                value={waMessageText}
                onChange={(e) => setWaMessageText(e.target.value)}
                placeholder={`Draft WhatsApp text message to ${activeWASupplier.contactName}...`}
                className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500 font-semibold"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md cursor-pointer transition-all shrink-0"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
