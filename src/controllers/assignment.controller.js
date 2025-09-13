const { Shipment, User } = require('../../models/index');
const { assignmentSchema } = require('../validation/shipments.schema');

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
