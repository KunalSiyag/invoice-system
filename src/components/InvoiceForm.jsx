import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, ScanLine } from 'lucide-react';

function InvoiceForm({ liveRates }) {
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  const [items, setItems] = useState([]);
  const [applyGst, setApplyGst] = useState(true); // Smart GST defaults to true
  const [payment, setPayment] = useState({ cashReceived: 0, cardReceived: 0 });
  const [totals, setTotals] = useState({ subtotal: 0, gst: 0, total: 0, balance: 0 });
  const [saved, setSaved] = useState(false);

  const [qrInput, setQrInput] = useState('');
  const qrInputRef = useRef(null);

  const handleCustomerChange = (e) => {
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

    // Smart GST: Usually 3% applies if items exist and toggle is on.
    // In a real rule-based scenario, this might depend on item type.
    const gst = applyGst && subtotal > 0 ? subtotal * 0.03 : 0;
    const total = subtotal + gst;

    const cash = Number(payment.cashReceived) || 0;
    const card = Number(payment.cardReceived) || 0;
    const balance = total - (cash + card);

    setTotals({
      subtotal: Math.round(subtotal * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: Math.round(total * 100) / 100,
      balance: Math.round(balance * 100) / 100
    });
  }, [items, applyGst, liveRates, payment]);

  const handleSaveInvoice = async () => {
    if (window.api) {
      const invoiceData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        customerInfo,
        items,
        applyGst,
        totals,
        payment,
        ratesAtTime: liveRates
      };

      const existingData = await window.api.readFile('invoices.json') || [];
      existingData.push(invoiceData);
      const success = await window.api.writeFile('invoices.json', existingData);

      // Update Ledger if there is a balance
      if (success && totals.balance > 0) {
        const ledgerData = await window.api.readFile('ledger.json') || [];
        ledgerData.push({
          id: Date.now().toString(),
          invoiceId: invoiceData.id,
          date: invoiceData.date,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          amountOwed: totals.balance,
          status: 'unpaid'
        });
        await window.api.writeFile('ledger.json', ledgerData);
      }

      if (success) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          // Reset form
          setCustomerInfo({ name: '', phone: '', address: '' });
          setItems([]);
          setPayment({ cashReceived: 0, cardReceived: 0 });
          setApplyGst(true);
        }, 2000);
      }
    } else {
      console.warn("Electron API not available");
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
          <input
            type="text"
            name="name"
            value={customerInfo.name}
            onChange={handleCustomerChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text"
            name="phone"
            value={customerInfo.phone}
            onChange={handleCustomerChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            name="address"
            value={customerInfo.address}
            onChange={handleCustomerChange}
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

        {/* Totals */}
        <div className="space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>₹{totals.subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={applyGst}
                onChange={(e) => setApplyGst(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Apply GST (3%)
            </label>
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
      <div className="mt-8 flex justify-end items-center">
        {saved && <span className="text-green-600 mr-4 font-medium">Invoice saved successfully!</span>}
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
