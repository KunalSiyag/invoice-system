import React, { useState, useEffect } from 'react';

function InventoryManager() {
  const [inventory, setInventory] = useState([]);
  const [newItem, setNewItem] = useState({
    id: '',
    name: '',
    type: 'Gold', // Gold, Silver, Diamond
    weight: 0,
    purity: '',
    quantity: 1,
    hsnCode: '',
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    if (window.api) {
      const data = await window.api.readFile('inventory.json');
      if (data) {
        setInventory(data);
      }
    }
  };

  const saveInventory = async (newInventory) => {
    if (window.api) {
      await window.api.writeFile('inventory.json', newInventory);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: name === 'weight' || name === 'quantity' ? parseFloat(value) || 0 : value
    });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || newItem.weight <= 0) return;

    const itemToAdd = {
      ...newItem,
      id: newItem.id || `INV-${Date.now()}`
    };

    const updatedInventory = [...inventory, itemToAdd];
    setInventory(updatedInventory);
    await saveInventory(updatedInventory);

    setNewItem({
      id: '',
      name: '',
      type: 'Gold',
      weight: 0,
      purity: '',
      quantity: 1,
      hsnCode: '',
    });
  };

  const handleDeleteItem = async (id) => {
    const updatedInventory = inventory.filter(item => item.id !== id);
    setInventory(updatedInventory);
    await saveInventory(updatedInventory);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Inventory Management</h2>

      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-xl font-semibold mb-4">Add New Item</h3>
        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Item Name</label>
            <input
              type="text"
              name="name"
              value={newItem.name}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Item ID/Code (Optional)</label>
            <input
              type="text"
              name="id"
              value={newItem.id}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              placeholder="Auto-generated if empty"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              name="type"
              value={newItem.type}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
            >
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Diamond">Diamond</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Weight (g)</label>
            <input
              type="number"
              step="0.001"
              name="weight"
              value={newItem.weight}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Purity</label>
            <input
              type="text"
              name="purity"
              value={newItem.purity}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              placeholder="e.g., 22K, 92.5%"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={newItem.quantity}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">HSN Code</label>
            <input
              type="text"
              name="hsnCode"
              value={newItem.hsnCode}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Add to Inventory
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">Current Stock</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.weight}g</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    No items in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InventoryManager;