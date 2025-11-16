/**
 * Converts camelCase field names to human-readable Title Case format
 * @param {string} fieldName - Field name in camelCase (e.g., "dropLocation")
 * @returns {string} Human-readable name (e.g., "Drop Location")
 */
const formatFieldName = (fieldName) => {
  if (!fieldName || typeof fieldName !== 'string') {
    return fieldName;
  }

  // Handle special cases
  const specialCases = {
    'id': 'ID',
    'customerId': 'Customer ID',
    'truckerId': 'Trucker ID',
    'driverId': 'Driver ID',
    'cargoType': 'Cargo Type',
    'cargoWeight': 'Cargo Weight',
    'cargoSize': 'Cargo Size',
    'vehicleType': 'Vehicle Type',
    'numberOfVehicles': 'Number Of Vehicles',
    'pickupLocation': 'Pickup Location',
    'dropLocation': 'Drop Location',
    'deliveryDate': 'Delivery Date',
    'cancelReason': 'Cancel Reason',
    'cancelledBy': 'Cancelled By',
    'salesTax': 'Sales Tax',
    'isApproved': 'Is Approved',
    'isEmailVerified': 'Is Email Verified',
    'isPhoneVerified': 'Is Phone Verified'
  };

  if (specialCases[fieldName]) {
    return specialCases[fieldName];
  }

  // Convert camelCase to Title Case
  // Insert space before capital letters and capitalize first letter
  return fieldName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
};

const serializeValue = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  return value ?? null;
};

const valuesAreEqual = (a, b) => {
  const serializedA = serializeValue(a);
  const serializedB = serializeValue(b);

  if (typeof serializedA === 'object' && typeof serializedB === 'object') {
    return JSON.stringify(serializedA) === JSON.stringify(serializedB);
  }

  return serializedA === serializedB;
};

/**
 * Builds a diff object between previous and current values.
 * @param {Object} previous
 * @param {Object} current
 * @param {Object} options
 * @param {string[]} options.ignore - fields to ignore
 * @param {string[]} options.fields - optional whitelist of fields to inspect
 * @returns {Object} diff - { fieldName: { old, new } }
 */
const buildDiff = (previous = {}, current = {}, options = {}) => {
  const ignore = options.ignore || [];
  const fields = options.fields && options.fields.length
    ? options.fields
    : Array.from(new Set([...Object.keys(previous), ...Object.keys(current)]));

  return fields.reduce((acc, field) => {
    if (ignore.includes(field)) return acc;

    const prevValue = previous[field];
    const currValue = current[field];

    if (valuesAreEqual(prevValue, currValue)) {
      return acc;
    }

    // Use human-readable field name as key
    const readableFieldName = formatFieldName(field);
    acc[readableFieldName] = {
      old: serializeValue(prevValue),
      new: serializeValue(currValue)
    };

    return acc;
  }, {});
};

module.exports = {
  buildDiff,
  serializeValue,
  formatFieldName
};

