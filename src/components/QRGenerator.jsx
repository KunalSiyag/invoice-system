import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { Printer } from 'lucide-react';

function QRGenerator() {
  const [itemData, setItemData] = useState({
    type: 'gold',
    purity: 22,
    description: '',
    weight: '',
    makingCharge: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItemData(prev => ({
      ...prev,
      [name]: name === 'weight' || name === 'makingCharge' || name === 'purity'
              ? (value === '' ? '' : Number(value))
              : value
    }));
  };

  const qrPayload = JSON.stringify({
    ...itemData,
    qr_id: uuidv4() // A unique ID for the physical tag
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Form Section */}
      <div className="bg-white p-8 rounded-xl shadow-sm print:hidden">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Generate QR Tag</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
            <select
              name="type"
              value={itemData.type}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
          </div>

          {itemData.type === 'gold' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
              <select
                name="purity"
                value={itemData.purity}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value={24}>24K</option>
                <option value={22}>22K</option>
                <option value={18}>18K</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              name="description"
              value={itemData.description}
              onChange={handleChange}
              placeholder="e.g. Gold Bangle"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (g)</label>
            <input
              type="number"
              name="weight"
              value={itemData.weight}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Making Charge (₹)</label>
            <input
              type="number"
              name="makingCharge"
              value={itemData.makingCharge}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Preview & Print Section */}
      <div className="bg-white p-8 rounded-xl shadow-sm flex flex-col items-center justify-center print:shadow-none print:p-0 print:block">
        <h3 className="text-lg font-semibold text-gray-700 mb-6 print:hidden">Tag Preview</h3>

        {/* Printable Label Area */}
        <div className="border border-dashed border-gray-400 p-4 rounded-lg flex flex-col items-center print:border-solid print:border-black print:w-48">
          <QRCodeSVG value={qrPayload} size={128} />
          <div className="mt-3 text-center text-xs font-medium text-gray-800 font-mono">
            <div>{itemData.description || 'Jewellery Item'}</div>
            <div>{itemData.type.toUpperCase()} {itemData.type === 'gold' ? `${itemData.purity}K` : ''}</div>
            <div>W: {itemData.weight || 0}g</div>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="mt-8 flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg print:hidden"
        >
          <Printer size={18} className="mr-2" />
          Print Tag
        </button>
      </div>
    </div>
  );
}

export default QRGenerator;
