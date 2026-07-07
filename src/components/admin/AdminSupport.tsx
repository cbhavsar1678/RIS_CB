/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Settings, Server, RefreshCw, Terminal, CheckCircle, Database } from 'lucide-react';

interface AdminSupportProps {
  onResetDatabaseState: () => void;
}

export const AdminSupport: React.FC<AdminSupportProps> = ({ onResetDatabaseState }) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings');

  // Parameters overrides state
  const [taxRate, setTaxRate] = useState('8.25');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [lowStockWarning, setLowStockWarning] = useState('5');
  const [posApiEndpoint, setPosApiEndpoint] = useState('https://api.pos-ingest.local/v1/sync');

  // Trigger state reset action
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

  // Realistic microservices sync log array
  const MICROSERVICE_DAEMON_LOGS = [
    { timestamp: new Date(Date.now() - 5000).toLocaleString(), component: 'POS_INGEST_DAEMON', level: 'INFO', msg: 'Sales log synchronization loop active. Waiting on next polling sequence...' },
    { timestamp: new Date(Date.now() - 25000).toLocaleString(), component: 'BACKUP_CRON', level: 'SUCCESS', msg: 'Nightly incremental backup database snapshot committed successfully to cloud-run store.' },
    { timestamp: new Date(Date.now() - 45000).toLocaleString(), component: 'STOCK_MONITOR', level: 'WARNING', msg: 'Low stock warning threshold breached for SKU MSG-RIBEYE at location Downtown.' },
    { timestamp: new Date(Date.now() - 65000).toLocaleString(), component: 'LEDGER_ENGINE', level: 'INFO', msg: 'Real-time COGS matching recalculations executed for 15 related menu recipe nodes.' },
    { timestamp: new Date(Date.now() - 110000).toLocaleString(), component: 'OAUTH_ROUTER', level: 'SUCCESS', msg: 'SAML enterprise Single Sign-On handshake completed for sarah.j@restaurant.local' }
  ];

  return (
    <div className="space-y-6" id="admin-support-panel">
      {/* Tab bar selection */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <button
          id="btn-subtab-support-settings"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-50 dark:border-gray-850 hover:bg-gray-50'
          }`}
        >
          <Settings size={14} className="inline mr-1" /> General Settings & Variables
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

      {/* GENERAL CONFIGURATION SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings form (SPAN 7) */}
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

          {/* Database maintenance (SPAN 5) */}
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
            {MICROSERVICE_DAEMON_LOGS.map((log, idx) => {
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
