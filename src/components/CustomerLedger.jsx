import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';

function CustomerLedger() {
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [interestRate, setInterestRate] = useState(2); // 2% per month default

  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    if (window.api) {
      const data = await window.api.readFile('ledger.json');
      if (data && Array.isArray(data)) {
        setLedgerEntries(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    }
  };

  const calculateInterest = (entry) => {
    const daysOverdue = differenceInDays(new Date(), new Date(entry.date));
    if (daysOverdue <= 30) return 0; // 30 days grace period

    // Simple interest calculation: (Principal * Rate * Time) / 100
    // Rate is monthly, so Time is months (days / 30)
    const monthsOverdue = (daysOverdue - 30) / 30;
    const interest = (entry.amountOwed * interestRate * monthsOverdue) / 100;
    return Math.max(0, interest);
  };

  const markAsPaid = async (id) => {
    if (window.api) {
      const updatedEntries = ledgerEntries.map(entry => {
        if (entry.id === id) {
          return { ...entry, status: 'paid', paidDate: new Date().toISOString() };
        }
        return entry;
      });
      const success = await window.api.writeFile('ledger.json', updatedEntries);
      if (success) setLedgerEntries(updatedEntries);
    }
  };

  const totalOutstanding = ledgerEntries
    .filter(e => e.status === 'unpaid')
    .reduce((sum, e) => sum + e.amountOwed + calculateInterest(e), 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Customer Ledger & Balances</h2>
        <div className="flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <label className="text-sm font-medium text-gray-600">Monthly Interest Rate (%):</label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-16 p-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800">Total Outstanding (including estimated interest)</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">₹{totalOutstanding.toFixed(2)}</p>
        </div>
      </div>

      {ledgerEntries.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
          No ledger records found. Unpaid balances from invoices will appear here.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Date / Invoice</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-right">Principal Due</th>
                <th className="px-6 py-4 text-right">Est. Interest</th>
                <th className="px-6 py-4 text-right">Total Due</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ledgerEntries.map((entry) => {
                const interest = entry.status === 'unpaid' ? calculateInterest(entry) : 0;
                const total = entry.amountOwed + interest;

                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{format(new Date(entry.date), 'dd MMM yyyy')}</div>
                      <div className="text-xs text-gray-500">INV-{entry.invoiceId.slice(-6)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{entry.customerName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{entry.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      ₹{entry.amountOwed.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-red-500">
                      ₹{interest.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                      ₹{total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {entry.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {entry.status === 'unpaid' && (
                        <button
                          onClick={() => markAsPaid(entry.id)}
                          className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CustomerLedger;
