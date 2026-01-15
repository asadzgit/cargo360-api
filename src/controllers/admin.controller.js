const { User, Shipment, Vehicle } = require('../../models/index');
const { updateShipmentSchema } = require('../validation/shipments.schema');
const { formatShipmentDates } = require('../utils/dateFormatter');
const { 
  notifyCustomerAboutShipment,
  notifyTruckerAboutShipment,
  notifyDriverAboutShipment
} = require('../helpers/notify');

exports.listUsers = async (_req, res, next) => {
  try {
    const users = await User.findAll({ attributes: ['id','name','company','email','phone','role','isApproved','isEmailVerified','isPhoneVerified','hasSignedUp','createdAt'] });
    res.json({ users });
  } catch (e) { next(e); }
};

exports.approveTrucker = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'trucker') return next(Object.assign(new Error('Not found'), { status: 404 }));
    await user.update({ isApproved: true });
    res.json({ user });
  } catch (e) { next(e); }
};

exports.listShipments = async (_req, res, next) => {
  try {
    const shipments = await Shipment.findAll({ 
      order: [['createdAt','DESC']]
      // No attributes filter - get all fields including platform
    });
    // Format each shipment and ensure platform is always included
    const formattedShipments = shipments.map(s => {
      const formatted = formatShipmentDates(s);
      // Explicitly get platform from Sequelize instance using getDataValue
      // This ensures we get the actual database value even if null
      const platformValue = s.getDataValue ? s.getDataValue('platform') : s.platform;
      formatted.platform = platformValue !== undefined ? platformValue : null;
      return formatted;
    });
    res.json({ shipments: formattedShipments });
  } catch (e) { next(e); }
};

// UPDATE - PUT /admin/shipments/:id (Admin can update any shipment regardless of status)
exports.updateShipment = async (req, res, next) => {
  try {
    // Extract companyName before validation (it's not part of shipment schema)
    const companyName = req.body.companyName;
    
    const data = await updateShipmentSchema.validateAsync(req.body, { stripUnknown: true });
    
    const shipment = await Shipment.findByPk(req.params.id, {
      include: [{ model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] }]
    });
    
    if (!shipment) {
      return next(Object.assign(new Error('Shipment not found'), { status: 404 }));
    }
    
    // Track what changed for notification
    const changes = {};
    const fieldsToTrack = [
      'budget', 'pickupLocation', 'dropLocation', 'cargoType', 'vehicleType',
      'deliveryDate', 'insurance', 'salesTax', 'numberOfVehicles', 'clearingAgentNum'
    ];
    
    fieldsToTrack.forEach(field => {
      if (data[field] !== undefined && data[field] !== shipment[field]) {
        changes[field] = data[field];
      }
    });
    
    // Update shipment fields
    await shipment.update(data, { userId: req.user.id });
    
    // Update customer company name if provided
    if (companyName !== undefined && companyName !== null) {
      const customer = shipment.Customer;
      if (customer) {
        const oldCompany = customer.company;
        if (companyName.trim() !== oldCompany) {
          await customer.update({ company: companyName.trim() }, { userId: req.user.id });
          changes.companyName = companyName.trim();
        }
      }
    }
    
    const updated = await Shipment.findByPk(shipment.id, {
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Driver', attributes: ['id', 'name', 'company', 'phone'] }
      ]
    });
    
    // Notify all parties about admin update (only if something actually changed)
    if (Object.keys(changes).length > 0) {
      try {
        await notifyCustomerAboutShipment(updated, { 
          updateType: 'admin_update',
          changes 
        });
      } catch (notificationError) {
        console.error('Failed to send customer admin update notification:', notificationError);
      }
      
      try {
        await notifyTruckerAboutShipment(updated, { 
          updateType: 'admin_update'
        });
      } catch (notificationError) {
        console.error('Failed to send trucker admin update notification:', notificationError);
      }
      
      try {
        await notifyDriverAboutShipment(updated, { 
          updateType: 'broker_update'
        });
      } catch (notificationError) {
        console.error('Failed to send driver admin update notification:', notificationError);
      }
    }
    
    res.json({ 
      success: true,
      message: 'Shipment updated successfully by admin',
      data: { shipment: formatShipmentDates(updated) }
    });
  } catch (e) { next(e); }
};
