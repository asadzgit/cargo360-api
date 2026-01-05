#!/usr/bin/env node
/**
 * Script to import shipments from the provided data
 * Run this in Render dashboard shell: node scripts/import-shipments.js
 */

'use strict';

require('dotenv').config();

// ============================================================================
// SHIPMENT DATA - Based on the image provided
// ============================================================================
const SHIPMENT_DATA = [
  {
    companyName: 'ATS Synthetic',
    clientName: 'Naseem',
    contactNo: '3234002429',
    pickup: 'SAPTL',
    dropLocation: 'Lahore',
    workDetails: 'کوئی 40 فوٹ، 20 ٹن کا خالی کنٹینر لاہور SAPTL سے کراچی کی ریٹ درکار ہے'
  },
  {
    companyName: 'Makka Madina Paper',
    clientName: 'Hafiz Affaan',
    contactNo: '3204473340',
    pickup: 'Karachi',
    dropLocation: 'Lahore',
    workDetails: 'Commodity: Paper Weight: 30 to 35 ton Pickup: Karachi Drop: Lahore Urdu Bazar'
  },
  {
    companyName: 'Naveed Traders',
    clientName: 'Sadaqat',
    contactNo: '3358316346',
    pickup: 'Guanzhou China',
    dropLocation: 'Peshawar',
    workDetails: 'Commodity: Gamoscope Weight: 1300 kg Pickup: China Guanzhou Drop: Peshawar Ex work'
  },
  {
    companyName: 'Unique Traders',
    clientName: 'Ali',
    contactNo: '3224447644',
    pickup: 'KGTL Port',
    dropLocation: 'Karachi',
    workDetails: 'Commodity: fiberglass Weight: 25 tons Shanghai to karachi 40 HQ'
  },
  {
    companyName: 'Multan Carpet',
    clientName: 'Hamza',
    contactNo: '3034247471',
    pickup: 'BENJN R. VICKERS & SONS LTD. 6 Clarence Road, Leeds, LS10 1ND, United Kingdom Registered in England no. 00130013',
    dropLocation: 'Multan',
    workDetails: 'Commodity : 6 Drums Weight: 1080 kg Pickup : UK Drop: Multan'
  },
  {
    companyName: 'Unique Traders',
    clientName: 'Ali',
    contactNo: '3224447644',
    pickup: 'CHINA Guanzhou',
    dropLocation: 'Lahore',
    workDetails: 'Commodity: fiberglass Weight: 25 tons'
  },
  {
    companyName: 'Lonetex',
    clientName: 'Adnan',
    contactNo: '3248326492',
    pickup: 'Jallu Lahore',
    dropLocation: 'Karachi',
    workDetails: 'Commodity: fiberglass Weight: 25 tons'
  },
  {
    companyName: 'Expeditors',
    clientName: 'Mudassir',
    contactNo: '3004504995',
    pickup: 'Prepacked sundar',
    dropLocation: 'Manghoopeer',
    workDetails: '20 fcl Weight 3 ton Machinery dimensions 7.6 feet x 11 feet'
  },
  {
    companyName: 'Mughal Iron & Steel Industries Limited',
    clientName: 'Musawir',
    contactNo: '4235960841',
    pickup: 'Port Qasim',
    dropLocation: '17 KM Sheikhupura lahore',
    workDetails: 'Commodity: Scrap Weight: 60 ton including container weight Pickup: port qasim Drop: 17 KM Sheikupura Raod lahore.'
  },
  {
    companyName: 'Jallani facade system (JFS)',
    clientName: 'Mudassar',
    contactNo: '0321 7555027',
    pickup: 'Sundar plot no 310',
    dropLocation: 'Islamabad F10',
    workDetails: 'Required 40 Feet Container Material: Aluminium Weight: 16 to 17 ton'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse work details to extract cargo information
 */
function parseWorkDetails(workDetails, pickup, dropLocation) {
  const details = {
    cargoType: 'General Cargo',
    cargoWeight: null,
    vehicleType: 'container_40ft', // default
    cargoSize: null,
    description: workDetails || `${pickup} to ${dropLocation}`
  };

  if (!workDetails || workDetails.trim() === '') {
    return details;
  }

  const workLower = workDetails.toLowerCase();
  
  // Extract commodity/cargo type
  const commodityMatch = workDetails.match(/Commodity:\s*([^\nW]+)/i);
  if (commodityMatch) {
    details.cargoType = commodityMatch[1].trim();
  } else if (workLower.includes('paper')) {
    details.cargoType = 'Paper';
  } else if (workLower.includes('gamoscope')) {
    details.cargoType = 'Gamoscope';
  } else if (workLower.includes('fiberglass')) {
    details.cargoType = 'Fiberglass';
  } else if (workLower.includes('scrap')) {
    details.cargoType = 'Scrap';
  } else if (workLower.includes('aluminium') || workLower.includes('aluminum')) {
    details.cargoType = 'Aluminium';
  } else if (workLower.includes('machinery')) {
    details.cargoType = 'Machinery';
  } else if (workLower.includes('drums')) {
    details.cargoType = 'Drums';
  }

  // Extract weight
  const weightPatterns = [
    /Weight:\s*(\d+(?:\s*to\s*\d+)?)\s*(?:ton|tons|kg|tonne)/i,
    /(\d+(?:\s*to\s*\d+)?)\s*(?:ton|tons|kg|tonne)/i,
    /(\d+)\s*ton/i
  ];
  
  for (const pattern of weightPatterns) {
    const match = workDetails.match(pattern);
    if (match) {
      const weightStr = match[1].replace(/\s+/g, '');
      if (weightStr.includes('to')) {
        const [min, max] = weightStr.split('to').map(w => parseInt(w.trim()));
        details.cargoWeight = Math.round((min + max) / 2); // Use average
      } else {
        details.cargoWeight = parseInt(weightStr);
      }
      
      // Convert kg to tons if needed
      if (workDetails.match(/kg/i) && details.cargoWeight < 1000) {
        details.cargoWeight = Math.ceil(details.cargoWeight / 1000);
      }
      break;
    }
  }

  // Extract container/vehicle type
  if (workLower.includes('40') && (workLower.includes('feet') || workLower.includes('ft') || workLower.includes('hq'))) {
    details.vehicleType = 'container_40ft';
    details.cargoSize = '40ft';
  } else if (workLower.includes('20') && (workLower.includes('feet') || workLower.includes('ft') || workLower.includes('fcl'))) {
    details.vehicleType = 'container_20ft';
    details.cargoSize = '20ft';
  } else if (workLower.includes('fcl')) {
    details.vehicleType = 'container_20ft'; // FCL usually 20ft
    details.cargoSize = '20ft';
  }

  // Build description
  details.description = workDetails.trim();

  return details;
}

/**
 * Normalize pickup location
 */
function normalizePickup(pickup) {
  if (!pickup || pickup.trim() === '') return 'Not specified';
  return pickup.trim();
}

/**
 * Normalize drop location
 */
function normalizeDrop(dropLocation) {
  if (!dropLocation || dropLocation.trim() === '') return 'Not specified';
  return dropLocation.trim();
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function importShipments() {
  try {
    console.log('🚀 Starting shipment import...\n');

    // Load models
    const models = require('../models');
    const { User, Shipment } = models;

    // Find the customer user
    console.log('👤 Looking for customer user...');
    const customer = await User.findOne({
      where: { email: 'omersheikh03@gmail.com' }
    });

    if (!customer) {
      console.error('❌ Error: User with email omersheikh03@gmail.com not found!');
      console.error('   Please ensure this user exists in the database.');
      process.exit(1);
    }

    console.log(`✅ Found customer: ${customer.name} (ID: ${customer.id}, Email: ${customer.email})\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    // Process each shipment
    for (let i = 0; i < SHIPMENT_DATA.length; i++) {
      const row = SHIPMENT_DATA[i];
      
      try {
        // Parse work details
        const parsed = parseWorkDetails(row.workDetails, row.pickup, row.dropLocation);
        
        // Prepare shipment data
        const pickupLocation = normalizePickup(row.pickup);
        const dropLocation = normalizeDrop(row.dropLocation);
        
        // Ensure minimum length for required fields
        if (pickupLocation.length < 5) {
          console.log(`⚠️  Skipping row ${i + 1}: Pickup location too short (${pickupLocation})`);
          skipped++;
          continue;
        }
        
        if (dropLocation.length < 5) {
          console.log(`⚠️  Skipping row ${i + 1}: Drop location too short (${dropLocation})`);
          skipped++;
          continue;
        }

        // Build description with company/client info
        let description = parsed.description;
        if (row.companyName || row.clientName) {
          const infoParts = [];
          if (row.companyName) infoParts.push(`Company: ${row.companyName}`);
          if (row.clientName) infoParts.push(`Client: ${row.clientName}`);
          if (row.contactNo) infoParts.push(`Contact: ${row.contactNo}`);
          if (infoParts.length > 0) {
            description = `${infoParts.join(' | ')}\n\n${description}`;
          }
        }

        // Ensure description meets minimum length requirement (10 chars)
        if (!description || description.trim().length < 10) {
          description = `${pickupLocation} to ${dropLocation}. ${row.workDetails || 'Shipment details to be confirmed.'}`;
        }

        // Create shipment
        const shipmentData = {
          customerId: customer.id,
          pickupLocation: pickupLocation.substring(0, 500), // Ensure max length
          dropLocation: dropLocation.substring(0, 500),
          cargoType: parsed.cargoType.substring(0, 100),
          vehicleType: parsed.vehicleType,
          description: description.substring(0, 1000),
          cargoWeight: parsed.cargoWeight,
          cargoSize: parsed.cargoSize,
          status: 'pending'
        };

        const shipment = await Shipment.create(shipmentData, { userId: customer.id });

        console.log(`✅ Created shipment ${i + 1}: ID ${shipment.id} - ${pickupLocation} → ${dropLocation} (${parsed.cargoType})`);
        created++;

      } catch (error) {
        console.error(`❌ Error creating shipment ${i + 1} (${row.companyName || 'Unknown'}):`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log('='.repeat(50));
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${SHIPMENT_DATA.length}`);
    console.log(`   👤 All shipments linked to: ${customer.name} (${customer.email})`);
    console.log('='.repeat(50) + '\n');

    // Close database connection
    await models.sequelize.close();

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
importShipments();

