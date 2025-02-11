# @elizaos/plugin-bom

A plugin for analyzing Bill of Materials (BOM) data from CSV files, calculating stock values, and providing inventory insights.

## Features

- CSV file processing for BOM data
- Stock value calculations
- Support for multiple product categories
- Detailed reporting of inventory analysis

## Installation

```bash
pnpm add @elizaos/plugin-bom
```

## Usage

### Configuration

Add the plugin to your agent's configuration:

```typescript
import bomPlugin from '@elizaos/plugin-bom';

const plugins = [
  // ... other plugins
  bomPlugin,
];
```

### Required CSV Format

The plugin expects CSV files with the following columns:
- CODE
- DESCRIPTION
- IN STOCK
- CONSUMED PER UNIT
- COST PER UNIT

### Actions

#### READ_CSV
Analyzes a BOM file and calculates stock values.

Example trigger phrases:
- "Analyze this BOM file"
- "Calculate stock values from this CSV"
- "Process this inventory file"

## Development Challenges & Solutions

### Message Flow
- Initial attempts used Discord client for direct messaging
- Switched to runtime's message manager
- Finally simplified to return results directly from the handler

### Action Triggering
- Started with two-step confirmation process
- Simplified to immediate processing upon file upload
- Improved validation for CSV files

### CSV Processing
- Implemented robust CSV parsing with error handling
- Added support for different number formats
- Enhanced validation of required columns

### Agent Integration
- Learned to separate plugin calculations from agent responses
- Improved error messaging for better user experience
- Implemented proper logging for debugging

## Best Practices Learned

1. Keep plugins focused on calculations
2. Process files immediately upon upload
3. Implement extensive logging
4. Use proper error handling
5. Maintain clear separation of concerns

## License

MIT
