/**
 * Formats a date to dd/mm/yyyy format
 * @param {Date|string} date - Date object or date string (YYYY-MM-DD)
 * @returns {string|null} - Formatted date string in dd/mm/yyyy format or null if date is invalid
 */
const formatDateToDDMMYYYY = (date) => {
  if (!date) return null;
  
  let dateObj;
  
  // If it's a string in YYYY-MM-DD format, parse it
  if (typeof date === 'string') {
    dateObj = new Date(date + 'T00:00:00'); // Add time to avoid timezone issues
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return null;
  }
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Formats shipment object to include formatted delivery date
 * @param {Object} shipment - Shipment object (plain object or Sequelize instance)
 * @returns {Object} - Shipment object with formatted deliveryDate
 */
const formatShipmentDates = (shipment) => {
  if (!shipment) return shipment;
  
  // Convert to plain object if it's a Sequelize instance
  const shipmentData = shipment.toJSON ? shipment.toJSON() : shipment;
  
  // Format deliveryDate if it exists
  if (shipmentData.deliveryDate) {
    shipmentData.deliveryDate = formatDateToDDMMYYYY(shipmentData.deliveryDate);
  }
  
  return shipmentData;
};

module.exports = {
  formatDateToDDMMYYYY,
  formatShipmentDates
};

