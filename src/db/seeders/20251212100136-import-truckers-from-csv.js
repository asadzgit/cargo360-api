'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

/**
 * Simple CSV parser that handles quoted values
 * Expected CSV format: name,company,phone (header row required)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV file and return array of objects
 * Expected CSV format: name,company,phone (header row required)
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'));
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }
  
  const headerLine = parseCSVLine(lines[0]);
  const headers = headerLine.map(h => h.toLowerCase().replace(/"/g, ''));
  const nameIndex = headers.indexOf('name');
  const companyIndex = headers.indexOf('company');
  const phoneIndex = headers.indexOf('phone');
  
  if (nameIndex === -1 || phoneIndex === -1) {
    throw new Error('CSV must have "name" and "phone" columns. "company" is optional.');
  }
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue; // Skip empty lines
    
    const name = (values[nameIndex] || '').replace(/^"|"$/g, '');
    const company = companyIndex !== -1 ? ((values[companyIndex] || '').replace(/^"|"$/g, '') || null) : null;
    const phone = (values[phoneIndex] || '').replace(/^"|"$/g, '');
    
    if (!name || !phone) continue; // Skip rows with missing required fields
    
    data.push({ name, company, phone });
  }
  
  return data;
}

/**
 * Normalize phone number to E.164 format
 * Handles: 0312..., 92312..., +92312...
 */
function normalizePhoneE164(pkPhone) {
  const trimmed = (pkPhone || '').replace(/\s+/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (/^0\d{10}$/.test(trimmed)) {
    return '+92' + trimmed.slice(1);
  }
  if (/^92\d{10}$/.test(trimmed)) {
    return '+' + trimmed;
  }
  return trimmed;
}

/**
 * Generate all phone number variants for lookup
 */
function pkPhoneVariants(input) {
  const pkCore = (msisdn) => {
    const raw = (msisdn || '').replace(/\s+/g, '').replace(/^\+/, '');
    if (/^92\d{10}$/.test(raw)) return raw.slice(2);
    if (/^0\d{10}$/.test(raw)) return raw.slice(1);
    if (/^3\d{9}$/.test(raw)) return raw;
    return raw;
  };
  
  const core = pkCore(input);
  if (!/^\d{10}$/.test(core)) {
    const trimmed = (input || '').replace(/\s+/g, '');
    return Array.from(new Set([trimmed, trimmed.replace(/^\+/, '')]));
  }
  return ['+92' + core, '92' + core, '0' + core];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // Load models
    const models = require('../../../models');
    const { User } = models;
    
    // Path to CSV file - CSV should be in the project root directory
    // You can also place it in the seeders folder: seeders/truckers.csv
    const csvPath = path.join(__dirname, '..', 'truckers.csv');
    const csvPathAlt = path.join(__dirname, 'truckers.csv'); // Also check in seeders folder
    
    // Try project root first, then seeders folder
    const finalCsvPath = fs.existsSync(csvPath) ? csvPath : csvPathAlt;
    
    // Check if CSV file exists
    if (!fs.existsSync(finalCsvPath)) {
      console.log(`⚠️  CSV file not found at: ${csvPath} or ${csvPathAlt}`);
      console.log('Please create a truckers.csv file in the project root or seeders folder with the following format:');
      console.log('name,company,phone');
      console.log('John Doe,ABC Logistics,03123456789');
      console.log('Jane Smith,XYZ Transport,923001234567');
      return;
    }
    
    console.log(`📄 Reading CSV file: ${finalCsvPath}`);
    let truckers;
    try {
      truckers = parseCSV(finalCsvPath);
      console.log(`✅ Found ${truckers.length} truckers in CSV`);
    } catch (error) {
      console.error('❌ Error parsing CSV:', error.message);
      throw error;
    }
    
    if (truckers.length === 0) {
      console.log('⚠️  No truckers found in CSV file');
      return;
    }
    
    // Hash password for "123456"
    const defaultPassword = '123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    console.log('🔐 Password hash generated for PIN: 123456');
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each trucker
    for (const trucker of truckers) {
      try {
        // Validate required fields
        if (!trucker.name || !trucker.phone) {
          console.log(`⚠️  Skipping invalid row: name="${trucker.name}", phone="${trucker.phone}"`);
          skipped++;
          continue;
        }
        
        // Normalize phone number
        const normalizedPhone = normalizePhoneE164(trucker.phone);
        const phoneVariants = pkPhoneVariants(normalizedPhone);
        
        // Check if user with this phone already exists (for trucker role)
        const existingUser = await User.findOne({
          where: {
            phone: { [Op.in]: phoneVariants },
            role: 'trucker'
          }
        });
        
        if (existingUser) {
          console.log(`⏭️  Skipping ${trucker.name} (${trucker.phone}) - already exists as user ID ${existingUser.id}`);
          skipped++;
          continue;
        }
        
        // Check if phone is used by a driver (truckers and drivers can't share phones)
        const driverWithPhone = await User.findOne({
          where: {
            phone: { [Op.in]: phoneVariants },
            role: 'driver'
          }
        });
        
        if (driverWithPhone) {
          console.log(`⚠️  Skipping ${trucker.name} (${trucker.phone}) - phone already used by driver ID ${driverWithPhone.id}`);
          skipped++;
          continue;
        }
        
        // Create new trucker user
        const newUser = await User.create({
          name: trucker.name,
          company: trucker.company || null,
          phone: normalizedPhone,
          passwordHash: passwordHash,
          role: 'trucker',
          isApproved: true,
          isPhoneVerified: true,
          isEmailVerified: false, // No email provided
          email: null, // No email in CSV
          // All other fields will be null/default
        });
        
        console.log(`✅ Created trucker: ${newUser.name} (ID: ${newUser.id}, Phone: ${newUser.phone})`);
        created++;
        
      } catch (error) {
        console.error(`❌ Error creating trucker ${trucker.name} (${trucker.phone}):`, error.message);
        errors++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${truckers.length}`);
    console.log('\n💡 All created truckers can login with PIN: 123456');
  },

  async down(queryInterface, Sequelize) {
    // This seed is idempotent and safe to run multiple times
    // We don't delete users in down migration to prevent accidental data loss
    console.log('⚠️  Down migration not implemented - this seed is idempotent and safe to run multiple times');
    console.log('   To remove users, do it manually or create a separate cleanup script');
  }
};
