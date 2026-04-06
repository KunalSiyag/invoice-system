import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

function SupplierLedger() {
  const [suppliers, setSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', company: '' });

  const [newTx, setNewTx] = useState({
    supplierId: '',
    type: 'purchase', // purchase or payment
    date: format(new Date(), 'yyyy-MM-dd'),
    metalType: 'gold', // gold, silver
    fineWeight: 0,
    amount: 0,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.api) {
      const supData = await window.api.readFile('suppliers.json');
      if (supData) setSuppliers(supData);

      const txData = await window.api.readFile('supplier_ledger.json');
      if (txData) setTransactions(txData);
    }
  };

  const saveData = async (filename, data) => {
    if (window.api) {
      await window.api.writeFile(filename, data);
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.name) return;

    const supplierToAdd = {
      ...newSupplier,
      id: `SUP-${Date.now()}`
    };

    const updatedSuppliers = [...suppliers, supplierToAdd];
    setSuppliers(updatedSuppliers);
    await saveData('suppliers.json', updatedSuppliers);

    setNewSupplier({ name: '', phone: '', company: '' });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTx.supplierId) return;

    const txToAdd = {
      ...newTx,
      id: `STX-${Date.now()}`,
      fineWeight: parseFloat(newTx.fineWeight) || 0,
      amount: parseFloat(newTx.amount) || 0
    };

    const updatedTx = [...transactions, txToAdd];
    setTransactions(updatedTx);
    await saveData('supplier_ledger.json', updatedTx);

    setNewTx({
      ...newTx,
      fineWeight: 0,
      amount: 0,
      description: ''
    });
  };

  const getSupplierBalance = (supplierId) => {
    const suptx = transactions.filter(t => t.supplierId === supplierId);

    let goldBalance = 0; // positive means we owe them
    let silverBalance = 0;
    let cashBalance = 0;

    suptx.forEach(t => {
      if (t.type === 'purchase') {
        if (t.metalType === 'gold') goldBalance += t.fineWeight;
        if (t.metalType === 'silver') silverBalance += t.fineWeight;
        cashBalance += t.amount;
      } else if (t.type === 'payment') {
        if (t.metalType === 'gold') goldBalance -= t.fineWeight;
        if (t.metalType === 'silver') silverBalance -= t.fineWeight;
        cashBalance -= t.amount;
      }
    });

    return { goldBalance, silverBalance, cashBalance };
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Supplier Ledger (Wholesale)</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Add Supplier Form */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Add Supplier</h3>
          <form onSubmit={handleAddSupplier} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                value={newSupplier.company}
                onChange={(e) => setNewSupplier({...newSupplier, company: e.target.value})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              Add Supplier
            </button>
          </form>
        </div>

        {/* Add Transaction Form */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Record Purchase / Metal Return</h3>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <select
                  value={newTx.supplierId}
                  onChange={(e) => setNewTx({...newTx, supplierId: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.company})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({...newTx, date: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={newTx.type}
                  onChange={(e) => setNewTx({...newTx, type: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                >
                  <option value="purchase">Purchase (Receive)</option>
                  <option value="payment">Payment / Return</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Metal Type</label>
                <select
                  value={newTx.metalType}
                  onChange={(e) => setNewTx({...newTx, metalType: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                >
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fine Weight (g)</label>
                <input
                  type="number"
                  step="0.001"
                  value={newTx.fineWeight}
                  onChange={(e) => setNewTx({...newTx, fineWeight: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                <input
                  type="number"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({...newTx, amount: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                value={newTx.description}
                onChange={(e) => setNewTx({...newTx, description: e.target.value})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
                placeholder="e.g. 5 bangles, labour charges, etc."
              />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
              Save Transaction
            </button>
          </form>
        </div>
      </div>

      {/* Supplier Balances */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-xl font-semibold mb-4">Supplier Balances (We Owe)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(supplier => {
            const bal = getSupplierBalance(supplier.id);
            if (bal.goldBalance === 0 && bal.silverBalance === 0 && bal.cashBalance === 0) return null;
            return (
              <div key={supplier.id} className="border p-4 rounded bg-gray-50">
                <div className="font-bold text-lg">{supplier.name}</div>
                <div className="text-sm text-gray-600 mb-2">{supplier.company}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Gold Owed:</span>
                    <span className={`font-semibold ${bal.goldBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {bal.goldBalance.toFixed(3)} g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Silver Owed:</span>
                    <span className={`font-semibold ${bal.silverBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {bal.silverBalance.toFixed(3)} g
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span>Cash Owed:</span>
                    <span className={`font-semibold ${bal.cashBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{bal.cashBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {suppliers.length === 0 && <p className="text-gray-500">No suppliers added yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default SupplierLedger;