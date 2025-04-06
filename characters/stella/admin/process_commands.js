#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the availability JSON file
const AVAILABILITY_FILE_PATH = path.join(__dirname, '..', 'knowledge', 'availability.json');

/**
 * Process admin commands from Discord
 * @param {string} command - The command string starting with !
 * @returns {object} - Object with success status and response message
 */
function processCommand(command) {
  try {
    // Parse the command
    const parts = command.trim().split(' ');
    const action = parts[0].toLowerCase();
    
    switch (action) {
      case '!help':
        return showHelp();
      case '!avail':
        return showAvailability(parts[1]);
      case '!book':
        return bookDays(parts[1], parts[2]);
      case '!unbook':
        return unbookDays(parts[1], parts[2]);
      case '!price':
        return updatePrice(parts[1], parts[2]);
      case '!monthly':
        return updateMonthlyPrice(parts[1], parts[2]);
      default:
        return {
          success: false,
          message: "Unknown command. Type !help for available commands."
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error processing command: ${error.message}`
    };
  }
}

/**
 * Show help message with available commands
 * @returns {object} - Help message
 */
function showHelp() {
  return {
    success: true,
    message: `🔒 ADMIN MODE - COMMAND HELP 🔒

Available commands in the santa-maria-internal channel:

!avail [YYYY-MM] - Show availability for specified month
Example: !avail 2025-07

!book [YYYY-MM] [day1,day2,...] - Mark days as booked
Example: !book 2025-07 1,2,3,4,5

!unbook [YYYY-MM] [day1,day2,...] - Mark days as available
Example: !unbook 2025-08 10,11,12

!price [season] [rate] - Update daily pricing
Example: !price high_season 160

!monthly [season] [rate] - Update monthly pricing
Example: !monthly low_season 1800

!help - Show this help message

Note: These commands only work in the santa-maria-internal channel.`
  };
}

/**
 * Load the availability data from JSON file
 * @returns {object} - The parsed availability data
 */
function loadAvailabilityData() {
  try {
    const fileData = fs.readFileSync(AVAILABILITY_FILE_PATH, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    throw new Error(`Error loading availability data: ${error.message}`);
  }
}

/**
 * Save the availability data to JSON file
 * @param {object} data - The availability data to save
 */
function saveAvailabilityData(data) {
  try {
    data.updated = new Date().toISOString().split('T')[0];
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(AVAILABILITY_FILE_PATH, jsonString);
    return true;
  } catch (error) {
    throw new Error(`Error saving availability data: ${error.message}`);
  }
}

/**
 * Show availability for a specific month
 * @param {string} month - Month in YYYY-MM format
 * @returns {object} - Availability information
 */
function showAvailability(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return {
      success: false,
      message: "Invalid month format. Please use YYYY-MM (e.g., 2025-07)."
    };
  }
  
  try {
    const data = loadAvailabilityData();
    
    // Check if the month exists in the data
    if (!data.availability[month]) {
      return {
        success: true,
        message: `🔒 ADMIN MODE - AVAILABILITY INFO 🔒\n\nMonth: ${month}\n\nNo availability data found for this month. Use !book or !unbook to set up this month.`
      };
    }
    
    // Get the season based on the month
    const monthNum = parseInt(month.split('-')[1]);
    let season = 'low_season';
    if ([6, 7, 8, 9].includes(monthNum)) season = 'high_season';
    else if ([3, 4, 5, 10].includes(monthNum)) season = 'mid_season';
    
    // Get pricing info
    const dailyRate = data.pricing.daily[season].rate;
    const monthlyRate = data.pricing.monthly[season].rate;
    const minStay = data.pricing.daily[season].minimum_stay;
    
    return {
      success: true,
      message: `🔒 ADMIN MODE - AVAILABILITY INFO 🔒\n\nMonth: ${month}\n\nAvailable Days: ${data.availability[month].available_days.join(', ')}\n\nBooked Days: ${data.availability[month].booked_days.join(', ')}\n\nCurrent Pricing: €${dailyRate}/night (${season}), €${monthlyRate}/month\nMinimum Stay: ${minStay} nights\n\nNote: This information is only visible in the admin channel.`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error showing availability: ${error.message}`
    };
  }
}

/**
 * Book days in a specific month
 * @param {string} month - Month in YYYY-MM format
 * @param {string} daysString - Comma-separated list of days
 * @returns {object} - Booking confirmation
 */
function bookDays(month, daysString) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return {
      success: false,
      message: "Invalid month format. Please use YYYY-MM (e.g., 2025-07)."
    };
  }
  
  if (!daysString) {
    return {
      success: false,
      message: "No days specified. Please provide comma-separated days (e.g., 1,2,3)."
    };
  }
  
  try {
    const data = loadAvailabilityData();
    
    // Parse days to book
    const daysToBook = daysString.split(',').map(day => parseInt(day.trim(), 10));
    
    // Validate days
    if (daysToBook.some(isNaN) || daysToBook.some(day => day < 1 || day > 31)) {
      return {
        success: false,
        message: "Invalid day format. Please use numbers between 1 and 31."
      };
    }
    
    // Initialize month if it doesn't exist
    if (!data.availability[month]) {
      data.availability[month] = {
        available_days: Array.from({length: 31}, (_, i) => i + 1),
        booked_days: []
      };
    }
    
    // Process booking
    const newAvailableDays = data.availability[month].available_days.filter(
      day => !daysToBook.includes(day)
    );
    
    const newBookedDays = [
      ...data.availability[month].booked_days,
      ...daysToBook.filter(day => !data.availability[month].booked_days.includes(day))
    ].sort((a, b) => a - b);
    
    // Update data
    data.availability[month].available_days = newAvailableDays;
    data.availability[month].booked_days = newBookedDays;
    
    // Save updated data
    saveAvailabilityData(data);
    
    return {
      success: true,
      message: `🔒 ADMIN MODE - BOOKING UPDATE 🔒\n\nI've marked the following days as BOOKED in ${month}:\n- ${daysToBook.join(', ')}\n\nUpdated availability for ${month}:\nAvailable Days: ${newAvailableDays.join(', ')}\nBooked Days: ${newBookedDays.join(', ')}\n\nAvailability file has been updated successfully.`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error booking days: ${error.message}`
    };
  }
}

/**
 * Unbook days in a specific month
 * @param {string} month - Month in YYYY-MM format
 * @param {string} daysString - Comma-separated list of days
 * @returns {object} - Unbooking confirmation
 */
function unbookDays(month, daysString) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return {
      success: false,
      message: "Invalid month format. Please use YYYY-MM (e.g., 2025-07)."
    };
  }
  
  if (!daysString) {
    return {
      success: false,
      message: "No days specified. Please provide comma-separated days (e.g., 1,2,3)."
    };
  }
  
  try {
    const data = loadAvailabilityData();
    
    // Check if the month exists
    if (!data.availability[month]) {
      return {
        success: false,
        message: `Month ${month} not found in availability data.`
      };
    }
    
    // Parse days to unbook
    const daysToUnbook = daysString.split(',').map(day => parseInt(day.trim(), 10));
    
    // Validate days
    if (daysToUnbook.some(isNaN) || daysToUnbook.some(day => day < 1 || day > 31)) {
      return {
        success: false,
        message: "Invalid day format. Please use numbers between 1 and 31."
      };
    }
    
    // Process unbooking
    const newBookedDays = data.availability[month].booked_days.filter(
      day => !daysToUnbook.includes(day)
    );
    
    const newAvailableDays = [
      ...data.availability[month].available_days,
      ...daysToUnbook.filter(day => !data.availability[month].available_days.includes(day))
    ].sort((a, b) => a - b);
    
    // Update data
    data.availability[month].available_days = newAvailableDays;
    data.availability[month].booked_days = newBookedDays;
    
    // Save updated data
    saveAvailabilityData(data);
    
    return {
      success: true,
      message: `🔒 ADMIN MODE - BOOKING UPDATE 🔒\n\nI've marked the following days as AVAILABLE in ${month}:\n- ${daysToUnbook.join(', ')}\n\nUpdated availability for ${month}:\nAvailable Days: ${newAvailableDays.join(', ')}\nBooked Days: ${newBookedDays.join(', ')}\n\nAvailability file has been updated successfully.`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error unbooking days: ${error.message}`
    };
  }
}

/**
 * Update daily price for a season
 * @param {string} season - Season type (low_season, mid_season, high_season, holiday)
 * @param {string} rateString - New price rate
 * @returns {object} - Price update confirmation
 */
function updatePrice(season, rateString) {
  const validSeasons = ['low_season', 'mid_season', 'high_season', 'holiday'];
  
  if (!season || !validSeasons.includes(season)) {
    return {
      success: false,
      message: `Invalid season. Please use one of: ${validSeasons.join(', ')}`
    };
  }
  
  if (!rateString || isNaN(parseInt(rateString))) {
    return {
      success: false,
      message: "Invalid rate. Please provide a number."
    };
  }
  
  try {
    const data = loadAvailabilityData();
    const rate = parseInt(rateString);
    
    // Update daily rate
    const oldRate = data.pricing.daily[season].rate;
    data.pricing.daily[season].rate = rate;
    
    // Save updated data
    saveAvailabilityData(data);
    
    return {
      success: true,
      message: `🔒 ADMIN MODE - PRICING UPDATE 🔒\n\nDaily rate for ${season} has been updated:\n- Old rate: €${oldRate}\n- New rate: €${rate}\n\nAvailability file has been updated successfully.`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error updating price: ${error.message}`
    };
  }
}

/**
 * Update monthly price for a season
 * @param {string} season - Season type (low_season, mid_season, high_season)
 * @param {string} rateString - New price rate
 * @returns {object} - Price update confirmation
 */
function updateMonthlyPrice(season, rateString) {
  const validSeasons = ['low_season', 'mid_season', 'high_season'];
  
  if (!season || !validSeasons.includes(season)) {
    return {
      success: false,
      message: `Invalid season. Please use one of: ${validSeasons.join(', ')}`
    };
  }
  
  if (!rateString || isNaN(parseInt(rateString))) {
    return {
      success: false,
      message: "Invalid rate. Please provide a number."
    };
  }
  
  try {
    const data = loadAvailabilityData();
    const rate = parseInt(rateString);
    
    // Update monthly rate
    const oldRate = data.pricing.monthly[season].rate;
    data.pricing.monthly[season].rate = rate;
    
    // Save updated data
    saveAvailabilityData(data);
    
    return {
      success: true,
      message: `🔒 ADMIN MODE - PRICING UPDATE 🔒\n\nMonthly rate for ${season} has been updated:\n- Old rate: €${oldRate}\n- New rate: €${rate}\n\nAvailability file has been updated successfully.`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error updating monthly price: ${error.message}`
    };
  }
}

module.exports = {
  processCommand,
  showHelp,
  showAvailability,
  bookDays,
  unbookDays,
  updatePrice,
  updateMonthlyPrice
}; 