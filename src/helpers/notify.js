const { sendPushNotification } = require('../utils/pushNotifications');
const { DeviceToken, Notification } = require('../../models');

async function sendUserNotification(userId, title, body, data = {}) {
  const tokens = await DeviceToken.findAll({
    where: { userId: userId },
    attributes: ['expoPushToken'],
  });

  const list = tokens.map(t => t.expoPushToken);

  if (list.length > 0) {
    await sendPushNotification(list, title, body, data);
  }

  await Notification.create({
    userId: userId,
    title,
    body,
    data,
  });
}

/**
 * Send shipment update notification to customer
 * @param {Object} shipment - The shipment object with associations
 * @param {Object} options - Options object
 * @param {string} options.updateType - Type of update: 'customer_update', 'admin_update', 'status_change', 'trucker_assigned', 'driver_assigned', 'broker_driver_assigned', 'trucker_accepted', 'confirmed', 'cancelled', 'admin_cancelled'
 * @param {Object} options.changes - Object with changed fields (for admin updates)
 * @param {Object} options.updatedBy - User who made the update (optional)
 */
async function notifyCustomerAboutShipment(shipment, options = {}) {
  if (!shipment || !shipment.customerId) return;

  const { updateType, changes = {}, updatedBy } = options;
  const customerId = shipment.customerId;
  
  let title = 'Shipment Update';
  let body = '';
  const data = {
    type: 'shipment_update',
    shipmentId: shipment.id,
    updateType
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return `Rs. ${parseFloat(amount).toLocaleString('en-PK')}`;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  switch (updateType) {
    case 'customer_update':
      title = 'Shipment Updated';
      body = 'You have successfully updated your shipment details.';
      break;

    case 'admin_update':
      title = 'Admin Updated Your Shipment';
      const changeMessages = [];
      
      if (changes.budget !== undefined) {
        changeMessages.push(`Budget updated to ${formatCurrency(changes.budget)}`);
      }
      if (changes.pickupLocation !== undefined) {
        changeMessages.push('Pickup location updated');
      }
      if (changes.dropLocation !== undefined) {
        changeMessages.push('Drop location updated');
      }
      if (changes.cargoType !== undefined) {
        changeMessages.push('Cargo type updated');
      }
      if (changes.vehicleType !== undefined) {
        changeMessages.push('Vehicle type updated');
      }
      if (changes.deliveryDate !== undefined) {
        changeMessages.push(`Delivery date updated to ${formatDate(changes.deliveryDate)}`);
      }
      if (changes.insurance !== undefined) {
        changeMessages.push(`Insurance ${changes.insurance ? 'enabled' : 'disabled'}`);
      }
      if (changes.salesTax !== undefined) {
        changeMessages.push(`Sales tax ${changes.salesTax ? 'enabled' : 'disabled'}`);
      }
      if (changes.numberOfVehicles !== undefined) {
        changeMessages.push(`Number of vehicles updated to ${changes.numberOfVehicles}`);
      }
      if (changes.clearingAgentNum !== undefined) {
        changeMessages.push('Clearing agent number updated');
      }
      
      if (changeMessages.length > 0) {
        body = `Admin has updated your shipment: ${changeMessages.join(', ')}.`;
      } else {
        body = 'Admin has updated your shipment details.';
      }
      break;

    case 'status_change':
      title = 'Shipment Status Updated';
      const statusMessages = {
        'pending': 'Your shipment is pending approval.',
        'confirmed': 'Your shipment has been confirmed.',
        'accepted': 'Your shipment has been accepted.',
        'picked_up': 'Your shipment has been picked up and is on the way.',
        'in_transit': 'Your shipment is currently in transit.',
        'delivered': 'Your shipment has been delivered successfully.',
        'cancelled': 'Your shipment has been cancelled.'
      };
      body = statusMessages[shipment.status] || `Your shipment status has been updated to ${shipment.status}.`;
      data.status = shipment.status;
      break;

    case 'trucker_assigned':
      title = 'Broker Assigned';
      const truckerName = shipment.Trucker?.name || shipment.Trucker?.company || 'a broker';
      body = `Admin has assigned ${truckerName} as the broker for your shipment.`;
      data.truckerId = shipment.truckerId;
      data.truckerName = truckerName;
      break;

    case 'driver_assigned':
      title = 'Driver Assigned';
      const driverName = shipment.Driver?.name || 'a driver';
      body = `Admin has assigned ${driverName} as the driver for your shipment.`;
      data.driverId = shipment.driverId;
      data.driverName = driverName;
      break;

    case 'broker_driver_assigned':
      title = 'Driver Assigned by Broker';
      const brokerName = shipment.Trucker?.name || shipment.Trucker?.company || 'your broker';
      const assignedDriverName = shipment.Driver?.name || 'a driver';
      body = `${brokerName} has assigned ${assignedDriverName} as the driver for your shipment.`;
      data.truckerId = shipment.truckerId;
      data.truckerName = brokerName;
      data.driverId = shipment.driverId;
      data.driverName = assignedDriverName;
      break;

    case 'trucker_accepted':
      title = 'Broker Accepted Your Shipment';
      const acceptedTruckerName = shipment.Trucker?.name || shipment.Trucker?.company || 'A broker';
      body = `${acceptedTruckerName} has accepted your shipment and will handle the delivery.`;
      data.truckerId = shipment.truckerId;
      data.truckerName = acceptedTruckerName;
      break;

    case 'confirmed':
      title = 'Shipment Confirmed';
      body = 'You have confirmed your shipment. It is now ready for broker assignment.';
      break;

    case 'cancelled':
      title = 'Shipment Cancelled';
      body = 'You have cancelled your shipment.';
      if (shipment.cancelReason) {
        body += ` Reason: ${shipment.cancelReason}`;
      }
      break;

    case 'admin_cancelled':
      title = 'Shipment Cancelled by Admin';
      body = 'Admin has cancelled your shipment.';
      if (shipment.cancelReason) {
        body += ` Reason: ${shipment.cancelReason}`;
      }
      break;

    default:
      title = 'Shipment Updated';
      body = 'Your shipment has been updated.';
  }

  // Send notification (non-blocking)
  try {
    await sendUserNotification(customerId, title, body, data);
  } catch (error) {
    console.error('Failed to send shipment notification:', error);
    // Don't throw - notification failures shouldn't break the request
  }
}

module.exports = { sendUserNotification, notifyCustomerAboutShipment };

