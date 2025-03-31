import { Action, IAgentRuntime } from '@elizaos/core';
import { ApartmentAvailabilityService } from '../service';

export const checkAvailabilityAction: Action = {
  name: 'CHECK_AVAILABILITY',
  description: 'Check apartment availability for a specific month and year',
  examples: [
    'What\'s the availability for July 2025?',
    'Is the apartment available in December 2024?',
    'Show me the booked dates for August 2025'
  ],
  handler: async (runtime: IAgentRuntime, params: {month?: string, year?: string}) => {
    try {
      // Check if month and year are provided
      if (!params.month || !params.year) {
        return {
          success: false,
          error: 'Please provide both month and year to check availability',
          data: null
        };
      }
      
      // Get the month and year
      const { month, year } = params;
      
      // Get the service
      const service = runtime.getService(ApartmentAvailabilityService.serviceType) as ApartmentAvailabilityService;
      
      // Get formatted availability
      const availability = await service.getFormattedAvailability(month, year);
      
      return {
        success: true,
        message: availability,
        data: { month, year }
      };
    } catch (error) {
      console.error('[CheckAvailabilityAction] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null
      };
    }
  }
}; 