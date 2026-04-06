import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

function CustomerLedger() {
  const [customers, setCustomers] = useState({});
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  // State for Add Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.api) {
      const customersData = await window.api.readFile('customers.json') || [];
      const customersMap = customersData.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {});
      setCustomers(customersMap);

      const ledgerData = await window.api.readFile('ledger.json') || [];

      // Migrate legacy ledger entries
      const migratedLedger = ledgerData.map(entry => {
        if (!entry.customerId && entry.customerName) {
          // It's a legacy entry. We'll attempt to find or mock a customerId.
          const existingCust = Object.values(customersMap).find(c => c.name === entry.customerName);
          return {
            ...entry,
            type: 'invoice',
            customerId: existingCust ? existingCust.id : `legacy_${entry.customerName}`,
            dueDate: entry.date,
            interestRate: 2,
          };
        }
        return entry;
      });

      setLedgerEntries(migratedLedger.sort((a, b) => new Date(a.date) - new Date(b.date)));
    }
  };

  const calculateInterestForEntry = (entry, asOfDate = new Date()) => {
    if (entry.type !== 'invoice') return 0;

    // Only calculate interest if we are past the due date
    const dueDate = new Date(entry.dueDate || entry.date);
    const targetDate = new Date(asOfDate);

    if (targetDate <= dueDate) return 0;

    const daysOverdue = differenceInDays(targetDate, dueDate);
    if (daysOverdue <= 0) return 0;

    // Monthly interest calculation based on the specific rate for this entry
    const monthsOverdue = daysOverdue / 30;
    const interest = (entry.amountOwed * (entry.interestRate || 2) * monthsOverdue) / 100;

    return Math.max(0, interest);
  };

  // Group ledger entries by customer
  const groupedLedger = ledgerEntries.reduce((acc, entry) => {
    if (!acc[entry.customerId]) {
      acc[entry.customerId] = {
        customerId: entry.customerId,
        customerName: customers[entry.customerId]?.name || entry.customerName || 'Unknown Customer',
        phone: customers[entry.customerId]?.phone || entry.customerPhone || '',
        entries: [],
        totalPrincipal: 0,
        totalInterest: 0,
        totalPaid: 0,
      };
    }

    acc[entry.customerId].entries.push(entry);

    if (entry.type === 'invoice') {
      acc[entry.customerId].totalPrincipal += entry.amountOwed;
      acc[entry.customerId].totalInterest += calculateInterestForEntry(entry);
    } else if (entry.type === 'payment') {
      acc[entry.customerId].totalPaid += entry.amount;
    }

    return acc;
  }, {});

  // For each customer, calculate the current net balance
  Object.values(groupedLedger).forEach(group => {
    // Net balance = (Total Principal + Total Interest) - Total Payments
    const totalOwed = group.totalPrincipal + group.totalInterest;
    group.netBalance = Math.max(0, totalOwed - group.totalPaid);
  });

  const activeCustomers = Object.values(groupedLedger).filter(g => g.netBalance > 0);
  const totalOutstanding = activeCustomers.reduce((sum, g) => sum + g.netBalance, 0);

  const handleAddPayment = async (customerId, e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) return;

    if (window.api) {
      const newEntry = {
        id: `pay_${Date.now()}`,
        type: 'payment',
        customerId: customerId,
        date: new Date(paymentDate).toISOString(),
        amount: Number(paymentAmount),
      };

      const updatedLedger = [...ledgerEntries, newEntry];
      const success = await window.api.writeFile('ledger.json', updatedLedger);

      if (success) {
        setLedgerEntries(updatedLedger.sort((a, b) => new Date(a.date) - new Date(b.date)));
        setPaymentAmount('');
        setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Customer Ledger & Balances</h2>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-red-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-red-800">Total Market Outstanding</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">₹{totalOutstanding.toFixed(2)}</p>
          </div>
          <div className="text-sm text-red-700">
            Across {activeCustomers.length} active customer accounts
          </div>
        </div>
      </div>

      {activeCustomers.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
          No ledger records found. Unpaid balances from invoices will appear here.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-right">Principal Due</th>
                <th className="px-6 py-4 text-right">Acquired Interest</th>
                <th className="px-6 py-4 text-right">Total Paid</th>
                <th className="px-6 py-4 text-right">Net Balance Due</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeCustomers.map((group) => (
                <React.Fragment key={group.customerId}>
                  {/* Summary Row */}
                  <tr
                    className={`hover:bg-gray-50 cursor-pointer ${expandedCustomer === group.customerId ? 'bg-blue-50' : ''}`}
                    onClick={() => setExpandedCustomer(expandedCustomer === group.customerId ? null : group.customerId)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{group.customerName}</div>
                      <div className="text-xs text-gray-500">{group.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      ₹{group.totalPrincipal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-red-500">
                      ₹{group.totalInterest.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-green-600">
                      ₹{group.totalPaid.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                      ₹{group.netBalance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {expandedCustomer === group.customerId ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />}
                    </td>
                  </tr>

                  {/* Expanded Detail View */}
                  {expandedCustomer === group.customerId && (
                    <tr>
                      <td colSpan="6" className="px-6 py-6 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-3 gap-8">

                          {/* Transaction History */}
                          <div className="col-span-2">
                            <h4 className="text-sm font-bold text-gray-700 mb-4 border-b pb-2">Transaction History</h4>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                              {group.entries.map(entry => (
                                <div key={entry.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200 text-sm">
                                  {entry.type === 'invoice' ? (
                                    <>
                                      <div>
                                        <div className="font-semibold text-red-700">Invoice: INV-{entry.invoiceId?.slice(-6)}</div>
                                        <div className="text-xs text-gray-500">
                                          Date: {format(new Date(entry.date), 'dd MMM yyyy')} |
                                          Due: {format(new Date(entry.dueDate || entry.date), 'dd MMM yyyy')} |
                                          Rate: {entry.interestRate || 2}%
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-medium text-gray-900">+₹{entry.amountOwed.toFixed(2)}</div>
                                        <div className="text-xs text-red-500">Int: +₹{calculateInterestForEntry(entry).toFixed(2)}</div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div>
                                        <div className="font-semibold text-green-700">Payment Received</div>
                                        <div className="text-xs text-gray-500">Date: {format(new Date(entry.date), 'dd MMM yyyy')}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-bold text-green-600">-₹{entry.amount.toFixed(2)}</div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Add Payment Form */}
                          <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-4 border-b pb-2">Record Cash Payment</h4>
                            <form onSubmit={(e) => handleAddPayment(group.customerId, e)} className="bg-white p-4 rounded border border-gray-200">
                              <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                <input
                                  type="date"
                                  value={paymentDate}
                                  onChange={(e) => setPaymentDate(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-blue-500"
                                  required
                                />
                              </div>
                              <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><DollarSign size={14} /></span>
                                  <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="pl-8 w-full p-2 border border-gray-300 rounded text-sm focus:ring-blue-500"
                                    required
                                  />
                                </div>
                              </div>
                              <button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
                              >
                                Record Payment
                              </button>
                            </form>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CustomerLedger;
