import React, { useState, useEffect } from 'react';
import LiveRate from './components/LiveRate';
import InvoiceForm from './components/InvoiceForm';
import RecordManagement from './components/RecordManagement';
import QRGenerator from './components/QRGenerator';
import CustomerLedger from './components/CustomerLedger';
import InventoryManager from './components/InventoryManager';
import SupplierLedger from './components/SupplierLedger';
import Cashbook from './components/Cashbook';
import { Settings, FileText, List, QrCode, BookOpen, Package, Truck, DollarSign } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('invoice');
  const [liveRates, setLiveRates] = useState({ gold: 0, silver: 0 });

  useEffect(() => {
    // Load rates on startup
    const loadRates = async () => {
      if (window.api) {
        const settings = await window.api.readFile('settings.json');
        if (settings && settings.rates) {
          setLiveRates(settings.rates);
        }
      }
    };
    loadRates();
  }, []);

  const handleRateChange = async (newRates) => {
    setLiveRates(newRates);
    if (window.api) {
      const settings = await window.api.readFile('settings.json') || {};
      settings.rates = newRates;
      await window.api.writeFile('settings.json', settings);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">JewelInvoice</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('invoice')}
            className={`w-full flex items-center p-3 rounded-lg text-left ${activeTab === 'invoice' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText className="w-5 h-5 mr-3" />
            New Invoice
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`w-full flex items-center p-3 rounded-lg text-left ${activeTab === 'records' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <List className="w-5 h-5 mr-3" />
            Records
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`w-full flex items-center p-3 rounded-lg text-left ${activeTab === 'qr' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <QrCode className="w-5 h-5 mr-3" />
            QR Tags
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`w-full flex items-center p-3 rounded-lg text-left ${activeTab === 'ledger' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BookOpen className="w-5 h-5 mr-3" />
            Customer Ledger
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center p-3 rounded-lg text-left ${activeTab === 'inventory' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Package className="w-5 h-5 mr-3" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`w-full flex items-center p-3 rounded-lg text-left ${activeTab === 'supplier' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Truck className="w-5 h-5 mr-3" />
            Supplier Ledger
          </button>
          <button
            onClick={() => setActiveTab('cashbook')}
            className={`w-full flex items-center p-3 rounded-lg text-left ${activeTab === 'cashbook' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <DollarSign className="w-5 h-5 mr-3" />
            Cashbook
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center p-3 rounded-lg text-left ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-5 h-5 mr-3" />
            Rates & Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {activeTab === 'invoice' && <InvoiceForm liveRates={liveRates} />}
        {activeTab === 'records' && <RecordManagement />}
        {activeTab === 'qr' && <QRGenerator />}
        {activeTab === 'ledger' && <CustomerLedger />}
        {activeTab === 'inventory' && <InventoryManager />}
        {activeTab === 'supplier' && <SupplierLedger />}
        {activeTab === 'cashbook' && <Cashbook />}
        {activeTab === 'settings' && <LiveRate rates={liveRates} onRateChange={handleRateChange} />}
      </main>
    </div>
  );
}

export default App;
