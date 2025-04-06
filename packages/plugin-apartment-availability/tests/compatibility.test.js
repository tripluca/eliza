// Test file to ensure compatibility with Eliza
import assert from 'assert';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect Eliza version
let elizaVersion = "unknown";
try {
  const elizaPackageJsonPath = path.resolve(__dirname, '../../../agent/package.json');
  if (fs.existsSync(elizaPackageJsonPath)) {
    const elizaPackageJsonContent = fs.readFileSync(elizaPackageJsonPath, 'utf8');
    const elizaPackageJson = JSON.parse(elizaPackageJsonContent);
    elizaVersion = elizaPackageJson.version || "unknown";
  }
} catch (error) {
  console.error('Error detecting Eliza version:', error.message);
}

console.log(`==== Eliza v${elizaVersion} Compatibility Test ====`);

async function runTests() {
  try {
    // Import the plugin module
    console.log('Importing plugin module...');
    const pluginModule = await import('../dist/index.js');
    const plugin = pluginModule.default;
    
    // Check plugin structure
    console.log('Testing plugin structure...');
    if (!plugin) {
      throw new Error('Plugin is not properly exported as default');
    }
    
    // Check basic properties
    if (plugin.name !== 'apartment-availability') {
      throw new Error(`Incorrect plugin name: ${plugin.name}`);
    }
    console.log('✅ Plugin name is correct');
    
    if (typeof plugin.version !== 'string' || !plugin.version) {
      throw new Error('Plugin version is missing or invalid');
    }
    console.log('✅ Plugin version is valid');
    
    if (typeof plugin.description !== 'string' || !plugin.description) {
      throw new Error('Plugin description is missing or invalid');
    }
    console.log('✅ Plugin description is valid');
    
    // Check methods
    if (typeof plugin.initialize !== 'function') {
      throw new Error('Plugin initialize method is missing');
    }
    console.log('✅ Plugin has initialize method');
    
    if (typeof plugin.shutdown !== 'function') {
      throw new Error('Plugin shutdown method is missing');
    }
    console.log('✅ Plugin has shutdown method');
    
    // Check actions registration
    const initializeCode = plugin.initialize.toString();
    if (!initializeCode.includes('registerAction')) {
      throw new Error('Plugin does not register actions in initialize method');
    }
    console.log('✅ Plugin registers actions in initialize method');
    
    if (!initializeCode.includes('checkAvailabilityAction')) {
      throw new Error('Plugin does not register checkAvailabilityAction');
    }
    console.log('✅ Plugin includes checkAvailabilityAction');
    
    if (!initializeCode.includes('updateAvailabilityAction')) {
      throw new Error('Plugin does not register updateAvailabilityAction');
    }
    console.log('✅ Plugin includes updateAvailabilityAction');
    
    if (!initializeCode.includes('importAvailabilityAction')) {
      throw new Error('Plugin does not register importAvailabilityAction');
    }
    console.log('✅ Plugin includes importAvailabilityAction');
    
    // Check service registration
    if (!initializeCode.includes('registerService')) {
      throw new Error('Plugin does not register a service in initialize method');
    }
    console.log('✅ Plugin registers a service in initialize method');
    
    if (!initializeCode.includes('ApartmentAvailabilityService')) {
      throw new Error('Plugin does not register ApartmentAvailabilityService');
    }
    console.log('✅ Plugin includes ApartmentAvailabilityService');
    
    console.log(`\n🎉 SUCCESS: Plugin is compatible with Eliza v${elizaVersion}!`);
    return true;
  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    process.exit(1);
  }
}

runTests(); 