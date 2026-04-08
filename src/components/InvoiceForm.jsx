import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, ScanLine, Search, Sparkles, UserPlus, CreditCard, Banknote, Printer } from 'lucide-react';
import { addDays, format } from 'date-fns';

function InvoiceForm({ liveRates }) {
  const [customerInfo, setCustomerInfo] = useState({ id: '', name: '', phone: '', address: '' });
  const [customersList, setCustomersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [items, setItems] = useState([]);
  const [customerMetal, setCustomerMetal] = useState({ weight: 0, purity: 22, type: 'gold' });
  const [gstRate, setGstRate] = useState(3);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [applyGst, setApplyGst] = useState(true);
  const [payment, setPayment] = useState({ cashReceived: 0, cardReceived: 0 });
  const [creditTerms, setCreditTerms] = useState({ dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'), interestRate: 2 });
  const [totals, setTotals] = useState({ subtotal: 0, customerMetalValue: 0, gst: 0, total: 0, balance: 0 });
  const [saved, setSaved] = useState(false);

  const [qrInput, setQrInput] = useState('');
  const qrInputRef = useRef(null);

  useEffect(() => {
    const loadCustomers = async () => {
      if (window.api) {
        const data = await window.api.readFile('customers.json');
        if (data && Array.isArray(data)) {
          setCustomersList(data);
        }
      }
    };
    loadCustomers();
  }, []);

  const handleCustomerNameChange = (e) => {
    const name = e.target.value;
    setCustomerInfo({ ...customerInfo, name, id: '' }); // Clear ID when typing freely
    setShowDropdown(name.length > 0);
  };

  const selectCustomer = (cust) => {
    setCustomerInfo(cust);
    setShowDropdown(false);
  };

  const handleCustomerFieldChange = (e) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), type: 'gold', description: '', weight: 0, makingCharge: 0, purity: 22 }]);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleQrScan = (e) => {
    e.preventDefault();
    try {
      const scannedItem = JSON.parse(qrInput);
      if (scannedItem.type && scannedItem.weight !== undefined) {
        setItems([...items, {
          id: Date.now(),
          type: scannedItem.type,
          purity: scannedItem.purity || 22,
          description: scannedItem.description || 'Scanned Item',
          weight: Number(scannedItem.weight) || 0,
          makingCharge: Number(scannedItem.makingCharge) || 0
        }]);
      }
    } catch (err) {
      console.warn("Invalid QR data", err);
    }
    setQrInput('');
    if (qrInputRef.current) qrInputRef.current.focus();
  };

  useEffect(() => {
    let subtotal = 0;
    items.forEach(item => {
      const weight = parseFloat(item.weight) || 0;
      const makingCharge = parseFloat(item.makingCharge) || 0;

      let rate = 0;
      if (item.type === 'gold') {
        // gold rate is usually per 10g for 24k. We need to adjust based on purity.
        const baseRatePerGram = (liveRates.gold || 0) / 10;
        const purityMultiplier = item.purity === 24 ? 1 : item.purity === 22 ? 22/24 : item.purity === 18 ? 18/24 : 1;
        rate = baseRatePerGram * purityMultiplier;
      } else {
        // silver rate is usually per 1kg
        rate = (liveRates.silver || 0) / 1000;
      }

      const itemTotal = (weight * rate) + makingCharge;
      subtotal += itemTotal;
    });

    // Deduct Customer Provided Metal
    let customerMetalValue = 0;
    const cmWeight = parseFloat(customerMetal.weight) || 0;
    if (cmWeight > 0) {
      if (customerMetal.type === 'gold') {
        const baseRatePerGram = (liveRates.gold || 0) / 10;
        const purityMultiplier = customerMetal.purity === 24 ? 1 : customerMetal.purity === 22 ? 22/24 : customerMetal.purity === 18 ? 18/24 : 1;
        customerMetalValue = cmWeight * baseRatePerGram * purityMultiplier;
      } else {
        customerMetalValue = cmWeight * ((liveRates.silver || 0) / 1000);
      }
    }

    const taxableAmount = Math.max(0, subtotal - customerMetalValue);
    const gst = applyGst ? taxableAmount * (gstRate / 100) : 0;
    const total = taxableAmount + gst;

    const cash = Number(payment.cashReceived) || 0;
    const card = Number(payment.cardReceived) || 0;
    const balance = total - (cash + card);

    setTotals({
      subtotal: Math.round(subtotal * 100) / 100,
      customerMetalValue: Math.round(customerMetalValue * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: Math.round(total * 100) / 100,
      balance: Math.round(balance * 100) / 100
    });
  }, [items, applyGst, liveRates, payment, customerMetal, gstRate]);

  const handleAskAI = async () => {
    setIsAiLoading(true);
    try {
      if (liveRates.apiKey) {
        // Prepare cart data for AI
        const prompt = `I have a jewelry cart with the following items: ${JSON.stringify(items.map(i => i.description))}. We are also taking customer old metal of weight ${customerMetal.weight}g. Should the GST be 3% (standard sales) or 5% (job work)? Return ONLY the number 3 or 5 based on standard Indian tax rules.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${liveRates.apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const answer = data.choices[0].message.content.trim();
          if (answer.includes('5')) setGstRate(5);
          else if (answer.includes('3')) setGstRate(3);
        } else {
          // fallback heuristics if api fails
          setGstRate(customerMetal.weight > 0 ? 5 : 3);
        }
      } else {
        // Fallback rule if no API key: Job work (taking old metal) often attracts 5% GST, pure sales 3%
        setGstRate(customerMetal.weight > 0 ? 5 : 3);
      }
    } catch (e) {
      console.warn("AI API Error", e);
      setGstRate(customerMetal.weight > 0 ? 5 : 3);
    }
    setIsAiLoading(false);
  };

  const handleSaveInvoice = async () => {
    if (window.api) {
      // Handle customer creation/update
      let finalCustomerInfo = { ...customerInfo };
      let allCustomers = await window.api.readFile('customers.json') || [];

      if (!finalCustomerInfo.id && finalCustomerInfo.name.trim() !== '') {
        // Create new customer
        finalCustomerInfo.id = `cust_${Date.now()}`;
        allCustomers.push(finalCustomerInfo);
        await window.api.writeFile('customers.json', allCustomers);
        setCustomersList(allCustomers);
      } else if (finalCustomerInfo.id) {
        // Update existing customer info if changed
        allCustomers = allCustomers.map(c => c.id === finalCustomerInfo.id ? finalCustomerInfo : c);
        await window.api.writeFile('customers.json', allCustomers);
        setCustomersList(allCustomers);
      }

      const invoiceData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        customerInfo: finalCustomerInfo,
        items,
        applyGst,
        totals,
        payment,
        ratesAtTime: liveRates
      };

      const existingData = await window.api.readFile('invoices.json') || [];
      existingData.push(invoiceData);
      const success = await window.api.writeFile('invoices.json', existingData);

      // Deduct from Inventory
      if (success) {
        try {
          const inventoryData = await window.api.readFile('inventory.json') || [];
          let inventoryUpdated = false;

          const newInventory = inventoryData.map(invItem => {
            // Find if this inventory item was sold (matching by name/description or ID if we had it)
            // For robust integration, we should ideally map by an explicit inventory ID.
            // Since `items` currently uses `description`, we'll try to match by name.
            const soldItem = items.find(i => i.description === invItem.name || (i.inventoryId && i.inventoryId === invItem.id));
            if (soldItem) {
              inventoryUpdated = true;
              return {
                ...invItem,
                quantity: Math.max(0, invItem.quantity - 1) // Assuming 1 qty per line item
              };
            }
            return invItem;
          });

          if (inventoryUpdated) {
            await window.api.writeFile('inventory.json', newInventory);
          }
        } catch (e) {
          console.error("Error updating inventory", e);
        }
      }

      // Update Ledger if there is a balance
      if (success && totals.balance > 0) {
        const ledgerData = await window.api.readFile('ledger.json') || [];
        ledgerData.push({
          id: Date.now().toString(),
          type: 'invoice',
          invoiceId: invoiceData.id,
          date: invoiceData.date,
          customerId: finalCustomerInfo.id,
          amountOwed: totals.balance,
          dueDate: creditTerms.dueDate,
          interestRate: Number(creditTerms.interestRate)
        });
        await window.api.writeFile('ledger.json', ledgerData);
      }

      // Update Cashbook for received payment
      if (success && ((Number(payment.cashReceived) || 0) + (Number(payment.cardReceived) || 0) > 0)) {
        const totalReceived = (Number(payment.cashReceived) || 0) + (Number(payment.cardReceived) || 0);
        const cashbookData = await window.api.readFile('cashbook.json') || [];
        cashbookData.push({
          id: `CB-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'income',
          category: 'Sales',
          amount: totalReceived,
          description: `Invoice Payment - ${finalCustomerInfo.name || 'Walk-in'}`
        });
        await window.api.writeFile('cashbook.json', cashbookData);
      }

      if (success) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          // Reset form
          setCustomerInfo({ id: '', name: '', phone: '', address: '' });
          setItems([]);
          setCustomerMetal({ weight: 0, purity: 22, type: 'gold' });
          setPayment({ cashReceived: 0, cardReceived: 0 });
          setCreditTerms({ dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'), interestRate: 2 });
          setApplyGst(true);
          setGstRate(3);
        }, 2000);
      }
    } else {
      console.warn("Electron API not available");
    }
  };

  const handleSendSms = async () => {
    if (!customerInfo.phone) {
      alert("Please enter a customer phone number.");
      return;
    }
    if (window.api && window.api.sendSms) {
      try {
        const credentials = await window.api.readFile('sms_settings.json');
        if (!credentials || !credentials.accountSid) {
          alert("SMS credentials not configured in Settings.");
          return;
        }

        const body = `Thank you for shopping with us, ${customerInfo.name}! Your invoice total is ₹${totals.total}. Balance Due: ₹${totals.balance}.`;

        const result = await window.api.sendSms({
          to: customerInfo.phone,
          body: body,
          credentials: credentials
        });

        if (result && result.success) {
          alert("SMS Sent Successfully!");
        } else {
          alert("Failed to send SMS.");
        }
      } catch (err) {
        console.error(err);
        alert("Error sending SMS.");
      }
    }
  };

  const [activePaymentMethod, setActivePaymentMethod] = useState('card');
  const [newItemParams, setNewItemParams] = useState({ type: 'gold', purity: 22, weight: '', makingCharge: '' });

  const handleManualPaymentToggle = (method) => {
    setActivePaymentMethod(method);
    if (method === 'card') {
      setPayment({ cashReceived: 0, cardReceived: totals.total });
    } else {
      setPayment({ cashReceived: totals.total, cardReceived: 0 });
    }
  };

  const handleAddNewItem = () => {
    setItems([...items, {
      id: Date.now(),
      type: newItemParams.type,
      description: `${newItemParams.purity}K ${newItemParams.type === 'gold' ? 'Gold' : 'Silver'} Item`,
      weight: parseFloat(newItemParams.weight) || 0,
      makingCharge: parseFloat(newItemParams.makingCharge) || 0,
      purity: newItemParams.purity
    }]);
    setNewItemParams({ type: 'gold', purity: 22, weight: '', makingCharge: '' });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">

      {/* Left Column - Main Invoice Content */}
      <div className="flex-1 space-y-6">

        {/* Itemized Invoice Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Itemized Invoice</h2>
              <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Transaction ID: #INV-{Math.floor(1000 + Math.random() * 9000)}</p>
            </div>

            <form onSubmit={handleQrScan} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <ScanLine className="text-gray-500 w-4 h-4 ml-1" />
              <input
                type="text"
                ref={qrInputRef}
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Scan Item..."
                className="bg-transparent border-none focus:ring-0 text-sm w-32 py-1 outline-none"
              />
              <button type="submit" className="hidden">Add</button>
            </form>
          </div>

          {/* Quick Add Row */}
          <div className="grid grid-cols-5 gap-3 mb-6 items-end">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Metal Type</label>
              <select
                value={newItemParams.type}
                onChange={(e) => setNewItemParams({ ...newItemParams, type: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-brand-brown outline-none"
              >
                <option value="gold">Yellow Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Purity</label>
              <select
                value={newItemParams.purity}
                onChange={(e) => setNewItemParams({ ...newItemParams, purity: parseInt(e.target.value) })}
                className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-brand-brown outline-none"
              >
                <option value={24}>999 (24K)</option>
                <option value={22}>916 (22K)</option>
                <option value={18}>750 (18K)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Weight (g)</label>
              <input
                type="number"
                placeholder="0.00"
                value={newItemParams.weight}
                onChange={(e) => setNewItemParams({ ...newItemParams, weight: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-brand-brown outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Making Chg</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newItemParams.makingCharge}
                  onChange={(e) => setNewItemParams({ ...newItemParams, makingCharge: e.target.value })}
                  className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-brand-brown outline-none"
                />
              </div>
              <button onClick={handleAddNewItem} className="bg-brand-dark hover:bg-gray-800 text-white rounded-lg p-3 flex-shrink-0 transition-colors h-[44px] flex items-center justify-center w-[44px]">
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Item List Header */}
          <div className="grid grid-cols-12 gap-4 border-b border-gray-100 pb-2 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-right">Net Wt</div>
            <div className="col-span-2 text-right">Rate/g</div>
            <div className="col-span-3 text-right">Amount</div>
          </div>

          {/* Item List */}
          <div className="space-y-3">
            {items.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No items added. Scan a QR code or add manually.
              </div>
            )}

            {items.map((item, index) => {
              const ratePerGram = item.type === 'gold'
                ? ((liveRates.gold || 0) / 10) * (item.purity === 24 ? 1 : item.purity === 22 ? 22/24 : item.purity === 18 ? 18/24 : 1)
                : ((liveRates.silver || 0) / 1000);
              const amount = (item.weight * ratePerGram) + item.makingCharge;

              return (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100 group relative">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                      <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=100&auto=format&fit=crop" alt="Jewelry" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{item.description}</div>
                      <div className="text-[11px] text-gray-500">Stock: #G-881 | {item.purity}K {item.type}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right font-medium text-sm text-gray-700">{item.weight.toFixed(3)} g</div>
                  <div className="col-span-2 text-right text-sm text-gray-600">₹{ratePerGram.toFixed(2)}</div>
                  <div className="col-span-3 text-right font-bold text-sm text-gray-800">₹{amount.toFixed(2)}</div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute -right-2 -top-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lower Row: Exchange Metal & AI */}
        <div className="grid grid-cols-2 gap-6">
          {/* Exchange Metal */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-brand-brown" />
              <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm">Exchange Metal</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Old Gold Wt (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={customerMetal.weight || ''}
                  onChange={(e) => setCustomerMetal({ ...customerMetal, type: 'gold', weight: parseFloat(e.target.value) })}
                  className="w-full p-3 bg-white border-none rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-brand-brown outline-none shadow-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Purity (%)</label>
                <input
                  type="number"
                  value={customerMetal.purity === 24 ? 100 : customerMetal.purity === 22 ? 91.6 : 75.0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    let p = 22;
                    if (val > 95) p = 24;
                    else if (val < 80) p = 18;
                    setCustomerMetal({ ...customerMetal, purity: p });
                  }}
                  className="w-full p-3 bg-white border-none rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-brand-brown outline-none shadow-sm"
                  placeholder="75.0"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-4 italic">
              Estimated value will be subtracted from Net Payable.
            </p>
          </div>

          {/* Sparkle AI */}
          <div className="bg-[#fcfaf7] rounded-xl p-5 border border-[#eae1ca] relative">
            <div className="absolute top-4 right-4 bg-[#e8debe] text-[#786422] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Live</div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-brand-brown" />
              <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm">Sparkle AI</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Based on current HSN codes and interstate rules, we recommend {customerMetal.weight > 0 ? '5%' : '3%'} GST + 1% Cess.
            </p>
            <button
              onClick={() => {
                setApplyGst(true);
                handleAskAI();
              }}
              disabled={isAiLoading}
              className="w-full py-2.5 bg-[#eae1ca] hover:bg-[#dfd3b3] text-[#786422] rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
            >
              {isAiLoading ? 'Analyzing...' : 'Apply Recommended Tax'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Customer & Summary */}
      <div className="w-full lg:w-80 space-y-6">

        {/* Customer Profile Card */}
        <div className="bg-[#262423] rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-xs font-bold text-[#bba76b] uppercase tracking-widest mb-4">Customer Profile</h3>

          <div className="relative mb-5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Search or Add New</label>
            <div className="flex">
              <div className="relative flex-1">
                <input
                  type="text"
                  name="name"
                  value={customerInfo.name}
                  onChange={handleCustomerNameChange}
                  onFocus={() => setShowDropdown(customerInfo.name.length > 0)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="Eleanor Whispering"
                  className="w-full p-3 bg-[#333130] border-none rounded-l-lg text-sm text-white focus:ring-1 focus:ring-[#bba76b] outline-none placeholder-gray-500"
                  autoComplete="off"
                />
              </div>
              <button className="bg-[#333130] text-gray-400 p-3 rounded-r-lg border-l border-[#403e3d] hover:text-white transition-colors">
                <UserPlus size={18} />
              </button>
            </div>

            {showDropdown && customersList.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[#333130] border border-[#403e3d] rounded-md shadow-xl max-h-48 overflow-auto">
                {customersList
                  .filter(c => c.name.toLowerCase().includes(customerInfo.name.toLowerCase()))
                  .map(cust => (
                    <div
                      key={cust.id}
                      className="p-3 hover:bg-[#403e3d] cursor-pointer border-b border-[#403e3d] last:border-none"
                      onClick={() => selectCustomer(cust)}
                    >
                      <div className="font-medium text-sm">{cust.name}</div>
                      <div className="text-xs text-gray-400">{cust.phone}</div>
                    </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                value={customerInfo.phone}
                onChange={handleCustomerFieldChange}
                placeholder="+44 7700..."
                className="w-full bg-transparent border-none p-0 text-sm text-gray-300 focus:ring-0 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Loyalty Tier</label>
              <div className="text-sm font-semibold text-[#d4af37]">Gold Elite</div>
            </div>
          </div>
        </div>

        {/* Summary & Billing Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Summary & Billing</h3>

          <div className="space-y-4 mb-6 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({items.length} Items)</span>
              <span className="font-semibold text-gray-800">₹{totals.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-2">
                GST ({gstRate}%)
                <input
                  type="checkbox"
                  checked={applyGst}
                  onChange={(e) => setApplyGst(e.target.checked)}
                  className="rounded text-brand-brown focus:ring-brand-brown border-gray-300 h-3 w-3"
                />
              </span>
              <span className="font-semibold text-gray-800">₹{totals.gst.toFixed(2)}</span>
            </div>

            {totals.customerMetalValue > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Old Metal Value</span>
                <span className="font-semibold text-red-600">-₹{totals.customerMetalValue.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-6 flex justify-between items-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Net Payable</span>
            <span className="text-2xl font-black text-gray-900 tracking-tight">₹{Math.max(0, totals.total - totals.customerMetalValue).toFixed(2)}</span>
          </div>

          <div className="mb-6">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleManualPaymentToggle('card')}
                className={`py-3 rounded-lg flex flex-col items-center justify-center gap-2 border-2 transition-colors ${activePaymentMethod === 'card' ? 'border-brand-brown text-brand-brown bg-[#fdfcf9]' : 'border-gray-100 text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
              >
                <CreditCard size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Card</span>
              </button>
              <button
                onClick={() => handleManualPaymentToggle('cash')}
                className={`py-3 rounded-lg flex flex-col items-center justify-center gap-2 border-2 transition-colors ${activePaymentMethod === 'cash' ? 'border-brand-brown text-brand-brown bg-[#fdfcf9]' : 'border-gray-100 text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
              >
                <Banknote size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Cash</span>
              </button>
            </div>

            {/* Hidden actual inputs managed by the UI state */}
            {activePaymentMethod === 'cash' ? (
              <div className="mt-3">
                <input
                  type="number"
                  placeholder="Cash Received Amount..."
                  value={payment.cashReceived || ''}
                  onChange={(e) => setPayment({...payment, cashReceived: parseFloat(e.target.value), cardReceived: 0})}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-brand-brown"
                />
              </div>
            ) : (
              <div className="mt-3">
                <input
                  type="number"
                  placeholder="Card/UPI Received Amount..."
                  value={payment.cardReceived || ''}
                  onChange={(e) => setPayment({...payment, cardReceived: parseFloat(e.target.value), cashReceived: 0})}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-brand-brown"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSaveInvoice}
            className="w-full py-4 bg-brand-brown hover:bg-brand-brown-dark text-white rounded-lg font-bold text-sm uppercase tracking-widest transition-colors shadow-md flex items-center justify-center gap-2"
          >
            {saved ? 'Saved Successfully!' : 'Complete Sale'}
          </button>

          <button
            onClick={handleSendSms}
            className="w-full mt-3 py-3 text-gray-500 hover:text-gray-800 font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={14} />
            Print Quotation & SMS
          </button>
        </div>
      </div>
    </div>
  );
}

export default InvoiceForm;
