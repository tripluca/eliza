# Apartment Availability Plugin for Eliza v0.25.9

A plugin for managing apartment availability within the Eliza agent ecosystem. This plugin provides actions and services to check, update, and import apartment availability data.

## Features

- Check apartment availability by month and year
- Update availability status (available, booked, blocked, maintenance)
- Import availability data from JSON files
- Persistent storage using SQLite database

## Installation

```bash
npm install @elizaos/plugin-apartment-availability
```

Or use the package from your workspace:

```json
{
  "dependencies": {
    "@elizaos/plugin-apartment-availability": "workspace:*"
  }
}
```

## Configuration

Add this plugin to your character file:

```json
{
  "name": "YourCharacter",
  "plugins": ["@elizaos/plugin-apartment-availability"],
  "settings": {
    // Optional plugin settings can go here
  }
}
```

## Available Actions

### CHECK_AVAILABILITY

Checks availability for a specific month and year.

```
Parameters:
- month: The month to check (string)
- year: The year to check (string)
```

### UPDATE_AVAILABILITY

Updates availability status for specific dates.

```
Parameters:
- dates: The date or dates to update (string)
- status: The status to set (available, booked, blocked, or maintenance)
```

### IMPORT_AVAILABILITY

Imports availability data from a JSON file.

```
Parameters:
- filePath: (Optional) Path to the JSON file
- apartmentId: (Optional) ID of the apartment
```

## Compatibility with Eliza v0.25.9

This plugin is compatible with Eliza v0.25.9 with the following considerations:

1. **Namespace**: Uses the `@elizaos` namespace as required.

2. **Plugin Structure**: Implements the required Plugin interface:
   - `name`, `version`, and `description` properties
   - `initialize` and `shutdown` methods
   - Actions registered in the initialize method

3. **Action Registration**: 
   - In v0.25.9, plugins can either:
     - Define actions in an `actions` array property
     - Register actions in the `initialize` method
   - This plugin uses the latter approach for backward compatibility.

4. **Service Implementation**:
   - Provides a service for database operations that follows the Service interface.

## Testing Compatibility

The plugin includes compatibility tests to ensure it works with Eliza v0.25.9:

```bash
pnpm test:compatibility
```

## Development

### Prerequisites

- Node.js 23+
- pnpm
- SQLite

### Building the plugin

```bash
pnpm build
```

### Linking for development

```bash
./link-plugin.sh
```

### Running in watch mode

```bash
pnpm dev
```

## Database Structure

The plugin creates a `apartment_availability` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS apartment_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartmentId TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  UNIQUE(apartmentId, date)
)
```

The database is stored at `agent/data/plugins/apartment-availability/db.sqlite` within your Eliza installation, keeping the plugin data separate from other plugin and agent data.

## Testing

The plugin includes manual test scripts in the `tests/manual` directory:

- `test-import.js`: Import data from a JSON file into the database
- `test-db.js`: Test database operations directly
- `test-plugin-actions.ts`: Test plugin actions with a mock runtime

See `SETUP.md` for more details on using these test scripts.

## Example JSON Data Format

The plugin can import data in the following format:

```json
{
  "7/2025": {
    "available": [1, 2, 3, 4, 5, 6, 7, 8, 9, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
    "booked": [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  },
  "8/2025": {
    "available": [1, 2, 3, 4, 5, 6, 7, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
    "booked": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
  }
}
```

## License

MIT 