const { Shipment, User } = require('../../models/index');
const { assignmentSchema, assignDriverByBrokerSchema } = require('../validation/shipments.schema');

// ASSIGN - PATCH /shipments/:id/assign (Admin assigns trucker or driver)
exports.assign = async (req, res, next) => {
  try {
    const data = await assignmentSchema.validateAsync(req.body, { stripUnknown: true });
    const shipmentId = req.params.id;
    
    // Find the shipment
    const shipment = await Shipment.findByPk(shipmentId);
    if (!shipment) {
      return next(Object.assign(new Error('Shipment not found'), { status: 404 }));
    }
    
    // Verify the user exists and has the correct role
    const user = await User.findByPk(data.userId);
    if (!user) {
      return next(Object.assign(new Error('User not found'), { status: 404 }));
    }
    
    // Check if user has the correct role for assignment
    if (data.assignment === 'trucker' && user.role !== 'trucker') {
      return next(Object.assign(new Error('User is not a trucker'), { status: 400 }));
    }
    
    if (data.assignment === 'driver' && user.role !== 'driver') {
      return next(Object.assign(new Error('User is not a driver'), { status: 400 }));
    }
    
    // TODO: Add approval check later - for now allow any trucker/driver to be assigned
    // if (data.assignment === 'trucker' && !user.isApproved) {
    //   return next(Object.assign(new Error('Trucker is not approved'), { status: 400 }));
    // }
    
    // Update the shipment with the assignment
    const updateData = {};
    if (data.assignment === 'trucker') {
      updateData.truckerId = data.userId;
      // Keep existing driver assignment if any
    } else if (data.assignment === 'driver') {
      updateData.driverId = data.userId;
      // Keep existing trucker assignment if any
    }
    
    // Update status to accepted if it was pending
    if (shipment.status === 'pending') {
      updateData.status = 'accepted';
    }
    
    await shipment.update(updateData);
    
    // Fetch updated shipment with associations
    const updatedShipment = await Shipment.findByPk(shipmentId, {
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'Driver', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });
    
    res.json({
      success: true,
      message: `Shipment assigned to ${data.assignment} successfully`,
      data: { shipment: updatedShipment }
    });
  } catch (e) { next(e); }
};

// BROKER ASSIGN DRIVER - PATCH /shipments/:id/assign-driver (Trucker assigns their driver)
exports.assignDriverByBroker = async (req, res, next) => {
  try {
    const { driverId } = await assignDriverByBrokerSchema.validateAsync(req.body, { stripUnknown: true });
    const shipmentId = req.params.id;
    const brokerId = req.user?.id;

    // Ensure auth has a broker/trucker user
    if (!brokerId) return next(Object.assign(new Error('Unauthorized'), { status: 401 }));

    // Find shipment and ensure broker has rights: either already assigned to this broker or unassigned
    const shipment = await Shipment.findByPk(shipmentId);
    if (!shipment) return next(Object.assign(new Error('Shipment not found'), { status: 404 }));

    if (shipment.truckerId && shipment.truckerId !== brokerId) {
      return next(Object.assign(new Error('You are not allowed to assign a driver to this shipment'), { status: 403 }));
    }

    // Validate driver belongs to this broker
    const driver = await User.findByPk(driverId);
    if (!driver) return next(Object.assign(new Error('Driver not found'), { status: 404 }));
    if (driver.role !== 'driver') return next(Object.assign(new Error('User is not a driver'), { status: 400 }));
    if (driver.brokerId !== brokerId) return next(Object.assign(new Error('Driver does not belong to your fleet'), { status: 403 }));

    // Set truckerId to broker if not already set
    const updateData = {};
    if (!shipment.truckerId) updateData.truckerId = brokerId;
    updateData.driverId = driverId;

    // Update status to accepted if pending
    if (shipment.status === 'pending') updateData.status = 'accepted';

    await shipment.update(updateData);

    const updatedShipment = await Shipment.findByPk(shipmentId, {
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'Driver', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    res.json({
      success: true,
      message: 'Driver assigned to shipment successfully',
      data: { shipment: updatedShipment }
    });
  } catch (e) { next(e); }
};
