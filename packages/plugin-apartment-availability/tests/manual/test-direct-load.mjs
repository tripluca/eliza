// Direct plugin loading test - ES module
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==== Direct Plugin Loading Test ====');

// Simulate a basic runtime
const mockRuntime = {
  registerService: (type, service) => {
    console.log(`Mock runtime: Registered service ${type}`);
    return true;
  },
  registerAction: (action) => {
    console.log(`Mock runtime: Registered action ${action.name}`);
    return true;
  },
  getService: (type) => {
    console.log(`Mock runtime: Getting service ${type}`);
    return {
      shutdown: async () => {
        console.log(`Mock runtime: Service ${type} shut down`);
        return true;
      }
    };
  }
};

async function testDirectLoad() {
  try {
    console.log('Attempting to import plugin...');
    // Direct import from the dist directory
    const { default: ApartmentAvailabilityPlugin } = await import('../../dist/index.js');
    
    console.log('Plugin imported successfully:', ApartmentAvailabilityPlugin.name);
    console.log('Plugin description:', ApartmentAvailabilityPlugin.description);
    console.log('Plugin version:', ApartmentAvailabilityPlugin.version);
    
    // Test initialize
    console.log('\nTesting plugin initialization...');
    const initResult = await ApartmentAvailabilityPlugin.initialize(mockRuntime);
    console.log('Initialize result:', initResult);
    
    // Test shutdown
    console.log('\nTesting plugin shutdown...');
    const shutdownResult = await ApartmentAvailabilityPlugin.shutdown(mockRuntime);
    console.log('Shutdown result:', shutdownResult);
    
    console.log('\n✅ Plugin can be loaded and initialized successfully');
  } catch (error) {
    console.error('\n❌ Failed to load plugin:', error);
    console.error('Error stack:', error.stack);
  }
}

testDirectLoad(); 