const { Shipment, User, sequelize } = require('../../models/index');
const { createShipmentSchema } = require('../validation/shipments.schema');
const { Op } = require('sequelize');

exports.create = async (req, res, next) => {
  try {
    const data = await createShipmentSchema.validateAsync(req.body, { stripUnknown: true });
    const shipment = await Shipment.create({
      ...data,
      customerId: req.user.id,
      status: 'pending'
    });
    // TODO: notify truckers (email/SMS/push) in background
    res.status(201).json({ shipment });
  } catch (e) { next(e); }
};

exports.mineCustomer = async (req, res, next) => {
  try {
    const list = await Shipment.findAll({ where: { customerId: req.user.id }, order: [['createdAt','DESC']] });
    res.json({ shipments: list });
  } catch (e) { next(e); }
};

exports.availableForTruckers = async (req, res, next) => {
  try {
    // For MVP: broadcast all pending; later: filter by vehicleType/region
    const list = await Shipment.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    res.json({ shipments: list });
  } catch (e) { next(e); }
};

/**
 * FIRST-COME-FIRST-SERVE ACCEPTANCE (atomic)
 * We prevent double-accept by doing a conditional UPDATE inside a transaction
 * updating only rows with status='pending'.
 */
exports.accept = async (req, res, next) => {
  const shipmentId = req.params.id;
  const truckerId = req.user.id;
  try {
    await sequelize.transaction(async (t) => {
      // Option A: atomic update where status='pending'
      const [count] = await Shipment.update(
        { status: 'accepted', truckerId },
        { where: { id: shipmentId, status: 'pending' }, transaction: t }
      );

      if (count === 0) {
        throw Object.assign(new Error('Shipment already accepted or not found'), { status: 409 });
      }
    });
    const updated = await Shipment.findByPk(shipmentId);
    res.json({ shipment: updated });
  } catch (e) { next(e); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // picked_up, in_transit, delivered, cancelled
    const shipment = await Shipment.findOne({
      where: { id: req.params.id, truckerId: req.user.id }
    });
    if (!shipment) return next(Object.assign(new Error('Not found'), { status: 404 }));
    const allowed = ['picked_up','in_transit','delivered','cancelled'];
    if (!allowed.includes(status)) return next(Object.assign(new Error('Invalid status'), { status: 400 }));
    await shipment.update({ status });
    res.json({ shipment });
  } catch (e) { next(e); }
};

exports.mineTrucker = async (req, res, next) => {
  try {
    const list = await Shipment.findAll({ where: { truckerId: req.user.id }, order: [['createdAt','DESC']] });
    res.json({ shipments: list });
  } catch (e) { next(e); }
};

exports.cancelByCustomer = async (req, res, next) => {
  try {
    const shipment = await Shipment.findOne({
      where: { id: req.params.id, customerId: req.user.id, status: 'pending' }
    });
    if (!shipment) return next(Object.assign(new Error('Cannot cancel'), { status: 400 }));
    await shipment.update({ status: 'cancelled' });
    res.json({ shipment });
  } catch (e) { next(e); }
};
