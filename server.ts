/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Shared helper to lazy-initialize GoogleGenAI
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. AI Invoice Scanner API
app.post('/api/ai/scan-invoice', async (req, res) => {
  try {
    const { invoiceText, imageBase64, mimeType } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      console.log('Using simulated local AI parser (No GEMINI_API_KEY set)');
      // Return highly smart mocked parsed results based on the provided invoice text or defaults
      const textToScan = (invoiceText || '').toLowerCase();
      let matchedItems = [];

      if (textToScan.includes('beef') || textToScan.includes('meat') || textToScan.includes('steak')) {
        matchedItems.push({ name: 'Wagyu Beef Ribeye', sku: 'SKU-WAGYU-RIB', quantity: 5, unitCost: 140.00, packageUnit: 'Case', totalCost: 700.00 });
      }
      if (textToScan.includes('milk') || textToScan.includes('dairy')) {
        matchedItems.push({ name: 'Whole Milk (Organic)', sku: 'SKU-MILK-ORG', quantity: 20, unitCost: 3.50, packageUnit: 'Bottle', totalCost: 70.00 });
      }
      if (textToScan.includes('dough') || textToScan.includes('flour') || textToScan.includes('pizza')) {
        matchedItems.push({ name: 'Pizza Dough (Pre-batch)', sku: 'SKU-DOUGH-PIZ', quantity: 15, unitCost: 1.20, packageUnit: 'Piece', totalCost: 18.00 });
      }
      if (textToScan.includes('salmon') || textToScan.includes('fish')) {
        matchedItems.push({ name: 'Atlantic Salmon Fillet', sku: 'SKU-SALM-ATL', quantity: 8, unitCost: 22.00, packageUnit: 'Kg', totalCost: 176.00 });
      }

      // Default high-quality simulated parse if nothing matches or input is short
      if (matchedItems.length === 0) {
        matchedItems = [
          { name: 'Wagyu Beef Ribeye', sku: 'SKU-WAGYU-RIB', quantity: 10, unitCost: 135.00, packageUnit: 'Case', totalCost: 1350.00 },
          { name: 'Whole Milk (Organic)', sku: 'SKU-MILK-ORG', quantity: 50, unitCost: 3.20, packageUnit: 'Bottle', totalCost: 160.00 },
          { name: 'Atlantic Salmon Fillet', sku: 'SKU-SALM-ATL', quantity: 12, unitCost: 24.50, packageUnit: 'Kg', totalCost: 294.00 }
        ];
      }

      return res.json({
        success: true,
        source: 'Mock Local AI',
        vendor: 'US Foods & Quality Proteins Co.',
        invoiceNumber: 'INV-2026-9042',
        date: new Date().toISOString().split('T')[0],
        items: matchedItems,
        totalAmount: matchedItems.reduce((acc, curr) => acc + curr.totalCost, 0),
        tax: 24.50,
        notes: 'Simulated parser extracted food item logs successfully.'
      });
    }

    // Real Gemini call
    let response;
    const prompt = `You are an expert restaurant back-of-house auditor. Parse this invoice (could be raw text description or an image of an invoice receipt). 
    Extract the following fields accurately:
    1. Vendor/Supplier Name
    2. Invoice Number/Reference
    3. Invoice Date
    4. List of Items. For each item, extract:
       - name (clean item title, matching typical restaurant ingredients)
       - quantity (numeric quantity of packages/units)
       - unitCost (cost per package/unit)
       - packageUnit (e.g. Case, Box, Bottle, Kg)
       - totalCost (numeric, quantity * unitCost)
    
    Format the response strictly as a single valid JSON object matching this schema:
    {
      "vendor": string,
      "invoiceNumber": string,
      "date": string,
      "totalAmount": number,
      "tax": number,
      "items": [
        { "name": string, "quantity": number, "unitCost": number, "packageUnit": string, "totalCost": number }
      ]
    }`;

    if (imageBase64 && mimeType) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });
    } else {
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Invoice content:\n${invoiceText}\n\n${prompt}`,
        config: {
          responseMimeType: 'application/json'
        }
      });
    }

    const dataText = response.text || '{}';
    const parsedData = JSON.parse(dataText.trim());

    return res.json({
      success: true,
      source: 'Gemini AI',
      ...parsedData
    });

  } catch (error: any) {
    console.error('Invoice scanning error:', error);
    res.status(500).json({ success: false, error: error.message || 'Error processing invoice with AI' });
  }
});

// 2. AI Area Calendar Events API
app.post('/api/ai/area-events', async (req, res) => {
  const { city = 'Downtown Area' } = req.body;
  const mockEvents = [
    {
      id: 'evt-1',
      name: 'Taylor Swift Weekend Eras Tour Concert',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
      trafficMultiplier: 1.45,
      impact: 'Extreme high-density pedestrian traffic near the central stadium. Dinner BOH shifts expect +45% diner counts.',
      suggestions: [
        { type: 'stock', productId: 'prod-milk', label: 'Restock Organic Whole Milk for morning lattes', value: '+30% stock' },
        { type: 'recipe', recipeId: 'rec-dough', label: 'Pre-batch extra Pizza Dough (Prep 2 extra bins)', value: '+40% volume' },
        { type: 'staff', label: 'Schedule 2 extra line cooks & double FOH runners for Friday/Saturday night shift', value: 'Double Shift' }
      ]
    },
    {
      id: 'evt-2',
      name: 'Summer Street Food & Craft Beer Festival',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
      trafficMultiplier: 1.30,
      impact: 'Outdoor festival crowd searching for craft beverages and portable small bites. High dinner takeout demand.',
      suggestions: [
        { type: 'stock', productId: 'prod-salmon', label: 'Increase Atlantic Salmon prep portions for festival goers', value: '+20% stock' },
        { type: 'recipe', recipeId: 'rec-sauce', label: 'Prepare extra batches of Marinara Sauce (20L)', value: '+25% volume' }
      ]
    },
    {
      id: 'evt-3',
      name: 'Severe Rainstorm & Cold Temperature Front',
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 days from now
      trafficMultiplier: 0.85,
      impact: 'Substantial dip in outdoor dining/foot traffic, but sharp increase in home delivery orders (+35%). Warm dishes and beverages spike.',
      suggestions: [
        { type: 'stock', productId: 'prod-beef', label: 'Maintain protein stock but prepare warmer stew items', value: 'High delivery' },
        { type: 'packaging', label: 'Secure additional delivery cardboard containers and heat bags', value: '+50% Packaging' }
      ]
    },
    {
      id: 'evt-4',
      name: 'Annual Downtown Pride Parade',
      date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 days from now
      trafficMultiplier: 1.60,
      impact: 'Parade runs right past the main avenue locations. Lunch and mid-afternoon rush will be exceptionally busy (+60%).',
      suggestions: [
        { type: 'stock', productId: 'prod-beverage', label: 'Max out refrigerated beverage stocking rails', value: '+60% stock' },
        { type: 'recipe', label: 'Prepare simple grab-and-go snack items for expedited lines', value: 'Fast Service' }
      ]
    }
  ];

  try {
    const ai = getGeminiClient();

    if (!ai) {
      console.log('Using simulated local AI Calendar (No GEMINI_API_KEY set)');
      return res.json({
        success: true,
        source: 'Mock Local AI',
        city,
        events: mockEvents
      });
    }

    // Real Gemini call
    const prompt = `You are a culinary planner and restaurant business analyst. Generate a list of 4 highly realistic upcoming events, festivals, climate changes, or concerts for a restaurant located in "${city}".
    Each event must contain actionable insights for a restaurant manager.
    Format your response strictly as a single JSON object matching this schema:
    {
      "city": string,
      "events": [
        {
          "id": string,
          "name": string,
          "date": string,
          "trafficMultiplier": number (e.g. 1.35 for +35% traffic),
          "impact": string (detailed impact description),
          "suggestions": [
            { "type": "stock" | "recipe" | "staff", "productId"?: string, "recipeId"?: string, "label": string, "value": string }
          ]
        }
      ]
    }`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const dataText = response.text || '{}';
      const parsedData = JSON.parse(dataText.trim());

      return res.json({
        success: true,
        source: 'Gemini AI',
        ...parsedData
      });
    } catch (apiError: any) {
      console.warn('Gemini API call or JSON parsing failed, falling back to mock events. Error:', apiError);
      return res.json({
        success: true,
        source: 'Mock Local AI (Gemini Unavailable)',
        city,
        events: mockEvents
      });
    }

  } catch (error: any) {
    console.error('Area events forecasting outer error:', error);
    return res.json({
      success: true,
      source: 'Mock Local AI (Fallback)',
      city,
      events: mockEvents
    });
  }
});

// 3. AI Supplier WhatsApp Chat Simulator
app.post('/api/ai/supplier-chat', async (req, res) => {
  try {
    const { supplierName, contactName, messageHistory, newMessage } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `You are simulating a WhatsApp business chat. You are ${contactName}, the account manager for "${supplierName}", a premium B2B restaurant supplier.
    Your style should be quick, professional but friendly, using WhatsApp formatting like *bold* for emphasis, and occasional emojis where natural. Keep responses reasonably concise (under 3-4 sentences), just like real WhatsApp text messages.
    If the manager is asking about stock, lead times, order updates, discounts, or spoilage claims, respond in character as a helpful supplier. If they ask for custom pricing, negotiate or provide a friendly rate!`;

    if (!ai) {
      console.log('Using simulated local AI Supplier response (No GEMINI_API_KEY set)');
      // Simulated response
      const lowercaseMsg = (newMessage || '').toLowerCase();
      let reply = `Hi! Thanks for reaching out. This is ${contactName} from ${supplierName}. Let me double check that for you! 📦`;
      if (lowercaseMsg.includes('price') || lowercaseMsg.includes('discount') || lowercaseMsg.includes('rate')) {
        reply = `Hey there! Since you guys are a valued partner, we can definitely do a *10% high-volume discount* on your next bulk order. Let me know if you want me to draft the PO! 🤝`;
      } else if (lowercaseMsg.includes('spoil') || lowercaseMsg.includes('damage') || lowercaseMsg.includes('credit')) {
        reply = `Oh no, I'm so sorry to hear about the quality issue! Please send me a quick photo of the items and I'll issue a *full credit note* on your invoice right away. Appreciate your patience! 📝`;
      } else if (lowercaseMsg.includes('delivery') || lowercaseMsg.includes('late') || lowercaseMsg.includes('when')) {
        reply = `Our dispatch team says your truck is currently in transit and should arrive in *approx 45 minutes*. Let me know if there are any issues with offloading! 🚚`;
      } else if (lowercaseMsg.includes('order') || lowercaseMsg.includes('buy')) {
        reply = `I would love to help you place that order! You can dispatch the PO directly from your RestoERP panel or let me know what quantities you need here. 🛒`;
      }
      return res.json({
        success: true,
        source: 'Mock Local AI',
        reply
      });
    }

    // Build contents with history
    const contents: any[] = [];
    if (messageHistory && Array.isArray(messageHistory)) {
      messageHistory.forEach((msg: any) => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: newMessage }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    return res.json({
      success: true,
      source: 'Gemini AI',
      reply: response.text || ''
    });

  } catch (error: any) {
    console.error('Supplier chat error:', error);
    res.status(500).json({ success: false, error: error.message || 'Error processing supplier chat simulation' });
  }
});

// 4. AI ERP Co-Pilot API
app.post('/api/ai/copilot', async (req, res) => {
  try {
    const { context, message, messageHistory } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `You are "RestoAI", the ultimate Back-of-House AI Co-Pilot integrated into RestoERP.
    You have direct, real-time read access to the restaurant's operational ledger. Here is the current BOH state:
    - Stores: ${JSON.stringify(context?.stores || [])}
    - Total Catalog Products: ${context?.productsCount || 0}
    - Low Stock / Critical Reorder Items: ${JSON.stringify(context?.lowStockItems || [])}
    - Total Current Asset Valuation: $${context?.totalAssetValue || 0}
    - Recent Spoilage & Wastage events: ${JSON.stringify(context?.recentWastage || [])}
    - Upcoming Regional Events & Staff Predictions: ${JSON.stringify(context?.upcomingEvents || [])}

    Provide extremely smart, highly contextual, brief and professional restaurant operator advice. Suggest actions (such as restocking certain items, prepping extra dough, adjusting staff schedules, or initiating transfers). Use clean markdown formatting with lists and bold text. Keep answers engaging, directly answering the user's question using the provided context.`;

    if (!ai) {
      console.log('Using simulated local AI co-pilot response (No GEMINI_API_KEY set)');
      const lowercaseMsg = (message || '').toLowerCase();
      let reply = `Hello! I'm your **RestoAI Co-Pilot**. I've scanned your ledger: you currently have **${context?.lowStockItems?.length || 2} items below par**. How can I assist you with kitchen operations today?`;
      
      if (lowercaseMsg.includes('stock') || lowercaseMsg.includes('reorder') || lowercaseMsg.includes('buy')) {
        reply = `Scanning inventory alerts... 🚨\n\nYou have several items nearing critical par levels:\n- **Wagyu Beef Ribeye**: Currently below target in Downtown Bistro. Suggest triggering a Purchase Order to *Meat Masters*.\n- **Whole Milk (Organic)**: Depleted due to morning peak. Suggest transferring from Westside Grill or ordering 15 cases.`;
      } else if (lowercaseMsg.includes('event') || lowercaseMsg.includes('calendar') || lowercaseMsg.includes('concert') || lowercaseMsg.includes('weather')) {
        reply = `Upcoming Regional Event Alert! 📅\n\nThere is a **Taylor Swift Eras Tour Concert** in 2 days. Peaking traffic multiplier is **1.45x**.\n\n*My Operations Plan:*\n1. Prep extra **Pizza Dough** (increase batch prep by 40%).\n2. Double-schedule FOH runners and kitchen line staff for Friday dinner.`;
      } else if (lowercaseMsg.includes('waste') || lowercaseMsg.includes('spoil') || lowercaseMsg.includes('loss')) {
        reply = `Wastage & Loss Audit Summary: 📉\n\n- **Top loss driver**: Spoilage of perishable greens (Lettuce) due to over-ordering in Westside Grill.\n- **Recommendation**: Implement *First-In, First-Out (FIFO)* storage routing and decrease lettuce reorder point by 15%.`;
      }
      return res.json({
        success: true,
        source: 'Mock Local AI',
        reply
      });
    }

    const contents: any[] = [];
    if (messageHistory && Array.isArray(messageHistory)) {
      messageHistory.forEach((msg: any) => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    return res.json({
      success: true,
      source: 'Gemini AI',
      reply: response.text || ''
    });

  } catch (error: any) {
    console.error('Co-pilot error:', error);
    res.status(500).json({ success: false, error: error.message || 'Error processing co-pilot prompt' });
  }
});

// Serve static assets in production or boot Vite dev server
async function bootServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Mount Vite dev server in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RestoERP] Server booted on http://0.0.0.0:${PORT} under NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  });
}

bootServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
});
