#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const AVAILABILITY_FILE_PATH = path.join(__dirname, '..', 'knowledge', 'availability.json');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to load the current availability data
function loadAvailabilityData() {
  try {
    const fileData = fs.readFileSync(AVAILABILITY_FILE_PATH, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error('Error loading availability data:', error.message);
    process.exit(1);
  }
}

// Function to save updated availability data
function saveAvailabilityData(data) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(AVAILABILITY_FILE_PATH, jsonString);
    console.log('✅ Availability data updated successfully!');
    console.log(`File saved to: ${AVAILABILITY_FILE_PATH}`);
  } catch (error) {
    console.error('Error saving availability data:', error.message);
  }
}

// Function to display the main menu
function displayMainMenu() {
  console.log('\n==== Santa Maria Apartment Booking Management ====');
  console.log('1. View current availability');
  console.log('2. Add a new booking (mark days as unavailable)');
  console.log('3. Cancel a booking (mark days as available)');
  console.log('4. Update pricing information');
  console.log('5. Update booking policies');
  console.log('6. Exit');
  
  rl.question('\nSelect an option (1-6): ', (answer) => {
    switch (answer) {
      case '1':
        viewAvailability();
        break;
      case '2':
        addBooking();
        break;
      case '3':
        cancelBooking();
        break;
      case '4':
        updatePricing();
        break;
      case '5':
        updateBookingPolicies();
        break;
      case '6':
        console.log('Exiting program. Goodbye!');
        rl.close();
        break;
      default:
        console.log('Invalid option. Please try again.');
        displayMainMenu();
    }
  });
}

// Function to view current availability
function viewAvailability() {
  const data = loadAvailabilityData();
  
  console.log('\n==== Current Availability ====');
  
  for (const month in data.availability) {
    console.log(`\n${month}:`);
    console.log(`  Available days: ${data.availability[month].available_days.join(', ')}`);
    console.log(`  Booked days: ${data.availability[month].booked_days.join(', ')}`);
  }
  
  rl.question('\nPress Enter to return to the main menu...', () => {
    displayMainMenu();
  });
}

// Function to add a new booking
function addBooking() {
  const data = loadAvailabilityData();
  
  rl.question('\nEnter month (YYYY-MM format, e.g., 2025-07): ', (month) => {
    if (!data.availability[month]) {
      console.log(`Month ${month} not found in availability data. Creating new entry.`);
      data.availability[month] = {
        available_days: Array.from({length: 31}, (_, i) => i + 1),
        booked_days: []
      };
    }
    
    rl.question('Enter days to book (comma-separated, e.g., 5,6,7,8): ', (daysInput) => {
      try {
        const daysToBook = daysInput.split(',').map(day => parseInt(day.trim(), 10));
        
        // Validate input
        if (daysToBook.some(isNaN)) {
          throw new Error('Invalid day format. Please use numbers only.');
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
        data.updated = new Date().toISOString().split('T')[0];
        
        // Save updated data
        saveAvailabilityData(data);
        
        rl.question('\nPress Enter to return to the main menu...', () => {
          displayMainMenu();
        });
      } catch (error) {
        console.error('Error processing booking:', error.message);
        rl.question('\nPress Enter to try again...', () => {
          addBooking();
        });
      }
    });
  });
}

// Function to cancel a booking
function cancelBooking() {
  const data = loadAvailabilityData();
  
  rl.question('\nEnter month (YYYY-MM format, e.g., 2025-07): ', (month) => {
    if (!data.availability[month]) {
      console.log(`Month ${month} not found in availability data.`);
      rl.question('\nPress Enter to return to the main menu...', () => {
        displayMainMenu();
      });
      return;
    }
    
    console.log(`Currently booked days for ${month}: ${data.availability[month].booked_days.join(', ')}`);
    
    rl.question('Enter days to cancel booking (comma-separated, e.g., 5,6,7,8): ', (daysInput) => {
      try {
        const daysToCancel = daysInput.split(',').map(day => parseInt(day.trim(), 10));
        
        // Validate input
        if (daysToCancel.some(isNaN)) {
          throw new Error('Invalid day format. Please use numbers only.');
        }
        
        // Process cancellation
        const newBookedDays = data.availability[month].booked_days.filter(
          day => !daysToCancel.includes(day)
        );
        
        const newAvailableDays = [
          ...data.availability[month].available_days,
          ...daysToCancel.filter(day => !data.availability[month].available_days.includes(day))
        ].sort((a, b) => a - b);
        
        // Update data
        data.availability[month].available_days = newAvailableDays;
        data.availability[month].booked_days = newBookedDays;
        data.updated = new Date().toISOString().split('T')[0];
        
        // Save updated data
        saveAvailabilityData(data);
        
        rl.question('\nPress Enter to return to the main menu...', () => {
          displayMainMenu();
        });
      } catch (error) {
        console.error('Error processing cancellation:', error.message);
        rl.question('\nPress Enter to try again...', () => {
          cancelBooking();
        });
      }
    });
  });
}

// Function to update pricing information
function updatePricing() {
  const data = loadAvailabilityData();
  
  console.log('\n==== Update Pricing Information ====');
  console.log('1. Update daily rates');
  console.log('2. Update monthly rates');
  console.log('3. Update discounts');
  console.log('4. Update extra fees');
  console.log('5. Return to main menu');
  
  rl.question('\nSelect an option (1-5): ', (answer) => {
    switch (answer) {
      case '1':
        updateDailyRates(data);
        break;
      case '2':
        updateMonthlyRates(data);
        break;
      case '3':
        updateDiscounts(data);
        break;
      case '4':
        updateExtraFees(data);
        break;
      case '5':
        displayMainMenu();
        break;
      default:
        console.log('Invalid option. Please try again.');
        updatePricing();
    }
  });
}

// Function to update daily rates
function updateDailyRates(data) {
  console.log('\n==== Current Daily Rates ====');
  for (const season in data.pricing.daily) {
    console.log(`${season}: €${data.pricing.daily[season].rate} (${data.pricing.daily[season].description})`);
  }
  
  rl.question('\nWhich season would you like to update? (low_season/mid_season/high_season/holiday): ', (season) => {
    if (!data.pricing.daily[season]) {
      console.log('Invalid season. Please try again.');
      updateDailyRates(data);
      return;
    }
    
    rl.question(`Enter new rate for ${season} (current: €${data.pricing.daily[season].rate}): `, (rateInput) => {
      const rate = parseInt(rateInput.trim(), 10);
      
      if (isNaN(rate)) {
        console.log('Invalid rate. Please enter a number.');
        updateDailyRates(data);
        return;
      }
      
      data.pricing.daily[season].rate = rate;
      data.updated = new Date().toISOString().split('T')[0];
      
      saveAvailabilityData(data);
      
      rl.question('\nPress Enter to return to the pricing menu...', () => {
        updatePricing();
      });
    });
  });
}

// Function to update monthly rates
function updateMonthlyRates(data) {
  console.log('\n==== Current Monthly Rates ====');
  for (const season in data.pricing.monthly) {
    console.log(`${season}: €${data.pricing.monthly[season].rate} (${data.pricing.monthly[season].description})`);
  }
  
  rl.question('\nWhich season would you like to update? (low_season/mid_season/high_season): ', (season) => {
    if (!data.pricing.monthly[season]) {
      console.log('Invalid season. Please try again.');
      updateMonthlyRates(data);
      return;
    }
    
    rl.question(`Enter new rate for ${season} (current: €${data.pricing.monthly[season].rate}): `, (rateInput) => {
      const rate = parseInt(rateInput.trim(), 10);
      
      if (isNaN(rate)) {
        console.log('Invalid rate. Please enter a number.');
        updateMonthlyRates(data);
        return;
      }
      
      data.pricing.monthly[season].rate = rate;
      data.updated = new Date().toISOString().split('T')[0];
      
      saveAvailabilityData(data);
      
      rl.question('\nPress Enter to return to the pricing menu...', () => {
        updatePricing();
      });
    });
  });
}

// Function to update discounts
function updateDiscounts(data) {
  console.log('\n==== Current Discounts ====');
  for (const discount in data.pricing.discounts) {
    console.log(`${discount}: ${data.pricing.discounts[discount].percentage}% (${data.pricing.discounts[discount].description})`);
  }
  
  rl.question('\nWhich discount would you like to update? (early_bird/extended_stay/digital_nomad): ', (discount) => {
    if (!data.pricing.discounts[discount]) {
      console.log('Invalid discount. Please try again.');
      updateDiscounts(data);
      return;
    }
    
    rl.question(`Enter new percentage for ${discount} (current: ${data.pricing.discounts[discount].percentage}%): `, (percentageInput) => {
      const percentage = parseInt(percentageInput.trim(), 10);
      
      if (isNaN(percentage)) {
        console.log('Invalid percentage. Please enter a number.');
        updateDiscounts(data);
        return;
      }
      
      data.pricing.discounts[discount].percentage = percentage;
      data.updated = new Date().toISOString().split('T')[0];
      
      saveAvailabilityData(data);
      
      rl.question('\nPress Enter to return to the pricing menu...', () => {
        updatePricing();
      });
    });
  });
}

// Function to update extra fees
function updateExtraFees(data) {
  console.log('\n==== Current Extra Fees ====');
  console.log(`Cleaning fee: €${data.pricing.extras.cleaning_fee}`);
  console.log(`Tourist tax: €${data.pricing.extras.tourist_tax} (${data.pricing.extras.tourist_tax_description})`);
  
  console.log('\n1. Update cleaning fee');
  console.log('2. Update tourist tax');
  console.log('3. Return to pricing menu');
  
  rl.question('\nSelect an option (1-3): ', (answer) => {
    switch (answer) {
      case '1':
        rl.question(`Enter new cleaning fee (current: €${data.pricing.extras.cleaning_fee}): `, (feeInput) => {
          const fee = parseInt(feeInput.trim(), 10);
          
          if (isNaN(fee)) {
            console.log('Invalid fee. Please enter a number.');
            updateExtraFees(data);
            return;
          }
          
          data.pricing.extras.cleaning_fee = fee;
          data.updated = new Date().toISOString().split('T')[0];
          
          saveAvailabilityData(data);
          
          rl.question('\nPress Enter to return to the extra fees menu...', () => {
            updateExtraFees(data);
          });
        });
        break;
      case '2':
        rl.question(`Enter new tourist tax (current: €${data.pricing.extras.tourist_tax}): `, (taxInput) => {
          const tax = parseInt(taxInput.trim(), 10);
          
          if (isNaN(tax)) {
            console.log('Invalid tax. Please enter a number.');
            updateExtraFees(data);
            return;
          }
          
          data.pricing.extras.tourist_tax = tax;
          data.updated = new Date().toISOString().split('T')[0];
          
          saveAvailabilityData(data);
          
          rl.question('\nPress Enter to return to the extra fees menu...', () => {
            updateExtraFees(data);
          });
        });
        break;
      case '3':
        updatePricing();
        break;
      default:
        console.log('Invalid option. Please try again.');
        updateExtraFees(data);
    }
  });
}

// Function to update booking policies
function updateBookingPolicies() {
  const data = loadAvailabilityData();
  
  console.log('\n==== Update Booking Policies ====');
  console.log('1. Update check-in/check-out times');
  console.log('2. Update payment policies');
  console.log('3. Update cancellation policies');
  console.log('4. Update contact information');
  console.log('5. Return to main menu');
  
  rl.question('\nSelect an option (1-5): ', (answer) => {
    switch (answer) {
      case '1':
        updateCheckInOut(data);
        break;
      case '2':
        updatePaymentPolicies(data);
        break;
      case '3':
        updateCancellationPolicies(data);
        break;
      case '4':
        updateContactInfo(data);
        break;
      case '5':
        displayMainMenu();
        break;
      default:
        console.log('Invalid option. Please try again.');
        updateBookingPolicies();
    }
  });
}

// Function to update check-in/check-out times
function updateCheckInOut(data) {
  console.log(`\nCurrent check-in time: ${data.booking_policies.check_in}`);
  console.log(`Current check-out time: ${data.booking_policies.check_out}`);
  
  rl.question('\nEnter new check-in time (e.g., "3:00 PM - 8:00 PM"): ', (checkInTime) => {
    data.booking_policies.check_in = checkInTime;
    
    rl.question('Enter new check-out time (e.g., "By 11:00 AM"): ', (checkOutTime) => {
      data.booking_policies.check_out = checkOutTime;
      data.updated = new Date().toISOString().split('T')[0];
      
      saveAvailabilityData(data);
      
      rl.question('\nPress Enter to return to the booking policies menu...', () => {
        updateBookingPolicies();
      });
    });
  });
}

// Function to update payment policies
function updatePaymentPolicies(data) {
  console.log(`\nCurrent deposit: ${data.booking_policies.payment.deposit}`);
  console.log(`Current balance: ${data.booking_policies.payment.balance}`);
  
  rl.question('\nEnter new deposit policy (e.g., "30% at time of booking"): ', (deposit) => {
    data.booking_policies.payment.deposit = deposit;
    
    rl.question('Enter new balance policy (e.g., "Due 30 days before arrival"): ', (balance) => {
      data.booking_policies.payment.balance = balance;
      data.updated = new Date().toISOString().split('T')[0];
      
      saveAvailabilityData(data);
      
      rl.question('\nPress Enter to return to the booking policies menu...', () => {
        updateBookingPolicies();
      });
    });
  });
}

// Function to update cancellation policies
function updateCancellationPolicies(data) {
  console.log('\n==== Current Cancellation Policies ====');
  for (const policy in data.booking_policies.cancellation) {
    console.log(`${policy}: ${data.booking_policies.cancellation[policy].description}`);
    console.log(`   Applies to: ${data.booking_policies.cancellation[policy].applies_to}`);
  }
  
  rl.question('\nWhich policy would you like to update? (flexible/moderate/strict): ', (policy) => {
    if (!data.booking_policies.cancellation[policy]) {
      console.log('Invalid policy. Please try again.');
      updateCancellationPolicies(data);
      return;
    }
    
    rl.question(`Enter new description for ${policy} policy: `, (description) => {
      data.booking_policies.cancellation[policy].description = description;
      
      rl.question(`Enter when this policy applies (e.g., "Low season bookings"): `, (appliesTo) => {
        data.booking_policies.cancellation[policy].applies_to = appliesTo;
        data.updated = new Date().toISOString().split('T')[0];
        
        saveAvailabilityData(data);
        
        rl.question('\nPress Enter to return to the booking policies menu...', () => {
          updateBookingPolicies();
        });
      });
    });
  });
}

// Function to update contact information
function updateContactInfo(data) {
  console.log('\n==== Current Contact Information ====');
  console.log(`Name: ${data.contact_for_booking.name}`);
  console.log(`Email: ${data.contact_for_booking.email}`);
  console.log(`Phone: ${data.contact_for_booking.phone}`);
  
  rl.question('\nEnter new contact name: ', (name) => {
    data.contact_for_booking.name = name;
    
    rl.question('Enter new contact email: ', (email) => {
      data.contact_for_booking.email = email;
      
      rl.question('Enter new contact phone: ', (phone) => {
        data.contact_for_booking.phone = phone;
        data.updated = new Date().toISOString().split('T')[0];
        
        saveAvailabilityData(data);
        
        rl.question('\nPress Enter to return to the booking policies menu...', () => {
          updateBookingPolicies();
        });
      });
    });
  });
}

// Start the program
console.log('\n🏠 Santa Maria Apartment Booking Management System 🏠');
console.log('This tool allows property managers to update availability and pricing information.');
displayMainMenu();

// Handle program exit
rl.on('close', () => {
  console.log('\nThank you for using the Booking Management System!');
  process.exit(0);
}); 