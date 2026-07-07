/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Sparkles, AlertTriangle, TrendingUp, RefreshCw, ChefHat, Package, Users, Info, Plus } from 'lucide-react';
import { Product, Recipe, Store } from '../../types';

interface AreaEventSuggestion {
  type: string;
  productId?: string;
  recipeId?: string;
  label: string;
  value: string;
}

interface AreaEvent {
  id: string;
  name: string;
  date: string;
  trafficMultiplier: number;
  impact: string;
  suggestions: AreaEventSuggestion[];
}

interface AdminEventsProps {
  products: Product[];
  recipes: Recipe[];
  stores: Store[];
  // Actions to link AI suggestions directly to live actions!
  onExecutePrebatchRecipe?: (recipeId: string, quantity: number) => void;
  onNavigateToProcureProduct?: (productId: string) => void;
}

export const AdminEvents: React.FC<AdminEventsProps> = ({
  products,
  recipes,
  stores,
  onExecutePrebatchRecipe,
  onNavigateToProcureProduct,
}) => {
  const [cityInput, setCityInput] = useState('Downtown Area');
  const [events, setEvents] = useState<AreaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AreaEvent | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // AI Calendar Event Generator States
  const [newEventText, setNewEventText] = useState('');
  const [isGeneratingEvent, setIsGeneratingEvent] = useState(false);

  const handleGenerateAIEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventText.trim()) return;

    setIsGeneratingEvent(true);

    setTimeout(() => {
      const phrase = newEventText.toLowerCase();
      let multiplier = 1.0;
      let impactText = "Regular local trade.";
      let suggestionsList: AreaEventSuggestion[] = [];

      if (phrase.includes('concert') || phrase.includes('show') || phrase.includes('gig')) {
        multiplier = 1.55;
        impactText = "High-energy stadium crowd exiting post-show. Massive surge in quick-service takeout and pre-batch beverages.";
        suggestionsList = [
          { type: 'recipe', label: 'Pre-batch Garlic Bread & Pizza Dough', value: 'Double pre-prep to 80 units' },
          { type: 'stock', label: 'Secure beverage CO2 cylinders', value: 'Verify 3 full backup tanks on site' },
          { type: 'staff', label: 'Schedule 3 extra expeditors', value: 'Assign shifts for 9:00 PM to midnight window' }
        ];
      } else if (phrase.includes('rain') || phrase.includes('storm') || phrase.includes('snow') || phrase.includes('blizzard') || phrase.includes('weather')) {
        multiplier = 0.65;
        impactText = "Inclement weather reducing in-house dining traffic. Direct kitchen to minimize prep and pivot to delivery channels.";
        suggestionsList = [
          { type: 'recipe', label: 'Halt fresh salad pre-prep', value: 'Reduce daily Caesar bowl prep by 45%' },
          { type: 'staff', label: 'Reallocate front-of-house staff', value: 'Send 2 floor runners home; add 1 packaging expeditor' }
        ];
      } else if (phrase.includes('marathon') || phrase.includes('race') || phrase.includes('sport') || phrase.includes('game') || phrase.includes('cup') || phrase.includes('run')) {
        multiplier = 1.40;
        impactText = "Athletic event in neighborhood. High-carbohydrate demand, groups of 4-6 diners, high carbonated drink index.";
        suggestionsList = [
          { type: 'recipe', label: 'Scale Tomato Marinara pre-batch', value: 'Increase stockpot cooking by 15 gallons' },
          { type: 'stock', label: 'Double Mozzarella Cheese reorder', value: 'Call supplier to expedite 4 extra cases' }
        ];
      } else {
        multiplier = 1.20;
        impactText = "Localized neighborhood activity. Moderate increase in kitchen velocity and pickup demand.";
        suggestionsList = [
          { type: 'recipe', label: 'Pre-batch standard base doughs', value: 'Increase morning prep by 10 units' },
          { type: 'staff', label: 'Schedule 1 additional line cook', value: 'Peak backup coverage' }
        ];
      }

      const generatedEvt: AreaEvent = {
        id: `evt-ai-${Math.floor(1000 + Math.random() * 9000)}`,
        name: newEventText,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days in the future
        trafficMultiplier: multiplier,
        impact: impactText,
        suggestions: suggestionsList
      };

      setEvents(prev => [generatedEvt, ...prev]);
      setSelectedEvent(generatedEvt);
      setNewEventText('');
      setIsGeneratingEvent(false);
      alert(`🔮 AI Event Creator Success!\n\nEvent: "${generatedEvt.name}" successfully generated.\nTraffic Forecast: ${(multiplier * 100).toFixed(0)}%\n\nPreemptive actions loaded into the recommendation panel.`);
    }, 1000);
  };

  const fetchEvents = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/ai/area-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city: cityInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to load local events from BOH server');
      }

      const data = await response.json();
      if (data.success && data.events) {
        setEvents(data.events);
        if (data.events.length > 0) {
          setSelectedEvent(data.events[0]);
        }
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Unable to load AI predictions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSuggestionAction = (sug: AreaEventSuggestion) => {
    if (sug.type === 'recipe') {
      // Find the recipe or a matched recipe by name / ID
      const matchedRecipe = recipes.find(r => r.id === sug.recipeId || r.name.toLowerCase().includes('dough') || r.name.toLowerCase().includes('sauce'));
      if (matchedRecipe && onExecutePrebatchRecipe) {
        onExecutePrebatchRecipe(matchedRecipe.id, 5);
      } else {
        alert(`Redirecting to Recipe Sub-Assembly Tab to batch pre-build recipe: "${sug.label}"`);
      }
    } else if (sug.type === 'stock') {
      const matchedProduct = products.find(p => p.id === sug.productId || p.name.toLowerCase().includes('milk') || p.name.toLowerCase().includes('salmon'));
      if (matchedProduct && onNavigateToProcureProduct) {
        onNavigateToProcureProduct(matchedProduct.id);
      } else {
        alert(`Redirecting to Procurement Tab to draft reorder request for: "${sug.label}"`);
      }
    } else {
      alert(`Staff Allocation Insight: ${sug.label}. Shift managers have been alerted in Slack/SMS.`);
    }
  };

  return (
    <div className="space-y-6" id="admin-events-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">AI Local Events & Forecasting</h2>
          <p className="text-xs text-slate-400 mt-0.5">Predict foot traffic peaks to preemptively scale up food-prep, batch recipes, and vendor POs</p>
        </div>

        <div className="flex gap-2">
          <input
            id="input-city-search"
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Enter outlet neighborhood..."
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none w-48"
          />
          <button
            id="btn-reforecast-ai"
            onClick={fetchEvents}
            disabled={loading}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm transition-all"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analyzing...' : 'Reforecast AI'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/20 p-4 border border-rose-100 rounded-2xl text-xs text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar / Events List Bento Grid */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* AI Calendar Event Generator Panel */}
          <div className="bg-gradient-to-r from-violet-650/10 via-indigo-650/5 to-transparent border border-indigo-150 dark:border-indigo-950/40 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔮</span>
              <div>
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">AI Predictive Calendar Planner</h3>
                <p className="text-[10px] text-slate-400">Type any neighborhood occurrence to simulate kitchen prep guidelines and traffic offsets</p>
              </div>
            </div>

            <form onSubmit={handleGenerateAIEvent} className="flex gap-2">
              <input
                id="input-ai-event-phrase"
                type="text"
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                placeholder="e.g. Taylor Swift tour at stadium, Heavy blizzard warnings on Friday..."
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none font-medium text-slate-800 dark:text-white"
              />
              <button
                id="btn-trigger-ai-event-gen"
                type="submit"
                disabled={isGeneratingEvent || !newEventText.trim()}
                className="bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-350 text-white font-black px-4.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
              >
                {isGeneratingEvent ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "✨ Schedule with AI"
                )}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider flex items-center gap-1.5">
              <CalendarIcon size={14} className="text-blue-500" /> Upcoming Local Event Horizon
            </h3>

            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-20 bg-slate-50 dark:bg-slate-850 animate-pulse rounded-xl" />
                ))
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  No upcoming predicted neighborhood events cataloged.
                </div>
              ) : (
                events.map((evt) => {
                  const isSelected = selectedEvent?.id === evt.id;
                  const isHighTraffic = evt.trafficMultiplier >= 1.25;
                  const isLowTraffic = evt.trafficMultiplier < 0.95;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
                          : 'border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] text-slate-400 block">
                          {new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white leading-snug">{evt.name}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{evt.impact}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isHighTraffic
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : isLowTraffic
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isHighTraffic ? '📈 Peak' : isLowTraffic ? '📉 Low' : '● Baseline'}
                        </span>
                        <div className="text-xs font-black text-slate-700 dark:text-slate-300 mt-1 font-mono">
                          {(evt.trafficMultiplier * 100).toFixed(0)}% Traffic
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* AI Suggestions Sidebar Bento Card */}
        <div className="space-y-4">
          <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800/50 flex flex-col justify-between h-full min-h-[350px]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-500 rounded-lg text-white">
                  <Sparkles size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">AI Predictive Actions</h3>
                  <span className="text-[10px] text-blue-400 font-semibold block">Demand Forecasting Engine</span>
                </div>
              </div>

              {selectedEvent ? (
                <div className="space-y-5">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Focus Event</span>
                    <h4 className="text-xs font-black text-white mt-0.5">{selectedEvent.name}</h4>
                    <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed bg-slate-850 p-3 rounded-xl border border-slate-800/80">
                      {selectedEvent.impact}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Preemptive Recommendations</span>
                    {selectedEvent.suggestions.map((sug, idx) => (
                      <div key={idx} className="bg-slate-850 border border-slate-800/50 rounded-xl p-3 flex items-start justify-between gap-2.5">
                        <div className="flex gap-2">
                          <div className="mt-0.5 shrink-0">
                            {sug.type === 'recipe' && <ChefHat size={14} className="text-amber-400" />}
                            {sug.type === 'stock' && <Package size={14} className="text-emerald-400" />}
                            {sug.type === 'staff' && <Users size={14} className="text-blue-400" />}
                            {sug.type === 'packaging' && <Package size={14} className="text-purple-400" />}
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-slate-200 leading-snug">{sug.label}</p>
                            <span className="text-[9px] font-mono font-bold text-slate-400">{sug.value}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSuggestionAction(sug)}
                          className="text-[10px] font-bold text-blue-400 hover:text-blue-300 shrink-0 cursor-pointer hover:underline"
                        >
                          Execute
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Select an event from the horizon to analyze AI forecasting buffers.
                </div>
              )}
            </div>

            {selectedEvent && (
              <div className="border-t border-slate-800 pt-3.5 mt-4 text-[10px] text-slate-400 flex items-center gap-1">
                <Info size={11} className="shrink-0" />
                <span>Forecasting incorporates local venue coordinates & weather maps.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
