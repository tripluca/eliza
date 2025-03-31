// Test updating April 1, 2025 to booked status
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏠🏠🏠 TESTING APRIL 1 DATE UPDATE 🏠🏠🏠');

async function main() {
  try {
    // Import the plugin
    console.log('Importing plugin...');
    const { default: ApartmentAvailabilityPlugin } = await import('../../dist/index.js');
    
    // Keep track of registered actions
    const registeredActions = [];
    
    // Create a mock runtime for testing
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

    // Initialize the plugin
    console.log('Initializing plugin...');
    await ApartmentAvailabilityPlugin.initialize(mockRuntime);
    console.log('Plugin initialized successfully');

    // Get the update action from the registered actions
    const updateAvailabilityAction = registeredActions.find(a => a.name === 'UPDATE_AVAILABILITY');
    
    if (!updateAvailabilityAction) {
      console.error('Could not find UPDATE_AVAILABILITY action');
      return;
    }
    
    console.log('Found UPDATE_AVAILABILITY action');
    
    // Try various date formats
    const dateFormats = [
      'April 1, 2025',
      'april 1, 2025',
      'Apr 1, 2025',
      'Apr 1 2025',
      '2025-04-01'
    ];
    
    for (const dateFormat of dateFormats) {
      console.log(`\n🔍 Testing update with date format: "${dateFormat}"`);
      
      // Update to booked
      const result = await updateAvailabilityAction.handler(
        mockRuntime, 
        { dates: dateFormat, status: 'booked' }
      );
      console.log('Update result:', JSON.stringify(result, null, 2));
      
      // Check the database directly to verify the update
      const service = mockRuntime.services['apartment-availability'];
      const record = await service.db.get(
        'SELECT * FROM apartment_availability WHERE date = ?', 
        ['2025-04-01']
      );
      console.log('Record in database:', record);
    }
    
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