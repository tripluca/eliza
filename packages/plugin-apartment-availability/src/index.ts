import { Plugin, IAgentRuntime } from '@elizaos/core';
import { ApartmentAvailabilityService } from './service';
import { checkAvailabilityAction } from './actions/checkAvailability';
import { updateAvailabilityAction } from './actions/updateAvailability';
import { importAvailabilityAction } from './actions/importAvailability';

// Add more prominent console logs
console.log('🏠🏠🏠 APARTMENT AVAILABILITY PLUGIN MODULE LOADED 🏠🏠🏠');

const ApartmentAvailabilityPlugin: Plugin = {
  name: 'apartment-availability',
  version: '1.0.0',
  description: 'Plugin for managing apartment availability',
  
  initialize: async (runtime: IAgentRuntime) => {
    try {
      console.log('🏠🏠🏠 APARTMENT AVAILABILITY PLUGIN INITIALIZING 🏠🏠🏠');
      
      // Register the service
      const service = new ApartmentAvailabilityService();
      await service.initialize();
      runtime.registerService(ApartmentAvailabilityService.serviceType, service);
      console.log('🏠 Apartment availability service registered');
      
      // Register actions - still needed for backward compatibility
      runtime.registerAction(checkAvailabilityAction);
      console.log('🏠 Registered checkAvailabilityAction');
      
      runtime.registerAction(updateAvailabilityAction);
      console.log('🏠 Registered updateAvailabilityAction');
      
      runtime.registerAction(importAvailabilityAction);
      console.log('🏠 Registered importAvailabilityAction');
      
      console.log('🏠🏠🏠 APARTMENT AVAILABILITY PLUGIN INITIALIZED SUCCESSFULLY 🏠🏠🏠');
      
      return true;
    } catch (error) {
      console.error('🏠❌ APARTMENT AVAILABILITY PLUGIN INITIALIZATION FAILED:', error);
      return false;
    }
  },
  
  shutdown: async (runtime: IAgentRuntime) => {
    try {
      console.log('🏠🏠🏠 APARTMENT AVAILABILITY PLUGIN SHUTTING DOWN 🏠🏠🏠');
      
      const service = runtime.getService(ApartmentAvailabilityService.serviceType) as ApartmentAvailabilityService;
      await service.shutdown();
      
      console.log('🏠🏠🏠 APARTMENT AVAILABILITY PLUGIN SHUT DOWN SUCCESSFULLY 🏠🏠🏠');
      
      return true;
    } catch (error) {
      console.error('🏠❌ APARTMENT AVAILABILITY PLUGIN SHUTDOWN FAILED:', error);
      return false;
    }
  }
};

// Add one more prominent log at the end
console.log('🏠🏠🏠 APARTMENT AVAILABILITY PLUGIN EXPORT READY 🏠🏠🏠');

export default ApartmentAvailabilityPlugin; 