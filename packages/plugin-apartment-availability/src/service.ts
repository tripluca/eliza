import { Service } from '@elizaos/core';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define interface for availability records
export interface AvailabilityRecord {
  id?: number;
  apartmentId: string;
  date: string;
  status: 'available' | 'booked' | 'blocked' | 'maintenance';
  notes?: string;
}

export class ApartmentAvailabilityService implements Service {
  static readonly serviceType = 'apartment-availability';
  
  private db: Database | null = null;
  private dbPath: string;
  
  constructor(dbPath?: string) {
    // Set the default path to be in the Eliza standard location under a plugins subdirectory
    if (dbPath) {
      this.dbPath = dbPath;
    } else {
      // Default to agent/data/plugins/apartment-availability/db.sqlite
      // This follows Eliza conventions while keeping plugin data separate
      
      // Use a fixed absolute path instead of relying on the current working directory
      // First check if we're running in a standard Eliza environment by looking for agent directory
      const potentialElizaRoot = path.resolve(__dirname, '../../../..');
      const isElizaEnvironment = fs.existsSync(path.join(potentialElizaRoot, 'agent'));
      
      if (isElizaEnvironment) {
        this.dbPath = path.resolve(potentialElizaRoot, 'agent/data/plugins/apartment-availability/db.sqlite');
      } else {
        // Fallback to a path within the package itself for standalone operation
        this.dbPath = path.resolve(__dirname, '../data/apartment-availability/db.sqlite');
      }
    }
    console.log(`[ApartmentAvailabilityService] Database path set to: ${this.dbPath}`);
    
    // Ensure the data directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      console.log(`[ApartmentAvailabilityService] Creating directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }
  
  async initialize(): Promise<boolean> {
    try {
      console.log(`[ApartmentAvailabilityService] Opening database at: ${this.dbPath}`);
      
      // Open the database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });
      
      // Create the table if it doesn't exist
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS apartment_availability (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          apartmentId TEXT NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT,
          UNIQUE(apartmentId, date)
        )
      `);
      
      console.log('[ApartmentAvailabilityService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[ApartmentAvailabilityService] Initialization error:', error);
      return false;
    }
  }
  
  async shutdown(): Promise<boolean> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
        console.log('[ApartmentAvailabilityService] Database connection closed');
      }
      return true;
    } catch (error) {
      console.error('[ApartmentAvailabilityService] Error during shutdown:', error);
      return false;
    }
  }
  
  async getAvailability(month: string, year: string, apartmentId: string = 'santa-maria'): Promise<AvailabilityRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Format month to ensure it's two digits
    const formattedMonth = month.padStart(2, '0');
    
    // Get the date pattern for the specified month and year
    const datePattern = `${year}-${formattedMonth}-%`;
    
    // Query the database for all records in the specified month/year
    const records = await this.db.all(
      `SELECT * FROM apartment_availability 
       WHERE apartmentId = ? AND date LIKE ? 
       ORDER BY date ASC`,
      [apartmentId, datePattern]
    );
    
    return records as AvailabilityRecord[];
  }
  
  async getFormattedAvailability(month: string, year: string, apartmentId: string = 'santa-maria'): Promise<string> {
    const records = await this.getAvailability(month, year, apartmentId);
    
    // Format results for display
    if (records.length === 0) {
      return `No availability information found for ${month}/${year}.`;
    }
    
    // Group records by status
    const available: string[] = [];
    const booked: string[] = [];
    const blocked: string[] = [];
    const maintenance: string[] = [];
    
    // Extract day number from date string (YYYY-MM-DD)
    records.forEach(record => {
      const day = record.date.split('-')[2];
      switch (record.status) {
        case 'available':
          available.push(day);
          break;
        case 'booked':
          booked.push(day);
          break;
        case 'blocked':
          blocked.push(day);
          break;
        case 'maintenance':
          maintenance.push(day);
          break;
      }
    });
    
    // Build the formatted response
    let result = `Availability for ${month}/${year}:\n`;
    
    if (available.length > 0) {
      result += `- Available dates: ${available.join(', ')}\n`;
    }
    
    if (booked.length > 0) {
      result += `- Booked dates: ${booked.join(', ')}\n`;
    }
    
    if (blocked.length > 0) {
      result += `- Blocked dates: ${blocked.join(', ')}\n`;
    }
    
    if (maintenance.length > 0) {
      result += `- Maintenance dates: ${maintenance.join(', ')}\n`;
    }
    
    return result.trim();
  }
  
  async updateAvailability(
    dates: string[], 
    status: 'available' | 'booked' | 'blocked' | 'maintenance', 
    apartmentId: string = 'santa-maria',
    notes?: string
  ): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      console.log(`[ApartmentAvailabilityService] Updating ${dates.length} dates to ${status} for ${apartmentId}`);
      console.log(`[ApartmentAvailabilityService] Dates: ${dates.join(', ')}`);
      
      // Start a transaction
      await this.db.exec('BEGIN TRANSACTION');
      
      for (const date of dates) {
        // Try to update existing record
        console.log(`[ApartmentAvailabilityService] Setting ${date} to ${status}`);
        const result = await this.db.run(
          `INSERT INTO apartment_availability (apartmentId, date, status, notes)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(apartmentId, date) DO UPDATE SET
           status = excluded.status,
           notes = excluded.notes`,
          [apartmentId, date, status, notes]
        );
        
        // Log the result
        console.log(`[ApartmentAvailabilityService] Update result: ${JSON.stringify(result)}`);
      }
      
      // Commit the transaction
      await this.db.exec('COMMIT');
      console.log(`[ApartmentAvailabilityService] Successfully updated ${dates.length} dates to ${status}`);
      
      // Verify the updates
      for (const date of dates) {
        const record = await this.db.get(
          'SELECT status FROM apartment_availability WHERE apartmentId = ? AND date = ?',
          [apartmentId, date]
        );
        console.log(`[ApartmentAvailabilityService] Verification: ${date} status is now ${record ? record.status : 'not found'}`);
      }
      
      return true;
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await this.db.exec('ROLLBACK');
      console.error('[ApartmentAvailabilityService] Update error:', error);
      return false;
    }
  }
  
  async getDateStatus(date: string, apartmentId: string = 'santa-maria'): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const record = await this.db.get(
      'SELECT status FROM apartment_availability WHERE apartmentId = ? AND date = ?',
      [apartmentId, date]
    );
    
    return record ? record.status : 'available';  // Default to available if no record found
  }
  
  async importFromJson(jsonData: any, apartmentId: string = 'santa-maria'): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      // Start a transaction
      await this.db.exec('BEGIN TRANSACTION');
      
      // Process the data based on its structure
      if (Array.isArray(jsonData)) {
        // If it's an array, assume each item has date and status
        for (const item of jsonData) {
          if (item.date && item.status) {
            await this.db.run(
              `INSERT INTO apartment_availability (apartmentId, date, status, notes)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(apartmentId, date) DO UPDATE SET
               status = excluded.status,
               notes = excluded.notes`,
              [apartmentId, item.date, item.status, item.notes || null]
            );
          }
        }
      } else if (typeof jsonData === 'object') {
        // If it's an object, process each property (assuming month/year structure)
        for (const monthYear of Object.keys(jsonData)) {
          const [month, year] = monthYear.split('/');
          
          // Skip if month or year is not valid
          if (!month || !year) continue;
          
          // Process the availability data for this month/year
          const monthData = jsonData[monthYear];
          
          // Handle different possible data structures
          if (Array.isArray(monthData.available)) {
            for (const day of monthData.available) {
              const date = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              await this.updateAvailability([date], 'available', apartmentId);
            }
          }
          
          if (Array.isArray(monthData.booked)) {
            for (const day of monthData.booked) {
              const date = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              await this.updateAvailability([date], 'booked', apartmentId);
            }
          }
          
          if (Array.isArray(monthData.blocked)) {
            for (const day of monthData.blocked) {
              const date = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              await this.updateAvailability([date], 'blocked', apartmentId);
            }
          }
          
          if (Array.isArray(monthData.maintenance)) {
            for (const day of monthData.maintenance) {
              const date = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              await this.updateAvailability([date], 'maintenance', apartmentId);
            }
          }
        }
      }
      
      // Commit the transaction
      await this.db.exec('COMMIT');
      console.log('[ApartmentAvailabilityService] Import completed successfully');
      return true;
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await this.db.exec('ROLLBACK');
      console.error('[ApartmentAvailabilityService] Import error:', error);
      return false;
    }
  }
} 