// This file demonstrates how to manually register the apartment-availability plugin
// Note: This is an ES Module version (.mjs extension)

export default async (runtime) => {
  try {
    // Import our plugin (ES module import)
    const { default: ApartmentAvailabilityPlugin } = await import('./dist/index.js');
    
    // Log plugin details
    console.log('Loading Apartment Availability Plugin:', ApartmentAvailabilityPlugin.name);
    
    // Register the plugin with the runtime
    await runtime.registerPlugin(ApartmentAvailabilityPlugin);
    
    console.log('✅ Successfully registered apartment availability plugin');
    return true;
  } catch (error) {
    console.error('❌ Failed to register apartment availability plugin:', error);
    console.error('Error details:', error.stack);
    return false;
  }
}; 