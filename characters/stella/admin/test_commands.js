#!/usr/bin/env node

const { 
  processCommand, 
  showHelp, 
  showAvailability, 
  bookDays, 
  unbookDays, 
  updatePrice, 
  updateMonthlyPrice 
} = require('./process_commands');

// Test command processing
console.log('\n--- Testing Command Processing ---');

// Test help command
console.log('\n> Testing !help');
const helpResult = processCommand('!help');
console.log(helpResult.message);

// Test availability command
console.log('\n> Testing !avail 2025-07');
const availResult = processCommand('!avail 2025-07');
console.log(availResult.message);

// Test invalid month format
console.log('\n> Testing !avail with invalid month format');
const invalidMonthResult = processCommand('!avail 202507');
console.log(invalidMonthResult.message);

// Test booking days
console.log('\n> Testing !book 2025-10 1,2,3');
const bookResult = processCommand('!book 2025-10 1,2,3');
console.log(bookResult.message);

// Test booking with invalid days
console.log('\n> Testing !book with invalid days');
const invalidDaysResult = processCommand('!book 2025-10 a,b,c');
console.log(invalidDaysResult.message);

// Test unbooking days
console.log('\n> Testing !unbook 2025-10 1,2');
const unbookResult = processCommand('!unbook 2025-10 1,2');
console.log(unbookResult.message);

// Test updating daily price
console.log('\n> Testing !price high_season 160');
const priceResult = processCommand('!price high_season 160');
console.log(priceResult.message);

// Test updating monthly price
console.log('\n> Testing !monthly low_season 1600');
const monthlyResult = processCommand('!monthly low_season 1600');
console.log(monthlyResult.message);

// Test invalid command
console.log('\n> Testing invalid command');
const invalidCommandResult = processCommand('!invalid command');
console.log(invalidCommandResult.message);

// Restore original values
console.log('\n> Restoring original values');
const restorePriceResult = processCommand('!price high_season 150');
console.log(restorePriceResult.message);

const restoreMonthlyResult = processCommand('!monthly low_season 1500');
console.log(restoreMonthlyResult.message);

// Final check of availability
console.log('\n> Final check of availability for 2025-10');
const finalResult = processCommand('!avail 2025-10');
console.log(finalResult.message); 