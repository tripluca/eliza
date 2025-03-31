import { Action, IAgentRuntime } from '@elizaos/core';
import { ApartmentAvailabilityService } from '../service';
import fs from 'fs';
import path from 'path';

export const importAvailabilityAction: Action = {
  name: 'IMPORT_AVAILABILITY',
  description: 'Import apartment availability data from a JSON file',
  examples: [
    'Import availability data from JSON',
    'Load availability from config',
    'Initialize availability database'
  ],
  handler: async (runtime: IAgentRuntime, params: {filePath?: string, apartmentId?: string}) => {
    try {
      const { 
        filePath = 'characters/stella/knowledge/availability.json',
        apartmentId = 'santa-maria'
      } = params;
      
      console.log('[ImportAvailabilityAction] Looking for file at:', filePath);
      
      // Also try alternative paths if the primary one fails
      const possiblePaths = [
        filePath,
        'characters/knowledge/stella/availability.json',
        'characters/stella/knowledge/availability.json',
        'knowledge/stella/availability.json'
      ];
      
      let jsonData;
      let foundPath;
      
      // Try each path until we find the file
      for (const p of possiblePaths) {
        const fullPath = path.resolve(process.cwd(), p);
        console.log('[ImportAvailabilityAction] Checking path:', fullPath);
        
        if (fs.existsSync(fullPath)) {
          console.log('[ImportAvailabilityAction] Found file at:', fullPath);
          jsonData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          foundPath = fullPath;
          break;
        }
      }
      
      if (!jsonData) {
        return {
          success: false,
          error: `File not found in any of the checked locations`,
          data: {
            checkedPaths: possiblePaths.map(p => path.resolve(process.cwd(), p))
          }
        };
      }
      
      // Get the service and import the data
      console.log('[ImportAvailabilityAction] Getting service...');
      const service = runtime.getService(ApartmentAvailabilityService.serviceType) as ApartmentAvailabilityService;
      
      console.log('[ImportAvailabilityAction] Importing data...');
      const result = await service.importFromJson(jsonData, apartmentId);
      
      if (result) {
        return {
          success: true,
          message: 'Successfully imported availability data',
          data: {
            apartmentId,
            source: foundPath
          }
        };
      } else {
        return {
          success: false,
          error: 'Failed to import availability data',
          data: null
        };
      }
    } catch (error) {
      console.error('[ImportAvailabilityAction] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null
      };
    }
  }
}; 