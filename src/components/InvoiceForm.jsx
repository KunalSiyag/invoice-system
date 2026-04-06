import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

function InvoiceForm({ liveRates }) {
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  const [items, setItems] = useState([
    { id: 1, type: 'gold', description: '', weight: 0, makingCharge: 0, purity: 22 }
  ]);
  const [applyGst, setApplyGst] = useState(false);
  const [totals, setTotals] = useState({ subtotal: 0, gst: 0, total: 0 });
  const [saved, setSaved] = useState(false);

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
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
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

    const gst = applyGst ? subtotal * 0.03 : 0; // 3% GST for jewellery in India generally
    const total = subtotal + gst;

    setTotals({
      subtotal: Math.round(subtotal * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: Math.round(total * 100) / 100
    });
  }, [items, applyGst, liveRates]);

  const handleSaveInvoice = async () => {
    if (window.api) {
      const invoiceData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        customerInfo,
        items,
        applyGst,
        totals,
        ratesAtTime: liveRates
      };

      const existingData = await window.api.readFile('invoices.json') || [];
      existingData.push(invoiceData);
      const success = await window.api.writeFile('invoices.json', existingData);

      if (success) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          // Reset form
          setCustomerInfo({ name: '', phone: '', address: '' });
          setItems([{ id: Date.now(), type: 'gold', description: '', weight: 0, makingCharge: 0, purity: 22 }]);
          setApplyGst(false);
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
        <button
          onClick={addItem}
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <Plus size={16} className="mr-1" /> Add Item
        </button>
      </div>

      {/* Totals */}
      <div className="border-t pt-6 flex justify-end">
        <div className="w-64 space-y-3">
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
