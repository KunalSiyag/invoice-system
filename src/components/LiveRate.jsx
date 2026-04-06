import React, { useState, useEffect } from 'react';

function LiveRate({ rates, onRateChange }) {
  const [localRates, setLocalRates] = useState(rates);
  const [smsSettings, setSmsSettings] = useState({ accountSid: '', authToken: '', senderNumber: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalRates(rates);
    loadSmsSettings();
  }, [rates]);

  const loadSmsSettings = async () => {
    if (window.api) {
      const settings = await window.api.readFile('sms_settings.json');
      if (settings) setSmsSettings(settings);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalRates((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
    setSaved(false);
  };

  const handleSmsChange = (e) => {
    const { name, value } = e.target;
    setSmsSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    onRateChange(localRates);
    if (window.api) {
      await window.api.writeFile('sms_settings.json', smsSettings);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Daily Rates Settings</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gold Rate (per 10g)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
            <input
              type="number"
              name="gold"
              value={localRates.gold || ''}
              onChange={handleChange}
              className="pl-8 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Silver Rate (per 1kg)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
            <input
              type="number"
              name="silver"
              value={localRates.silver || ''}
              onChange={handleChange}
              className="pl-8 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">AI Integration Settings</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key (for GST Rules)</label>
            <input
              type="password"
              name="apiKey"
              value={localRates.apiKey || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="sk-..."
            />
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">SMS API Settings (Twilio)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
              <input
                type="text"
                name="accountSid"
                value={smsSettings.accountSid}
                onChange={handleSmsChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
              <input
                type="password"
                name="authToken"
                value={smsSettings.authToken}
                onChange={handleSmsChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender Number</label>
              <input
                type="text"
                name="senderNumber"
                value={smsSettings.senderNumber}
                onChange={handleSmsChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="+1234567890"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 mt-6"
        >
          Save All Settings
        </button>

        {saved && (
          <p className="text-green-600 text-center mt-4">Rates saved successfully!</p>
        )}
      </div>
    </div>
  );
}

export default LiveRate;
