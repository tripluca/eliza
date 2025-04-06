// This file demonstrates how to manually register the apartment-availability plugin

module.exports = async (runtime) => {
  try {
    // Import our plugin
    const ApartmentAvailabilityPlugin = require('./dist/index.js').default;
    
    // Log plugin details
    console.log('Loading Apartment Availability Plugin:', ApartmentAvailabilityPlugin.name);
    
    // Register the plugin with the runtime
    await runtime.registerPlugin(ApartmentAvailabilityPlugin);
    
    console.log('✅ Successfully registered apartment availability plugin');
    return true;
  } catch (error) {
    console.error('❌ Failed to register apartment availability plugin:', error);
    return false;
  }
}; 