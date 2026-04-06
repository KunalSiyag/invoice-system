import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, ScanLine, Search, Sparkles } from 'lucide-react';
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

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">New Invoice</h2>

        <form onSubmit={handleQrScan} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border">
          <ScanLine className="text-gray-500 w-5 h-5" />
          <input
            type="text"
            ref={qrInputRef}
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Scan QR or paste JSON..."
            className="bg-transparent border-none focus:ring-0 text-sm w-48"
          />
          <button type="submit" className="hidden">Add</button>
        </form>

        <div className="text-sm text-gray-500 text-right">
          <div>Current Gold: ₹{liveRates.gold}/10g</div>
          <div>Current Silver: ₹{liveRates.silver}/1kg</div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
          <div className="flex items-center">
            <input
              type="text"
              name="name"
              value={customerInfo.name}
              onChange={handleCustomerNameChange}
              onFocus={() => setShowDropdown(customerInfo.name.length > 0)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            <Search className="absolute right-3 text-gray-400 w-4 h-4" />
          </div>

          {showDropdown && customersList.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {customersList
                .filter(c => c.name.toLowerCase().includes(customerInfo.name.toLowerCase()))
                .map(cust => (
                  <div
                    key={cust.id}
                    className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-none"
                    onClick={() => selectCustomer(cust)}
                  >
                    <div className="font-medium text-sm">{cust.name}</div>
                    <div className="text-xs text-gray-500">{cust.phone}</div>
                  </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text"
            name="phone"
            value={customerInfo.phone}
            onChange={handleCustomerFieldChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            name="address"
            value={customerInfo.address}
            onChange={handleCustomerFieldChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Items */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Items</h3>
        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-12 gap-4 items-end mb-4 bg-gray-50 p-4 rounded">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={item.type}
                onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
            {item.type === 'gold' && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Purity</label>
                <select
                  value={item.purity}
                  onChange={(e) => handleItemChange(item.id, 'purity', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value={24}>24K</option>
                  <option value={22}>22K</option>
                  <option value={18}>18K</option>
                </select>
              </div>
            )}
            <div className={`col-span-${item.type === 'gold' ? '3' : '5'}`}>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder="Item name"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Weight (g)</label>
              <input
                type="number"
                value={item.weight || ''}
                onChange={(e) => handleItemChange(item.id, 'weight', parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Making Chg (₹)</label>
              <input
                type="number"
                value={item.makingCharge || ''}
                onChange={(e) => handleItemChange(item.id, 'makingCharge', parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="col-span-1 flex justify-center pb-1">
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-500 hover:text-red-700 p-1"
                disabled={items.length === 1}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-500 mb-4">No items added. Scan a QR code or add manually.</div>}
        <button
          onClick={addItem}
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <Plus size={16} className="mr-1" /> Add Manual Item
        </button>
      </div>

      {/* Customer Provided Metal */}
      <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <h3 className="text-sm font-semibold text-orange-800 mb-3">Customer Provided Metal (Exchange / Job Work)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-orange-800 mb-1">Type</label>
            <select
              value={customerMetal.type}
              onChange={(e) => setCustomerMetal({ ...customerMetal, type: e.target.value })}
              className="w-full p-2 border border-orange-300 rounded text-sm focus:ring-orange-500 bg-white"
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-orange-800 mb-1">Purity</label>
            <select
              value={customerMetal.purity}
              onChange={(e) => setCustomerMetal({ ...customerMetal, purity: parseInt(e.target.value) })}
              className="w-full p-2 border border-orange-300 rounded text-sm focus:ring-orange-500 bg-white"
              disabled={customerMetal.type === 'silver'}
            >
              <option value={24}>24K</option>
              <option value={22}>22K</option>
              <option value={18}>18K</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-orange-800 mb-1">Weight (g)</label>
            <input
              type="number"
              step="0.01"
              value={customerMetal.weight || ''}
              onChange={(e) => setCustomerMetal({ ...customerMetal, weight: parseFloat(e.target.value) })}
              className="w-full p-2 border border-orange-300 rounded text-sm focus:ring-orange-500 bg-white"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Payment & Totals Section */}
      <div className="border-t pt-6 grid grid-cols-2 gap-8">

        {/* Payment Entry */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash Received (₹)</label>
              <input
                type="number"
                value={payment.cashReceived || ''}
                onChange={(e) => setPayment({...payment, cashReceived: parseFloat(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card / UPI Received (₹)</label>
              <input
                type="number"
                value={payment.cardReceived || ''}
                onChange={(e) => setPayment({...payment, cardReceived: parseFloat(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Totals & Credit Terms */}
        <div className="space-y-3">
          {totals.balance > 0 && (
            <div className="bg-orange-50 p-3 rounded border border-orange-200 mb-4 space-y-2">
              <h4 className="text-sm font-semibold text-orange-800">Credit Terms</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-orange-800 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={creditTerms.dueDate}
                    onChange={(e) => setCreditTerms({...creditTerms, dueDate: e.target.value})}
                    className="w-full p-1 border border-orange-300 rounded text-sm focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-orange-800 mb-1">Interest Rate (%/mo)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={creditTerms.interestRate}
                    onChange={(e) => setCreditTerms({...creditTerms, interestRate: e.target.value})}
                    className="w-full p-1 border border-orange-300 rounded text-sm focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>₹{totals.subtotal.toFixed(2)}</span>
          </div>

          {totals.customerMetalValue > 0 && (
            <div className="flex justify-between text-orange-600 border-b pb-2">
              <span>Less: Metal Value</span>
              <span>- ₹{totals.customerMetalValue.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <label className="flex items-center text-gray-700 cursor-pointer mr-3">
                <input
                  type="checkbox"
                  checked={applyGst}
                  onChange={(e) => setApplyGst(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Apply GST ({gstRate}%)
              </label>
              {applyGst && (
                <button
                  type="button"
                  onClick={handleAskAI}
                  disabled={isAiLoading || items.length === 0}
                  className={`flex items-center px-2 py-1 text-xs rounded-full border ${
                    isAiLoading
                      ? 'bg-gray-100 text-gray-400 border-gray-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  }`}
                  title="Ask AI to recommend GST rate based on cart & metal exchange"
                >
                  <Sparkles size={12} className="mr-1" />
                  {isAiLoading ? 'Thinking...' : 'AI GST'}
                </button>
              )}
            </div>
            <span>₹{totals.gst.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-xl font-bold text-gray-800 pt-3 border-t">
            <span>Total:</span>
            <span>₹{totals.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 pt-2 border-t">
            <span>Paid:</span>
            <span>₹{((Number(payment.cashReceived)||0) + (Number(payment.cardReceived)||0)).toFixed(2)}</span>
          </div>
          <div className={`flex justify-between font-bold pt-2 ${totals.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            <span>Balance Due:</span>
            <span>₹{Math.max(0, totals.balance).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-end items-center space-x-4">
        {saved && <span className="text-green-600 mr-4 font-medium">Invoice saved successfully!</span>}
        <button
          onClick={handleSendSms}
          type="button"
          className="flex items-center bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 px-4 rounded-lg transition duration-200 border border-blue-300"
        >
          Send SMS Receipt
        </button>
        <button
          onClick={handleSaveInvoice}
          className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
        >
          <Save size={20} className="mr-2" />
          Save & Generate
        </button>
      </div>
    </div>
  );
}

export default InvoiceForm;
