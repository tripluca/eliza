// Simple test script to directly test the database operations
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Database path - updated to use new plugin-specific location
  const dbPath = path.resolve(__dirname, '../../../agent/data/plugins/apartment-availability/db.sqlite');
  console.log(`Opening database at: ${dbPath}`);
  
  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at: ${dbPath}`);
    console.log('Please run the test-import.js script first to create and populate the database.');
    return;
  }
  
  try {
    // Open the database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('Database opened successfully');
    
    // Test 1: Check availability for August 2025
    console.log('\n🔍 Testing: Get availability for August 2025');
    const datePattern = '2025-08-%';
    const records = await db.all(
      `SELECT * FROM apartment_availability 
       WHERE apartmentId = ? AND date LIKE ? 
       ORDER BY date ASC`,
      ['santa-maria', datePattern]
    );
    
    console.log(`Found ${records.length} records for August 2025`);
    
    // Count by status
    const availableCount = records.filter(r => r.status === 'available').length;
    const bookedCount = records.filter(r => r.status === 'booked').length;
    const maintenanceCount = records.filter(r => r.status === 'maintenance').length;
    const blockedCount = records.filter(r => r.status === 'blocked').length;
    
    console.log(`Status counts - Available: ${availableCount}, Booked: ${bookedCount}, Maintenance: ${maintenanceCount}, Blocked: ${blockedCount}`);
    
    // Test 2: Update a date's status
    console.log('\n🔍 Testing: Update status for 2025-08-10 to maintenance');
    await db.run(
      `UPDATE apartment_availability 
       SET status = ? 
       WHERE apartmentId = ? AND date = ?`,
      ['maintenance', 'santa-maria', '2025-08-10']
    );
    console.log('Update completed');
    
    // Test 3: Verify the update
    console.log('\n🔍 Testing: Verify the update for 2025-08-10');
    const updatedRecord = await db.get(
      `SELECT * FROM apartment_availability 
       WHERE apartmentId = ? AND date = ?`,
      ['santa-maria', '2025-08-10']
    );
    
    console.log('Updated record:', updatedRecord);
    
    // Test 4: Get a formatted report
    console.log('\n🔍 Testing: Generate a formatted availability report');
    const august = await db.all(
      `SELECT * FROM apartment_availability 
       WHERE apartmentId = ? AND date LIKE ? 
       ORDER BY date ASC`,
      ['santa-maria', datePattern]
    );
    
    // Format the dates by status
    const byStatus = {
      available: august.filter(r => r.status === 'available').map(r => {
        const parts = r.date.split('-');
        return parseInt(parts[2], 10);
      }),
      booked: august.filter(r => r.status === 'booked').map(r => {
        const parts = r.date.split('-');
        return parseInt(parts[2], 10);
      }),
      maintenance: august.filter(r => r.status === 'maintenance').map(r => {
        const parts = r.date.split('-');
        return parseInt(parts[2], 10);
      }),
      blocked: august.filter(r => r.status === 'blocked').map(r => {
        const parts = r.date.split('-');
        return parseInt(parts[2], 10);
      })
    };
    
    console.log('Formatted availability report:');
    console.log(JSON.stringify(byStatus, null, 2));
    
    // Close the database
    await db.close();
    console.log('\nDatabase connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
}); 