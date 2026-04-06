import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

function Cashbook() {
  const [transactions, setTransactions] = useState([]);
  const [newEntry, setNewEntry] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'income',
    amount: 0,
    description: '',
    category: 'General'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.api) {
      const txData = await window.api.readFile('cashbook.json');
      if (txData) setTransactions(txData);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.amount || newEntry.amount <= 0) return;

    const txToAdd = {
      ...newEntry,
      id: `CB-${Date.now()}`,
      amount: parseFloat(newEntry.amount)
    };

    const updatedTx = [...transactions, txToAdd];
    setTransactions(updatedTx);

    if (window.api) {
      await window.api.writeFile('cashbook.json', updatedTx);
    }

    setNewEntry({
      ...newEntry,
      amount: 0,
      description: ''
    });
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Business Cashbook</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
          <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Total Income</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">₹{totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
          <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wide">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">₹{totalExpense.toFixed(2)}</p>
        </div>
        <div className={`p-6 rounded-lg shadow border ${netBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wide ${netBalance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Net Balance</h3>
          <p className={`text-3xl font-bold mt-2 ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>₹{netBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Add Manual Entry</h3>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <div className="mt-2 flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-600"
                      checked={newEntry.type === 'income'}
                      onChange={() => setNewEntry({...newEntry, type: 'income'})}
                    />
                    <span className="ml-2">Income</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-red-600"
                      checked={newEntry.type === 'expense'}
                      onChange={() => setNewEntry({...newEntry, type: 'expense'})}
                    />
                    <span className="ml-2">Expense</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="General">General</option>
                  <option value="Sales">Sales (Manual)</option>
                  <option value="Staff Salary">Staff Salary</option>
                  <option value="Rent/Utilities">Rent / Utilities</option>
                  <option value="Materials">Materials/Packaging</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newEntry.amount}
                  onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
                Save Entry
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow h-full">
            <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.slice().reverse().map(tx => (
                      <tr key={tx.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{tx.description}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'income' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cashbook;