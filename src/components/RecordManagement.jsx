import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Printer } from 'lucide-react';

function RecordManagement() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    if (window.api) {
      const data = await window.api.readFile('invoices.json');
      if (data && Array.isArray(data)) {
        // Sort newest first
        setInvoices(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (selectedInvoice) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm print:shadow-none print:p-0">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <button
            onClick={() => setSelectedInvoice(null)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            &larr; Back to Records
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-lg"
          >
            <Printer size={18} className="mr-2" /> Print Receipt
          </button>
        </div>

        {/* Printable Receipt Area */}
        <div className="border border-gray-200 p-8 rounded-lg print:border-none print:p-0">
          <div className="text-center mb-8 border-b pb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">SHREE JEWELLERS</h1>
            <p className="text-gray-600">123 Market Street, City</p>
            <p className="text-gray-600">Ph: +91 9876543210</p>
          </div>

          <div className="flex justify-between mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Billed To</h3>
              <p className="font-medium text-gray-800 mt-1">{selectedInvoice.customerInfo.name || 'Walk-in Customer'}</p>
              {selectedInvoice.customerInfo.phone && <p className="text-gray-600">{selectedInvoice.customerInfo.phone}</p>}
              {selectedInvoice.customerInfo.address && <p className="text-gray-600">{selectedInvoice.customerInfo.address}</p>}
            </div>
            <div className="text-right">
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Invoice Details</h3>
              <p className="text-gray-600 mt-1">No: INV-{selectedInvoice.id.slice(-6)}</p>
              <p className="text-gray-600">Date: {format(new Date(selectedInvoice.date), 'dd MMM yyyy')}</p>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left text-sm font-semibold text-gray-600">
                <th className="pb-3">Item Description</th>
                <th className="pb-3 text-right">Weight (g)</th>
                <th className="pb-3 text-right">Making Chg.</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoice.items.map((item, idx) => {
                let rate = 0;
                if (item.type === 'gold') {
                  const baseRatePerGram = (selectedInvoice.ratesAtTime.gold || 0) / 10;
                  const purityMultiplier = item.purity === 24 ? 1 : item.purity === 22 ? 22/24 : item.purity === 18 ? 18/24 : 1;
                  rate = baseRatePerGram * purityMultiplier;
                } else {
                  rate = (selectedInvoice.ratesAtTime.silver || 0) / 1000;
                }
                const amount = (item.weight * rate) + item.makingCharge;

                return (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3">
                      <div className="font-medium text-gray-800">{item.description || 'Jewellery Item'}</div>
                      <div className="text-xs text-gray-500 uppercase">{item.type} {item.type === 'gold' ? `${item.purity}K` : ''}</div>
                    </td>
                    <td className="py-3 text-right">{item.weight}</td>
                    <td className="py-3 text-right">₹{item.makingCharge.toFixed(2)}</td>
                    <td className="py-3 text-right font-medium">₹{amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-right">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>₹{selectedInvoice.totals.subtotal.toFixed(2)}</span>
              </div>
              {selectedInvoice.applyGst && (
                <div className="flex justify-between text-gray-600">
                  <span>GST (3%):</span>
                  <span>₹{selectedInvoice.totals.gst.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-800 pt-3 border-t">
                <span>Total:</span>
                <span>₹{selectedInvoice.totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Invoice Records</h2>

      {invoices.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
          No invoices found. Create a new invoice to see it here.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Invoice No / Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">INV-{inv.id.slice(-6)}</div>
                    <div className="text-sm text-gray-500">{format(new Date(inv.date), 'dd MMM yyyy')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{inv.customerInfo.name || 'Walk-in'}</div>
                    <div className="text-sm text-gray-500">{inv.customerInfo.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {inv.items.length} item(s)
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    ₹{inv.totals.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center text-sm font-medium"
                    >
                      <FileText size={16} className="mr-1" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecordManagement;
