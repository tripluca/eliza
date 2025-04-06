import { Action, IAgentRuntime } from '@elizaos/core';
import { ApartmentAvailabilityService } from '../service';

const monthNameToNumber: Record<string, string> = {
  'january': '01', 'february': '02', 'march': '03', 'april': '04',
  'may': '05', 'june': '06', 'july': '07', 'august': '08',
  'september': '09', 'october': '10', 'november': '11', 'december': '12',
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
  'oct': '10', 'nov': '11', 'dec': '12'
};

// Function to parse human-readable dates like "April 1, 2025" to "2025-04-01"
function parseHumanReadableDate(dateStr: string): string | null {
  dateStr = dateStr.trim();
  
  // If it's already in YYYY-MM-DD format, return it
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Try parsing "Month Day, Year" format (e.g., "April 1, 2025")
  const monthDayYearRegex = /^(\w+)\s+(\d{1,2})(?:,|\s)\s*(\d{4})$/i;
  const match = dateStr.match(monthDayYearRegex);
  
  if (match) {
    const monthStr = match[1].toLowerCase();
    const day = match[2].padStart(2, '0');
    const year = match[3];
    
    // Convert month name to number
    const month = monthNameToNumber[monthStr];
    
    if (month) {
      console.log(`[UpdateAvailabilityAction] Parsed "${dateStr}" to "${year}-${month}-${day}"`);
      return `${year}-${month}-${day}`;
    }
  }
  
  // If parsing failed, log it and return null
  console.error(`[UpdateAvailabilityAction] Failed to parse date: ${dateStr}`);
  return null;
}

export const updateAvailabilityAction: Action = {
  name: 'UPDATE_AVAILABILITY',
  description: 'Update apartment availability status',
  examples: [
    'Mark August 1-5, 2025 as booked',
    'Set July 10, 2025 as available',
    'Block October 15-20, 2025',
    'Schedule maintenance for June 5, 2025'
  ],
  handler: async (runtime: IAgentRuntime, params: {dates?: string, status?: string}) => {
    try {
      console.log(`[UpdateAvailabilityAction] Received update request with params: ${JSON.stringify(params)}`);
      
      // Check if dates and status are provided
      if (!params.dates || !params.status) {
        return {
          success: false,
          error: 'Please provide both dates and status to update availability',
          data: null
        };
      }
      
      // Get the dates and status
      const { dates, status } = params;
      
      // Validate status
      if (!['available', 'booked', 'blocked', 'maintenance'].includes(status)) {
        return {
          success: false,
          error: 'Status must be one of: available, booked, blocked, maintenance',
          data: null
        };
      }
      
      // Parse dates (could be a single date or a range)
      let datesArray: string[] = [];
      
      // Try parsing as a human-readable date first
      const parsedDate = parseHumanReadableDate(dates);
      if (parsedDate) {
        datesArray = [parsedDate];
      } 
      // If it's a single date in YYYY-MM-DD format
      else if (dates.match(/^\d{4}-\d{2}-\d{2}$/)) {
        datesArray = [dates];
      } 
      // If we still couldn't parse it
      else {
        return {
          success: false,
          error: 'Date format not supported. Please use YYYY-MM-DD format or a human-readable date like "April 1, 2025".',
          data: null
        };
      }
      
      console.log(`[UpdateAvailabilityAction] Parsed dates: ${datesArray.join(', ')}`);
      
      // Get the service
      const service = runtime.getService(ApartmentAvailabilityService.serviceType) as ApartmentAvailabilityService;
      
      // Update availability
      const result = await service.updateAvailability(
        datesArray, 
        status as 'available' | 'booked' | 'blocked' | 'maintenance'
      );
      
      if (result) {
        return {
          success: true,
          message: `Successfully updated ${datesArray.length} dates to status: ${status}`,
          data: { dates: datesArray, status }
        };
      } else {
        return {
          success: false,
          error: 'Failed to update availability',
          data: null
        };
      }
    } catch (error) {
      console.error('[UpdateAvailabilityAction] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null
      };
    }
  }
}; 