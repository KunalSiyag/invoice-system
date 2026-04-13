import React, { useState, useEffect } from 'react';
import LiveRate from './components/LiveRate';
import InvoiceForm from './components/InvoiceForm';
import RecordManagement from './components/RecordManagement';
import QRGenerator from './components/QRGenerator';
import CustomerLedger from './components/CustomerLedger';
import InventoryManager from './components/InventoryManager';
import SupplierLedger from './components/SupplierLedger';
import Cashbook from './components/Cashbook';
import { Settings, FileText, List, QrCode, BookOpen, Package, Truck, DollarSign, LayoutDashboard, HelpCircle, Bell, Search, Sparkles } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState('invoice');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Hook into the scroll of the main content area
  const scrollRef = React.useRef(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });

  // Twist rotation from 0 to 360 degrees based on scroll progress
  const logoRotation = useTransform(scrollYProgress, [0, 1], [0, 360]);
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
    <div className="flex h-screen bg-brand-bg font-sans text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: 280 }}
        animate={{ width: isSidebarOpen ? 280 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-sidebar-bg border-r border-gray-200 flex flex-col relative z-20 overflow-hidden"
      >
        <div className="p-8 pb-4 min-w-[280px]">
          <div className="flex items-center">
            {/* Animated Naqshi Logo */}
            <motion.div
              style={{ rotate: logoRotation }}
              className="mr-3 w-8 h-8 rounded-full border-2 border-brand-brown flex items-center justify-center font-bold text-brand-brown"
            >
              N
            </motion.div>
            <div>
              <h1 className="text-xl font-bold tracking-widest text-gray-900 uppercase">NAQSHI</h1>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Flagship Boutique</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-1 min-w-[280px]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-brand-bg border-r-4 border-brand-brown text-brand-brown' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'} rounded-l-md`}
          >
            <LayoutDashboard className="w-5 h-5 mr-4" />
            DASHBOARD
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'invoice' ? 'bg-brand-bg border-r-4 border-brand-brown text-brand-brown' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'} rounded-l-md`}
          >
            <FileText className="w-5 h-5 mr-4" />
            NEW INVOICE
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'inventory' ? 'bg-brand-bg border-r-4 border-brand-brown text-brand-brown' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'} rounded-l-md`}
          >
            <Package className="w-5 h-5 mr-4" />
            INVENTORY
          </button>
          <button
            onClick={() => setActiveTab('cashbook')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'cashbook' ? 'bg-brand-bg border-r-4 border-brand-brown text-brand-brown' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'} rounded-l-md`}
          >
            <DollarSign className="w-5 h-5 mr-4" />
            CASHBOOK
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'ledger' ? 'bg-brand-bg border-r-4 border-brand-brown text-brand-brown' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'} rounded-l-md`}
          >
            <BookOpen className="w-5 h-5 mr-4" />
            CUSTOMER LEDGER
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'supplier' ? 'bg-brand-bg border-r-4 border-brand-brown text-brand-brown' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'} rounded-l-md`}
          >
            <Truck className="w-5 h-5 mr-4" />
            SUPPLIER LEDGER
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'records' ? 'bg-brand-bg border-r-4 border-brand-brown text-brand-brown' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'} rounded-l-md`}
          >
            <List className="w-5 h-5 mr-4" />
            RECORDS
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'qr' ? 'bg-brand-bg border-r-4 border-brand-brown text-brand-brown' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'} rounded-l-md`}
          >
            <QrCode className="w-5 h-5 mr-4" />
            QR TAGS
          </button>
        </nav>

        {/* Bottom Sparkle AI Banner */}
        <div className="p-4 mt-auto">
          <div className="bg-[#f0ece1] rounded-lg p-4 border border-[#e5dfce] shadow-sm">
            <button className="w-full bg-brand-brown hover:bg-brand-brown-dark text-white rounded py-3 flex items-center justify-center font-medium text-sm transition-colors shadow-md">
              <Sparkles className="w-4 h-4 mr-2" />
              SPARKLE AI
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-brand-brown' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Settings className="w-5 h-5 mr-4" />
            SETTINGS
          </button>
          <button
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <HelpCircle className="w-5 h-5 mr-4" />
            SUPPORT
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            {/* Animated Cross Line / Hamburger Menu Toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-md hover:bg-gray-100 transition-colors z-50 focus:outline-none"
              aria-label="Toggle Sidebar"
            >
              <motion.span
                animate={isSidebarOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-6 h-0.5 bg-gray-600 block"
              />
              <motion.span
                animate={isSidebarOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-6 h-0.5 bg-gray-600 block"
              />
              <motion.span
                animate={isSidebarOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-6 h-0.5 bg-gray-600 block"
              />
            </button>

            <div className="relative w-full max-w-md ml-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search inventory or invoices..."
                className="block w-full pl-10 pr-3 py-3 border-none rounded-lg bg-gray-100 text-sm focus:ring-2 focus:ring-brand-brown focus:bg-white transition-colors outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className="flex space-x-6 text-sm">
              <div>
                <span className="text-gray-500 font-medium">Au: </span>
                <span className="font-bold text-brand-brown">₹{(liveRates.gold || 0).toLocaleString()}</span>
              </div>
              <div className="w-px h-5 bg-gray-300"></div>
              <div>
                <span className="text-gray-500 font-medium">Ag: </span>
                <span className="font-bold text-gray-600">₹{(liveRates.silver || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="px-4 py-2 text-sm font-medium text-brand-brown bg-brand-bg rounded-md hover:bg-[#eae6db] transition-colors">
                Manual Entry
              </button>
              <button className="px-5 py-2 text-sm font-medium text-white bg-brand-brown rounded-md hover:bg-brand-brown-dark transition-colors shadow-md">
                New Stock
              </button>
            </div>

            <div className="flex items-center space-x-4 pl-4 border-l border-gray-200">
              <button className="text-gray-400 hover:text-gray-600 transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              <div className="h-8 w-8 rounded-full bg-gray-300 overflow-hidden border border-gray-200">
                <img src="https://i.pravatar.cc/100" alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main ref={scrollRef} className="flex-1 overflow-auto p-6 md:p-8 bg-brand-bg">
          {activeTab === 'dashboard' && <div className="text-center mt-20 text-gray-500 min-h-[150vh]">Dashboard coming soon...</div>}
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
    </div>
  );
}

export default App;
