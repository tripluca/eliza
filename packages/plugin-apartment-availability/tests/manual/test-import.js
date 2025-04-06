// Simple test script to manually import data from the JSON file
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Use the new directory path that matches the service.ts file
  const dbDir = path.resolve(__dirname, '../../../agent/data/plugins/apartment-availability');
  if (!fs.existsSync(dbDir)) {
    console.log(`Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Open database connection
  const dbPath = path.resolve(dbDir, 'db.sqlite');
  console.log(`Opening database at: ${dbPath}`);
  
  // Properly open the database
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log('Database opened successfully');

  // Create the table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS apartment_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartmentId TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      UNIQUE(apartmentId, date)
    )
  `);
  
  // Read JSON file - using the correct path to the characters directory
  const jsonPath = path.resolve(__dirname, '../../../../characters/stella/knowledge/availability.json');
  console.log(`Reading JSON file at: ${jsonPath}`);
  try {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log('JSON data loaded successfully');
    
    // Process and import the data
    const apartmentId = 'santa-maria';
    
    // Start a transaction
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // Process each month in the availability data
      for (const [period, data] of Object.entries(jsonData.availability)) {
        console.log(`Processing period: ${period}`);
        
        // Process available days
        for (const day of data.available_days || []) {
          const date = `${period}-${day.toString().padStart(2, '0')}`;
          console.log(`Setting ${date} as available`);
          
          await db.run(
            `INSERT OR REPLACE INTO apartment_availability (apartmentId, date, status) 
             VALUES (?, ?, ?)`,
            [apartmentId, date, 'available']
          );
        }
        
        // Process booked days
        for (const day of data.booked_days || []) {
          const date = `${period}-${day.toString().padStart(2, '0')}`;
          console.log(`Setting ${date} as booked`);
          
          await db.run(
            `INSERT OR REPLACE INTO apartment_availability (apartmentId, date, status) 
             VALUES (?, ?, ?)`,
            [apartmentId, date, 'booked']
          );
        }
        
        // Process maintenance days if they exist
        for (const day of data.maintenance_days || []) {
          const date = `${period}-${day.toString().padStart(2, '0')}`;
          console.log(`Setting ${date} as maintenance`);
          
          await db.run(
            `INSERT OR REPLACE INTO apartment_availability (apartmentId, date, status) 
             VALUES (?, ?, ?)`,
            [apartmentId, date, 'maintenance']
          );
        }
        
        // Process blocked days if they exist
        for (const day of data.blocked_days || []) {
          const date = `${period}-${day.toString().padStart(2, '0')}`;
          console.log(`Setting ${date} as blocked`);
          
          await db.run(
            `INSERT OR REPLACE INTO apartment_availability (apartmentId, date, status) 
             VALUES (?, ?, ?)`,
            [apartmentId, date, 'blocked']
          );
        }
      }
      
      // Commit the transaction
      await db.exec('COMMIT');
      console.log('Data imported successfully');
      
      // Check how many records we imported
      const countResult = await db.get('SELECT COUNT(*) as count FROM apartment_availability');
      console.log(`Total records in database: ${countResult.count}`);
      
    } catch (error) {
      // Rollback the transaction in case of error
      await db.exec('ROLLBACK');
      console.error('Error importing data:', error);
    }
    
    // Close the database
    await db.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error reading or parsing JSON file:', error);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
}); 