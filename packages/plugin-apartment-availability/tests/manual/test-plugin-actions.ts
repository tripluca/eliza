// Manual test script to verify the plugin actions
import path from 'path';
import { fileURLToPath } from 'url';
import { ApartmentAvailabilityService } from '../../src/service.js';
import { checkAvailabilityAction } from '../../src/actions/checkAvailability.js';
import { updateAvailabilityAction } from '../../src/actions/updateAvailability.js';
import { importAvailabilityAction } from '../../src/actions/importAvailability.js';
import { IAgentRuntime } from '@elizaos/core';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏠🏠🏠 TESTING APARTMENT AVAILABILITY PLUGIN ACTIONS 🏠🏠🏠');

interface MockRuntime extends IAgentRuntime {
  services: Record<string, any>;
}

async function main() {
  // Create a mock runtime for testing
  const mockRuntime: MockRuntime = {
    services: {},
    registerService(type: string, service: any) {
      this.services[type] = service;
      return true;
    },
    getService(type: string) {
      return this.services[type];
    },
    registerAction() {
      return true;
    }
  } as MockRuntime;

  try {
    // Initialize the service
    console.log('Initializing ApartmentAvailabilityService...');
    const service = new ApartmentAvailabilityService();
    await service.initialize();
    mockRuntime.registerService(ApartmentAvailabilityService.serviceType, service);
    console.log('Service initialized successfully');
    
    // Test import action first
    console.log('\n🔍 Testing IMPORT_AVAILABILITY action');
    const importResult = await importAvailabilityAction.handler(
      mockRuntime as any, 
      { filePath: path.resolve(__dirname, '../../../../characters/stella/knowledge/availability.json') }
    );
    console.log('Import result:', JSON.stringify(importResult, null, 2));

    // Test check availability action
    console.log('\n🔍 Testing CHECK_AVAILABILITY action');
    const checkResult = await checkAvailabilityAction.handler(
      mockRuntime as any, 
      { month: '8', year: '2025' }
    );
    console.log('Check availability result:', JSON.stringify(checkResult, null, 2));

    // Test update availability action
    console.log('\n🔍 Testing UPDATE_AVAILABILITY action');
    const updateResult = await updateAvailabilityAction.handler(
      mockRuntime as any, 
      { dates: '2025-08-10', status: 'maintenance' }
    );
    console.log('Update availability result:', JSON.stringify(updateResult, null, 2));

    // Check the updated availability 
    console.log('\n🔍 Testing CHECK_AVAILABILITY action after update');
    const reCheckResult = await checkAvailabilityAction.handler(
      mockRuntime as any, 
      { month: '8', year: '2025' }
    );
    console.log('Re-check availability result:', JSON.stringify(reCheckResult, null, 2));

    // Shutdown the service
    await service.shutdown();
    console.log('\nService shutdown successfully');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
}); 