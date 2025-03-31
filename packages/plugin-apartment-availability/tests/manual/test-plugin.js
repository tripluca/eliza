// Simple test script to verify the plugin loads correctly
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==== Testing Apartment Availability Plugin ====');

// Check if package exists
try {
  const packageJsonPath = path.join(__dirname, '../../package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);
  
  console.log('✅ Found package.json:', packageJson.name, packageJson.version);
  
  // Check for proper namespace
  if (packageJson.name.startsWith('@elizaos/')) {
    console.log('✅ Package has correct @elizaos namespace');
  } else {
    console.error('❌ Package should use @elizaos namespace');
  }
} catch (err) {
  console.error('❌ Error loading package.json:', err.message);
}

// Try importing the plugin
try {
  const pluginModule = await import('../../dist/index.js');
  const plugin = pluginModule.default;
  
  console.log('✅ Successfully imported plugin:', plugin.name);
  
  // Check plugin structure for v0.25.9 compatibility
  const pluginObj = plugin;
  
  // Check basic properties
  console.log('Checking plugin structure for v0.25.9 compatibility:');
  checkProperty(pluginObj, 'name', 'string');
  checkProperty(pluginObj, 'version', 'string');
  checkProperty(pluginObj, 'description', 'string');
  
  // Check methods
  checkProperty(pluginObj, 'initialize', 'function');
  checkProperty(pluginObj, 'shutdown', 'function');
  
  // In v0.25.9, plugin actions can be registered in initialize or via actions array
  const hasActionsArray = Array.isArray(pluginObj.actions);
  const registersActionsInInit = pluginObj.initialize.toString().includes('registerAction');
  
  if (hasActionsArray || registersActionsInInit) {
    console.log('✅ Plugin correctly handles actions (array or registration)');
  } else {
    console.error('❌ Plugin should either have actions array or register actions in initialize');
  }
} catch (err) {
  console.error('❌ Error importing plugin:', err.message);
}

// Check the symbolic link
const expectedLinkPath = path.resolve('../../../../node_modules/@elizaos/plugin-apartment-availability');
try {
  const stats = fs.lstatSync(expectedLinkPath);
  if (stats.isSymbolicLink()) {
    const target = fs.readlinkSync(expectedLinkPath);
    console.log('✅ Symlink exists and points to:', target);
  } else {
    console.error('❌ Path exists but is not a symlink:', expectedLinkPath);
  }
} catch (err) {
  console.error('❌ Error checking symlink:', err.message);
}

// Check Eliza version compatibility
try {
  const elizaPackageJsonPath = path.resolve('../../../../agent/package.json');
  if (fs.existsSync(elizaPackageJsonPath)) {
    const elizaPackageJsonContent = fs.readFileSync(elizaPackageJsonPath, 'utf8');
    const elizaPackageJson = JSON.parse(elizaPackageJsonContent);
    const elizaVersion = elizaPackageJson.version;
    
    console.log('Detected Eliza version:', elizaVersion);
    
    if (elizaVersion === '0.25.9') {
      console.log('✅ Plugin is designed for the current Eliza version');
    } else {
      console.log('⚠️ Plugin is designed for Eliza v0.25.9, but current version is', elizaVersion);
      console.log('   Some adjustments may be needed for full compatibility');
    }
  } else {
    console.log('⚠️ Could not find Eliza agent package.json - version compatibility not checked');
  }
} catch (err) {
  console.error('❌ Error checking Eliza version:', err.message);
}

// Helper function to check property existence and type
function checkProperty(obj, propName, expectedType) {
  if (obj[propName] !== undefined) {
    const actualType = Array.isArray(obj[propName]) ? 'array' : typeof obj[propName];
    if (actualType === expectedType) {
      console.log(`✅ Plugin has ${propName} (${expectedType})`);
    } else {
      console.error(`❌ Plugin has ${propName} but type is ${actualType}, expected ${expectedType}`);
    }
  } else {
    console.error(`❌ Plugin is missing ${propName}`);
  }
}

console.log('==== Test Complete ===='); 