// Manual test script to verify the plugin actions
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏠🏠🏠 TESTING APARTMENT AVAILABILITY PLUGIN ACTIONS 🏠🏠🏠');

async function main() {
  try {
    // Import the plugin
    console.log('Importing plugin...');
    const { default: ApartmentAvailabilityPlugin } = await import('../../dist/index.js');
    
    // Create a mock runtime for testing with an array to capture registered actions
    const registeredActions = [];
    const mockRuntime = {
      services: {},
      registerService(type, service) {
        console.log(`Registering service: ${type}`);
        this.services[type] = service;
        return true;
      },
      getService(type) {
        return this.services[type];
      },
      registerAction(action) {
        console.log(`Registering action: ${action.name}`);
        registeredActions.push(action);
        return true;
      }
    };

    // Initialize the plugin (which registers the service and actions)
    console.log('Initializing plugin...');
    await ApartmentAvailabilityPlugin.initialize(mockRuntime);
    console.log('Plugin initialized successfully');
    console.log(`Registered ${registeredActions.length} actions`);

    // Get the actions from the registered actions
    const checkAvailabilityAction = registeredActions.find(a => a.name === 'CHECK_AVAILABILITY');
    const updateAvailabilityAction = registeredActions.find(a => a.name === 'UPDATE_AVAILABILITY');
    const importAvailabilityAction = registeredActions.find(a => a.name === 'IMPORT_AVAILABILITY');
    
    if (!checkAvailabilityAction || !updateAvailabilityAction || !importAvailabilityAction) {
      console.error('Could not find all required actions');
      registeredActions.forEach(action => {
        console.log(`Action registered: ${action.name}`);
      });
      return;
    }
    
    // Test import action first
    console.log('\n🔍 Testing IMPORT_AVAILABILITY action');
    const importResult = await importAvailabilityAction.handler(
      mockRuntime, 
      { filePath: path.resolve(__dirname, '../../../../characters/stella/knowledge/availability.json') }
    );
    console.log('Import result:', JSON.stringify(importResult, null, 2));

    // Test check availability action
    console.log('\n🔍 Testing CHECK_AVAILABILITY action');
    const checkResult = await checkAvailabilityAction.handler(
      mockRuntime, 
      { month: '8', year: '2025' }
    );
    console.log('Check availability result:', JSON.stringify(checkResult, null, 2));

    // Test update availability action
    console.log('\n🔍 Testing UPDATE_AVAILABILITY action');
    const updateResult = await updateAvailabilityAction.handler(
      mockRuntime, 
      { dates: '2025-08-10', status: 'maintenance' }
    );
    console.log('Update availability result:', JSON.stringify(updateResult, null, 2));

    // Check the updated availability 
    console.log('\n🔍 Testing CHECK_AVAILABILITY action after update');
    const reCheckResult = await checkAvailabilityAction.handler(
      mockRuntime, 
      { month: '8', year: '2025' }
    );
    console.log('Re-check availability result:', JSON.stringify(reCheckResult, null, 2));

    // Shutdown the plugin
    await ApartmentAvailabilityPlugin.shutdown(mockRuntime);
    console.log('\nPlugin shutdown successfully');
    
  } catch (error) {
    console.error('Error during test:', error);
    console.error(error.stack);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
}); 