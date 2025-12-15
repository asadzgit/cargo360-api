const { Shipment, User, ShipmentLocation, DiscountRequest, ShipmentLog, sequelize } = require('../../models/index');
const { 
  createShipmentSchema, 
  updateShipmentSchema, 
  updateStatusSchema, 
  queryShipmentsSchema,
  assignmentSchema,
  cancelShipmentSchema
} = require('../validation/shipments.schema');
const { sendShipmentNotification, sendShipmentConfirmationNotification } = require('../utils/emailService');
const { Op } = require('sequelize');
const { formatShipmentDates } = require('../utils/dateFormatter');
<<<<<<< Updated upstream
const { notifyCustomerAboutShipment } = require('../helpers/notify');
=======
>>>>>>> Stashed changes

// CREATE - POST /shipments
exports.create = async (req, res, next) => {
  try {
    console.log("***********************");
    
    console.log("req.body", req.body);
    
    const data = await createShipmentSchema.validateAsync(req.body, { stripUnknown: true });
    
    console.log("data", data);
    console.log("***********************");
    const shipment = await Shipment.create({
      ...data,
      customerId: req.user.id,
      status: 'pending'
    }, { userId: req.user.id });
    
    // Include customer info in response
    const shipmentWithCustomer = await Shipment.findByPk(shipment.id, {
      include: [{ model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'email', 'phone'] }]
    });
    
    // Send notification emails to team (non-blocking)
    try {
      await sendShipmentNotification(shipmentWithCustomer.toJSON(), shipmentWithCustomer.Customer.toJSON());
    } catch (emailError) {
      console.error('Failed to send shipment notification email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.status(201).json({ 
      success: true,
      message: 'Shipment created successfully',
      data: { shipment: formatShipmentDates(shipmentWithCustomer) }
    });
  } catch (e) { next(e); }
};

// READ - GET /shipments/mine (Customer's shipments)
exports.mineCustomer = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const whereClause = { customerId: req.user.id };
    if (status) whereClause.status = status;
    
    const shipments = await Shipment.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'company', 'phone'] },
        { model: DiscountRequest, as: 'DiscountRequest', attributes: ['id','requestAmount','status'] }
      ],  
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true,
      data: { shipments: shipments.map(s => formatShipmentDates(s)) }
    });
  } catch (e) { next(e); }
};

// READ - GET /shipments/available (Available for truckers)
exports.availableForTruckers = async (req, res, next) => {
  try {
    const { vehicleType } = req.query;
    
    const whereClause = { status: 'pending' };
    if (vehicleType) whereClause.vehicleType = vehicleType;
    
    const shipments = await Shipment.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: DiscountRequest, as: 'DiscountRequest', attributes: ['id','requestAmount','status'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true,
      data: { shipments: shipments.map(s => formatShipmentDates(s)) }
    });
  } catch (e) { next(e); }
};

/**
 * FIRST-COME-FIRST-SERVE ACCEPTANCE (atomic)
 * We prevent double-accept by doing a conditional UPDATE inside a transaction
 * updating only rows with status='pending'.
 */
// UPDATE - POST /shipments/:id/accept (Trucker accepts shipment)
exports.accept = async (req, res, next) => {
  const shipmentId = req.params.id;
  const truckerId = req.user.id;
  
  try {
    await sequelize.transaction(async (t) => {
      const [count] = await Shipment.update(
        { status: 'accepted', truckerId },
        { where: { id: shipmentId, status: 'pending' }, transaction: t, individualHooks: true, userId: req.user.id }
      );

      if (count === 0) {
        throw Object.assign(new Error('Shipment already accepted or not found'), { status: 409 });
      }
    });
    
    const updated = await Shipment.findByPk(shipmentId, {
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'company', 'phone'] },
        { model: DiscountRequest, as: 'DiscountRequest', attributes: ['id','requestAmount','status'] },
      ]
    });
    
    // Notify customer that broker accepted their shipment
    try {
      await notifyCustomerAboutShipment(updated, { updateType: 'trucker_accepted' });
    } catch (notificationError) {
      console.error('Failed to send trucker acceptance notification:', notificationError);
    }
    
    res.json({ 
      success: true,
      message: 'Shipment accepted successfully',
      data: { shipment: formatShipmentDates(updated) }
    });
  } catch (e) { next(e); }
};

// UPDATE - PATCH /shipments/:id/status (Admin updates status)
exports.updateStatus = async (req, res, next) => {
  try {
    const data = await updateStatusSchema.validateAsync(req.body);
    const { status } = data;
    
    const shipment = await Shipment.findOne({
      where: { id: req.params.id }
    });
    
    if (!shipment) {
      return next(Object.assign(new Error('Shipment not found or unauthorized'), { status: 404 }));
    }
    
    const oldStatus = shipment.status;
    await shipment.update({ status }, { userId: req.user.id });
    
    const updated = await Shipment.findByPk(shipment.id, {
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'company', 'phone'] },
        { model: DiscountRequest, as: 'DiscountRequest', attributes: ['id','requestAmount','status'] },
      ]
    });
    
    // Notify customer about status change (only if status actually changed)
    if (oldStatus !== status) {
      try {
        await notifyCustomerAboutShipment(updated, { updateType: 'status_change' });
      } catch (notificationError) {
        console.error('Failed to send status change notification:', notificationError);
      }
    }
    
    res.json({ 
      success: true,
      message: `Shipment status updated to ${status}`,
      data: { shipment: formatShipmentDates(updated) }
    });
  } catch (e) { next(e); }
};

// READ - GET /shipments/mine-trucker (Trucker's shipments)
// Also used for GET /shipments/mine-driver (Driver's shipments)
exports.mineTrucker = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    // Determine filter based on user role
    const whereClause = {};
    if (req.user.role === 'trucker') {
      whereClause.truckerId = req.user.id;
    } else if (req.user.role === 'driver') {
      whereClause.driverId = req.user.id;
    }
    
    if (status) whereClause.status = status;
    
    const shipments = await Shipment.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Driver', attributes: ['id', 'name', 'company', 'phone'] },
        { model: DiscountRequest, as: 'DiscountRequest', attributes: ['id','requestAmount','status'] },
        { 
          model: ShipmentLocation, 
          as: 'Locations',
          limit: 1,
          order: [['timestamp', 'DESC']],
          required: false,
          attributes: ['id', 'latitude', 'longitude', 'accuracy', 'speed', 'heading', 'timestamp']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Format response with current location
    const formattedShipments = shipments.map(shipment => {
      const shipmentData = formatShipmentDates(shipment);
      const currentLocation = shipmentData.Locations && shipmentData.Locations.length > 0 
        ? {
            id: shipmentData.Locations[0].id,
            latitude: parseFloat(shipmentData.Locations[0].latitude),
            longitude: parseFloat(shipmentData.Locations[0].longitude),
            accuracy: shipmentData.Locations[0].accuracy ? parseFloat(shipmentData.Locations[0].accuracy) : null,
            speed: shipmentData.Locations[0].speed ? parseFloat(shipmentData.Locations[0].speed) : null,
            heading: shipmentData.Locations[0].heading ? parseFloat(shipmentData.Locations[0].heading) : null,
            timestamp: shipmentData.Locations[0].timestamp
          }
        : null;
      
      delete shipmentData.Locations;
      return {
        ...shipmentData,
        currentLocation
      };
    });
    
    res.json({ 
      success: true,
      data: { shipments: formattedShipments }
    });
  } catch (e) { next(e); }
};

// UPDATE - PATCH /shipments/:id/cancel (Customer cancels shipment)
exports.cancelByCustomer = async (req, res, next) => {
  try {
    const { cancelReason, cancelledBy } = await cancelShipmentSchema.validateAsync(req.body || {}, { stripUnknown: true });
    const shipment = await Shipment.findOne({
      where: { id: req.params.id, customerId: req.user.id, status: 'pending' }
    });
    
    if (!shipment) {
      return next(Object.assign(new Error('Cannot cancel shipment. It may not exist or already accepted.'), { status: 400 }));
    }
    
    await shipment.update({ 
      status: 'cancelled',
      cancelReason: cancelReason ?? shipment.cancelReason,
      cancelledBy: cancelledBy || 'Customer'
    }, { userId: req.user.id });
    
    const updated = await Shipment.findByPk(shipment.id, {
      include: [{ model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] }]
    });
    
    // Notify customer about cancellation
    try {
      await notifyCustomerAboutShipment(updated, { updateType: 'cancelled' });
    } catch (notificationError) {
      console.error('Failed to send cancellation notification:', notificationError);
    }
    
    res.json({ 
      success: true,
      message: 'Shipment cancelled successfully',
      data: { shipment: formatShipmentDates(updated) }
<<<<<<< Updated upstream
    });
  } catch (e) { next(e); }
};

// UPDATE - PATCH /shipments/:id/confirm (Customer confirms shipment)
exports.confirmByCustomer = async (req, res, next) => {
  try {
    const shipment = await Shipment.findOne({
      where: { id: req.params.id, customerId: req.user.id, status: 'pending' }
    });
    
    if (!shipment) {
      return next(Object.assign(new Error('Cannot confirm shipment. It may not exist, not yours, or already confirmed.'), { status: 400 }));
    }
    
    await shipment.update({ status: 'confirmed' }, { userId: req.user.id });
    
    const updated = await Shipment.findByPk(shipment.id, {
      include: [{ model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'email', 'phone'] }]
    });
    
    // Send notification emails to team (non-blocking)
    try {
      await sendShipmentConfirmationNotification(updated.toJSON(), updated.Customer.toJSON());
    } catch (emailError) {
      console.error('Failed to send shipment confirmation notification email:', emailError);
      // Don't fail the request if email fails
    }
    
    // Notify customer about confirmation
    try {
      await notifyCustomerAboutShipment(updated, { updateType: 'confirmed' });
    } catch (notificationError) {
      console.error('Failed to send confirmation notification:', notificationError);
    }
    
    res.json({ 
      success: true,
      message: 'Shipment confirmed successfully',
      data: { shipment: formatShipmentDates(updated) }
=======
>>>>>>> Stashed changes
    });
  } catch (e) { next(e); }
};

// READ - GET /shipments/:id (Get single shipment)
exports.getById = async (req, res, next) => {
  try {
    const shipment = await Shipment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'company', 'phone'] },
        { model: DiscountRequest, as: 'DiscountRequest', attributes: ['id','requestAmount','status'] },
      ]
    });
    
    if (!shipment) {
      return next(Object.assign(new Error('Shipment not found'), { status: 404 }));
    }
    
    // Check authorization - only customer, trucker, or admin can view
    const isAuthorized = 
      req.user.role === 'admin' ||
      shipment.customerId === req.user.id ||
      shipment.truckerId === req.user.id ||
      shipment.driverId === req.user.id;
    
    if (!isAuthorized) {
      return next(Object.assign(new Error('Unauthorized to view this shipment'), { status: 403 }));
    }
    
    res.json({ 
      success: true,
      data: { shipment: formatShipmentDates(shipment) }
<<<<<<< Updated upstream
    });
  } catch (e) { next(e); }
};

// READ - GET /shipments/:id/logs (Get audit logs for single shipment)
exports.getLogs = async (req, res, next) => {
  try {
    const shipment = await Shipment.findByPk(req.params.id);
    if (!shipment) {
      return next(Object.assign(new Error('Shipment not found'), { status: 404 }));
    }

    const isAuthorized = 
      req.user.role === 'admin' ||
      shipment.customerId === req.user.id ||
      shipment.truckerId === req.user.id ||
      shipment.driverId === req.user.id;

    if (!isAuthorized) {
      return next(Object.assign(new Error('Unauthorized to view this shipment'), { status: 403 }));
    }

    const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 500);
    const logs = await ShipmentLog.findAll({
      where: { shipmentId: shipment.id },
      order: [['createdAt', 'DESC']],
      limit
    });

    res.json({
      success: true,
      data: {
        shipmentId: shipment.id,
        logs
      }
=======
>>>>>>> Stashed changes
    });
  } catch (e) { next(e); }
};

// UPDATE - PUT /shipments/:id (Customer updates shipment - only if pending)
exports.update = async (req, res, next) => {
  try {
    const data = await updateShipmentSchema.validateAsync(req.body, { stripUnknown: true });
    
    const shipment = await Shipment.findOne({
      where: { id: req.params.id, customerId: req.user.id, status: 'pending' }
    });
    
    if (!shipment) {
      return next(Object.assign(new Error('Cannot update shipment. It may not exist, not yours, or already accepted.'), { status: 400 }));
    }
    
    await shipment.update(data, { userId: req.user.id });
    
    const updated = await Shipment.findByPk(shipment.id, {
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: DiscountRequest, as: 'DiscountRequest', attributes: ['id','requestAmount','status'] },
      ]
    });
    
    // Notify customer about their own update
    try {
      await notifyCustomerAboutShipment(updated, { updateType: 'customer_update' });
    } catch (notificationError) {
      console.error('Failed to send customer update notification:', notificationError);
    }
    
    res.json({ 
      success: true,
      message: 'Shipment updated successfully',
      data: { shipment: formatShipmentDates(updated) }
    });
  } catch (e) { next(e); }
};

// DELETE - DELETE /shipments/:id (Admin only - soft delete by setting status to cancelled)
exports.delete = async (req, res, next) => {
  try {
    const shipment = await Shipment.findByPk(req.params.id);
    
    if (!shipment) {
      return next(Object.assign(new Error('Shipment not found'), { status: 404 }));
    }
    
  await shipment.update({ 
    status: 'cancelled',
    cancelReason: typeof req.body?.cancelReason === 'string' && req.body.cancelReason.trim() !== ''
      ? req.body.cancelReason.trim()
      : shipment.cancelReason,
    cancelledBy: 'Super Admin'
  }, { userId: req.user.id });
  
  // Fetch updated shipment with customer info for notification
  const updatedShipment = await Shipment.findByPk(shipment.id, {
    include: [{ model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] }]
  });
  
  // Notify customer about admin cancellation
  try {
    await notifyCustomerAboutShipment(updatedShipment, { updateType: 'admin_cancelled' });
  } catch (notificationError) {
    console.error('Failed to send admin cancellation notification:', notificationError);
  }
    
    res.json({ 
      success: true,
      message: 'Shipment deleted successfully'
    });
  } catch (e) { next(e); }
};

// READ - GET /shipments (Admin - get all shipments)
exports.getAll = async (req, res, next) => {
  try {
    const { status, vehicleType } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (vehicleType) whereClause.vehicleType = vehicleType;
    
    const shipments = await Shipment.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Driver', attributes: ['id', 'name', 'company', 'phone'] },
        { model: DiscountRequest, as: 'DiscountRequest', attributes: ['id','requestAmount','status'] },
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true,
      data: { shipments: shipments.map(s => formatShipmentDates(s)) }
    });
  } catch (e) { next(e); }
};
