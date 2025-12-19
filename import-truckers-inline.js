#!/usr/bin/env node
/**
 * Standalone script to import truckers from embedded CSV data
 * Copy-paste this entire script into production shell and run: node import-truckers-inline.js
 */

'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// ============================================================================
// EMBEDDED CSV DATA - Update this section with your trucker data
// ============================================================================
const CSV_DATA = `name,company,phone
Arshad Kashmir,Mak Logistics,92 300 299315
Bilal,BTCL,92 349 1807499
Yousuf,Ali Hassan Cargo,92 306 1265057
Muhammad Amir,Ali Hassan Cargo,923067562441
Dawoud Pthan,Fatima Traders,92 321 9245011
Asmatullah,Niazi Enterprises,92 300 9006205
Saad Tanoli,,92 334 356085
Roshan Niazi,M. Hasnain Enterprises,92 302 4044943
Saim,jiskani Transport,92 304 2104760
Umar Jatt,Umar and shan sons,92 304 1957984
Ghulam Hussain,New Multan Cargo,92 300 3543175
Hakim Sindhi,jiskani Transport,92 322 2675498
Ishtiaq Malik,Malik Brother Enterprises,92 300 3393015
M Saleem ,Al makkah cargo service,92 304 2503683
Malik Ateeq Awan,Malik ateeq enterprises,92 300 0215395
Malik Asghr Awan ,Multan cargo,92 300 0335331
Saif ,New Truck Stand,92 300 2609320
Umair Wazeer ,Sadqabad hazara goods transport,92 301 5407171
Molvi Zahad,Zahid mehmood container service,92 305 1684137
Rana Atif,Ahmad Goods And Transport Company,92 304 0503962
Malik Farid Awan,Hassam enterprises,92 306 2942429
Malik Sharif Awan ,Malik Hassam Enterprises,92 300 2537720
Malik Waqar Local ,Haji Anwar and sons,92 334 2164557
Sufiyan ,Super vehari cargo,92 300 3435039
Nawaz Jatt,Jutt Enterprises,92 311 4957207
Rana Sajjad ,Rajpoot brother Goods,92 300 8540551
Rana Akram ,Jeway pak sahiwal goods,92 302 2379700
Qaisar ,Arain Brothers,92 301 2612612
Malik Aslam Awan ,Malik Hassam Enterprises,92 306 2708726
Malik Faisal Awan,Malik Hassam Enterprises,92 304 2609790
Malik Ehtesham Awan ,Malik Hassam Enterprises,92 327 2515257
Duran ,Duran Enterprises,92 301 2097954
Mian Arif,New Al Makkah Cargo,92 345 8274245
Lal Baaz ,Shandar Mianwali Goods,92 308 7893142
Naveed Khan Niyazi  ,super shandar cargo service,92 300 3611365
Rana Matlob Local ,Matlob Enterprises,92 306 2885275
Maruf Karwan,Karwan Goods,92 306 2295093
Ghulam Mustafa,Rana Cargo Service Karachi,92 300 2362163
Bilal,Super shandaar Mianwali,92 302 1654154
M Doran Ali ,Shandar Sultan,92 301 5990277
Salman Butt ,SJ cargo Port Qasim,92 321 8791687
Rizwan Broker,,92 346 4670970
Rana Muzaffar,Muzaffar brothers,92 300 2962223
Umar Khan ,Shahzaib Logistic Service,92 300 3941633
Data Walay Trailer Service Karachi,Data Waly Trailer Service,92 326 6718786
Ajaz Joya Local ,Pak Al Hassan Goods and Transport,92 314 6323378`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple CSV parser that handles quoted values
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
 * Parse CSV string and return array of objects
 */
function parseCSV(csvString) {
  const lines = csvString.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'));
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
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
    if (values.length < 2) continue;
    
    const name = (values[nameIndex] || '').replace(/^"|"$/g, '');
    const company = companyIndex !== -1 ? ((values[companyIndex] || '').replace(/^"|"$/g, '') || null) : null;
    const phone = (values[phoneIndex] || '').replace(/^"|"$/g, '');
    
    if (!name || !phone) continue;
    
    data.push({ name, company, phone });
  }
  
  return data;
}

/**
 * Normalize phone number to E.164 format
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

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function importTruckers() {
  try {
    console.log('🚀 Starting trucker import...\n');
    
    // Load models
    const models = require('./models');
    const { User } = models;
    
    // Parse CSV data
    console.log('📄 Parsing CSV data...');
    let truckers;
    try {
      truckers = parseCSV(CSV_DATA);
      console.log(`✅ Found ${truckers.length} truckers in CSV\n`);
    } catch (error) {
      console.error('❌ Error parsing CSV:', error.message);
      process.exit(1);
    }
    
    if (truckers.length === 0) {
      console.log('⚠️  No truckers found in CSV data');
      return;
    }
    
    // Hash password for "123456"
    const defaultPassword = '123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    console.log('🔐 Password hash generated for PIN: 123456\n');
    
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
          isEmailVerified: false,
          email: null,
        });
        
        console.log(`✅ Created trucker: ${newUser.name} (ID: ${newUser.id}, Phone: ${newUser.phone})`);
        created++;
        
      } catch (error) {
        console.error(`❌ Error creating trucker ${trucker.name} (${trucker.phone}):`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log('='.repeat(50));
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${truckers.length}`);
    console.log('\n💡 All created truckers can login with PIN: 123456');
    console.log('='.repeat(50) + '\n');
    
    // Close database connection
    await models.sequelize.close();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
importTruckers();

