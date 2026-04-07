const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Starting Electron app with Playwright...');

  // Launch the Electron app
  const electronApp = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'development' }
  });

  // Wait for the main window to be created
  const window = await electronApp.firstWindow();
  await window.waitForLoadState('networkidle');
  console.log('App loaded successfully.');

  try {
    // --- Test 1: Inventory Management ---
    console.log('Testing Inventory Manager...');
    await window.click('text=Inventory');
    await window.waitForTimeout(500);

    const itemName = 'Test Gold Ring ' + Date.now();
    await window.fill('input[name="name"]', itemName);
    await window.fill('input[name="weight"]', '10.5');
    await window.fill('input[name="quantity"]', '5');
    await window.click('button:has-text("Add to Inventory")');
    await window.waitForTimeout(1000);

    // Verify item was added to the UI
    const isItemVisible = await window.isVisible(`text=${itemName}`);
    if (!isItemVisible) throw new Error('Inventory item was not added to the UI.');
    console.log('✅ Inventory Management Test Passed.');


    // --- Test 2: Supplier Ledger ---
    console.log('Testing Supplier Ledger...');
    await window.click('text=Supplier Ledger');
    await window.waitForTimeout(500);

    const supplierName = 'Test Supplier ' + Date.now();
    // Use more specific selectors for the supplier form
    const addSupplierForm = window.locator('form').first();
    await addSupplierForm.locator('input').nth(0).fill(supplierName); // Name
    await addSupplierForm.locator('input').nth(1).fill('Supplier Inc.'); // Company
    await addSupplierForm.locator('button:has-text("Add Supplier")').click();
    await window.waitForTimeout(1000);

    // Verify supplier was added to the dropdown in the transaction form
    // The dropdown text might be truncated or structured differently, wait for it in the DOM
    // option elements are technically hidden in some browsers/frameworks, so we check for presence instead of visibility
    await window.waitForSelector(`option:has-text("${supplierName}")`, { state: 'attached', timeout: 5000 });
    console.log('✅ Supplier Ledger Test Passed.');


    // --- Test 3: Invoice & Inventory Deduction ---
    console.log('Testing Invoice and Inventory Deduction...');
    await window.click('text=New Invoice');
    await window.waitForTimeout(500);

    // Fill customer info
    await window.fill('input[name="name"]', 'John Doe Test');
    await window.fill('input[name="phone"]', '1234567890');

    // Add manual item that matches the inventory item name
    await window.click('button:has-text("Add Manual Item")');
    await window.waitForTimeout(200);

    // The items list might have an empty item first, find the input for description
    const descInputs = await window.locator('input[placeholder="Item name"]').all();
    await descInputs[descInputs.length - 1].fill(itemName);

    // Save invoice
    await window.click('button:has-text("Save & Generate")');
    await window.waitForTimeout(2500); // Wait for success message and reset

    // Verify inventory deduction
    await window.click('text=Inventory');
    await window.waitForTimeout(1000);

    // The quantity should be 4 now
    // We can check this by reading the inventory.json file directly from the user data path
    const appDataPath = await electronApp.evaluate(({ app }) => app.getPath('userData'));
    const inventoryPath = path.join(appDataPath, 'jewellery_data', 'inventory.json');

    const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    const testItem = inventoryData.find(item => item.name === itemName);

    if (!testItem) {
      throw new Error('Test item not found in inventory JSON.');
    }

    if (testItem.quantity !== 4) {
      throw new Error(`Inventory deduction failed. Expected 4, got ${testItem.quantity}`);
    }

    console.log('✅ Invoice & Inventory Deduction Test Passed.');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exitCode = 1;
  } finally {
    await electronApp.close();
    console.log('Tests completed.');
  }
})();
