# Setting Up the Apartment Availability Plugin

This document provides instructions for setting up and configuring the apartment availability plugin with Eliza.

## Installation

1. Install dependencies:
   ```bash
   cd packages/plugin-apartment-availability
   pnpm install --no-frozen-lockfile
   ```

## Handling TypeScript Errors

During development, you may encounter TypeScript errors about missing module declarations:

```
Cannot find module '@elizaos/core' or its corresponding type declarations.
Cannot find module 'sqlite3' or its corresponding type declarations.
Cannot find module 'sqlite' or its corresponding type declarations.
```

### Temporary Workaround

You can create declaration files to help TypeScript understand these modules:

1. Create a `types` directory:
   ```bash
   mkdir -p src/types
   ```

2. Create declaration files for the modules:

   **src/types/elizaos-core.d.ts**:
   ```typescript
   declare module '@elizaos/core' {
     export interface IAgentRuntime {
       getService(serviceType: string): any;
       registerService(serviceType: string, service: any): void;
       registerAction(action: Action): void;
     }
     
     export interface Action {
       name: string;
       description: string;
       examples: string[];
       handler: (runtime: IAgentRuntime, params: any) => Promise<any>;
     }
     
     export interface Plugin {
       name: string;
       version: string;
       description: string;
       initialize: (runtime: IAgentRuntime) => Promise<boolean>;
       shutdown: (runtime: IAgentRuntime) => Promise<boolean>;
     }
     
     export interface Service {
       // Base service interface
     }
   }
   ```

3. Update your tsconfig.json to include these types:
   ```json
   {
     "compilerOptions": {
       // ...existing options...
       "typeRoots": ["./node_modules/@types", "./src/types"]
     }
   }
   ```

## Building

After installing dependencies and addressing TypeScript errors:

```bash
pnpm build
```

## Registering with Eliza

To register this plugin with Eliza:

1. Add the plugin to Eliza's plugin list in its configuration file.

2. Import the plugin in Eliza's main application:
   ```typescript
   import ApartmentAvailabilityPlugin from '@elizaai/plugin-apartment-availability';
   
   // In your plugin initialization code:
   runtime.registerPlugin(ApartmentAvailabilityPlugin);
   ```

## Testing the Plugin

Once the plugin is registered, you can test it by asking Stella:

- "What's the availability for July 2025?"
- "Mark August 1-5, 2025 as booked"
- "Import availability data"

The plugin should handle these requests by interacting with the SQLite database.

## Manual Testing Scripts

The plugin includes several manual test scripts that can be used for development and debugging:

### Database Import Test

To manually import availability data from a JSON file:

```bash
node tests/manual/test-import.js
```

This will populate the database at `agent/data/plugins/apartment-availability/db.sqlite` with data from the sample availability JSON file.

### Database Query Test

To test querying and updating the database directly:

```bash
node tests/manual/test-db.js
```

This script demonstrates how to:
- Query availability for a specific month
- Update the status of specific dates
- Generate formatted availability reports

### Plugin Integration Test

For TypeScript-based testing of the full plugin with actions:

```bash
npx ts-node tests/manual/test-plugin-actions.ts
```

Note: This may require additional TypeScript configuration.

## Root Directory Test Files

You may notice some additional test files in the plugin's root directory:

- `test-direct-load.mjs`: Tests loading the plugin directly as an ES module
- `test-plugin.js`: Verifies the plugin structure and compatibility with Eliza v0.25.9  
- `test-plugin-actions.js`: Tests the plugin actions in a JavaScript environment

These files are being migrated to the `tests/manual` directory for better organization. For consistency, 
please use the tests in the `tests/manual` directory instead of these root-level test files. 