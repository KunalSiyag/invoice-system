import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { Printer, Camera, Smartphone, Upload } from 'lucide-react';

function QRGenerator() {
  const fileInputRef = useRef(null);
  const [localIp, setLocalIp] = useState('');
  const [showPairing, setShowPairing] = useState(false);
  const [itemPhoto, setItemPhoto] = useState(null);

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

  useEffect(() => {
    // Get local IP for pairing QR
    if (window.api && window.api.getLocalIp) {
      window.api.getLocalIp().then(ip => setLocalIp(ip));
    }

    // Listen for photos from companion app
    if (window.api && window.api.onPhotoReceived) {
      const handlePhoto = (photoUrl) => {
        setItemPhoto(photoUrl);
        setShowPairing(false); // Hide pairing modal if open
      };
      window.api.onPhotoReceived(handlePhoto);

      return () => {
        window.api.offPhotoReceived(handlePhoto);
      };
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setItemPhoto(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Form Section */}
      <div className="bg-white p-8 rounded-xl shadow-sm print:hidden">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Generate QR Tag</h2>

        {showPairing && localIp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center relative">
              <button
                onClick={() => setShowPairing(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
              <h3 className="text-xl font-bold mb-2">Connect Phone</h3>
              <p className="text-gray-600 mb-6 text-sm">Scan this with your phone's camera to upload a photo directly to this tag.</p>
              <div className="flex justify-center mb-4">
                <QRCodeSVG value={`http://${localIp}:3001`} size={200} />
              </div>
              <p className="font-mono text-xs text-gray-500 bg-gray-100 p-2 rounded">
                http://{localIp}:3001
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">Item Photo (Optional)</label>
            <div className="flex flex-wrap gap-3">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload size={16} className="mr-2" />
                Upload File
              </button>

              {window.api && (
                <button
                  onClick={() => setShowPairing(true)}
                  className="flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  <Smartphone size={16} className="mr-2" />
                  Take via Phone
                </button>
              )}
            </div>

            {itemPhoto && (
              <div className="mt-4 relative inline-block">
                <img src={itemPhoto} alt="Item" className="h-24 w-24 object-cover rounded-md border border-gray-200" />
                <button
                  onClick={() => setItemPhoto(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

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
          {itemPhoto && (
            <div className="mb-3 w-full flex justify-center">
              <img src={itemPhoto} alt="Item" className="w-24 h-24 object-contain print:grayscale" />
            </div>
          )}
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
