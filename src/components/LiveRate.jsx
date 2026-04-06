import React, { useState, useEffect } from 'react';

function LiveRate({ rates, onRateChange }) {
  const [localRates, setLocalRates] = useState(rates);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalRates(rates);
  }, [rates]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalRates((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
    setSaved(false);
  };

  const handleSave = () => {
    onRateChange(localRates);
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

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
        >
          Save Rates
        </button>

        {saved && (
          <p className="text-green-600 text-center mt-4">Rates saved successfully!</p>
        )}
      </div>
    </div>
  );
}

export default LiveRate;
