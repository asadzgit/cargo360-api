const { User, Shipment, Vehicle } = require('../../models/index');
const { updateShipmentSchema } = require('../validation/shipments.schema');

exports.listUsers = async (_req, res, next) => {
  try {
    const users = await User.findAll({ attributes: ['id','name','company','email','phone','role','isApproved','createdAt'] });
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
    const shipments = await Shipment.findAll({ order: [['createdAt','DESC']] });
    res.json({ shipments });
  } catch (e) { next(e); }
};

// UPDATE - PUT /admin/shipments/:id (Admin can update any shipment regardless of status)
exports.updateShipment = async (req, res, next) => {
  try {
    const data = await updateShipmentSchema.validateAsync(req.body, { stripUnknown: true });
    
    const shipment = await Shipment.findByPk(req.params.id);
    
    if (!shipment) {
      return next(Object.assign(new Error('Shipment not found'), { status: 404 }));
    }
    
    await shipment.update(data);
    
    const updated = await Shipment.findByPk(shipment.id, {
      include: [
        { model: User, as: 'Customer', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Trucker', attributes: ['id', 'name', 'company', 'phone'] },
        { model: User, as: 'Driver', attributes: ['id', 'name', 'company', 'phone'] }
      ]
    });
    
    res.json({ 
      success: true,
      message: 'Shipment updated successfully by admin',
      data: { shipment: updated }
    });
  } catch (e) { next(e); }
};
