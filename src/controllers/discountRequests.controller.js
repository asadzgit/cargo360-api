const { DiscountRequest, Shipment, sequelize } = require('../../models');
const { createDiscountRequestSchema, decideDiscountRequestSchema } = require('../validation/discountRequests.schema');

// POST /shipments/:id/discount-request (customer)
exports.createForShipment = async (req, res, next) => {
  try {
    const shipmentId = parseInt(req.params.id, 10);
    const { requestAmount } = await createDiscountRequestSchema.validateAsync(req.body);

    // Verify shipment belongs to the requesting customer
    const shipment = await Shipment.findOne({ where: { id: shipmentId, customerId: req.user.id } });
    if (!shipment) return next(Object.assign(new Error('Shipment not found or unauthorized'), { status: 404 }));

    // Enforce one-to-one constraint at application level too
    const existing = await DiscountRequest.findOne({ where: { shipmentId } });
    if (existing) return next(Object.assign(new Error('Discount request already exists for this shipment'), { status: 409 }));

    const dr = await DiscountRequest.create({ shipmentId, requestAmount, status: 'pending' });
    return res.status(201).json({ success: true, message: 'Discount request created', data: { discountRequest: dr } });
  } catch (e) { next(e); }
};

// PATCH /discount-requests/:id (admin-only)
exports.decide = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const actingUserId = req.user?.id ?? -1;
  try {
    const { action } = await decideDiscountRequestSchema.validateAsync(req.body);

    // Use a transaction when accepting to also update shipment budget atomically
    const result = await sequelize.transaction(async (t) => {
      const dr = await DiscountRequest.findByPk(id, { transaction: t });
      if (!dr) throw Object.assign(new Error('Discount request not found'), { status: 404 });
      if (dr.status !== 'pending') {
        throw Object.assign(new Error('Discount request is already decided'), { status: 409 });
      }

      if (action === 'accept') {
        // Update shipment budget to requestAmount
        const shipment = await Shipment.findByPk(dr.shipmentId, { transaction: t });
        if (!shipment) throw Object.assign(new Error('Related shipment not found'), { status: 404 });
        await shipment.update({ budget: dr.requestAmount }, { transaction: t, userId: actingUserId });
        await dr.update({ status: 'accepted' }, { transaction: t });
      } else if (action === 'reject') {
        await dr.update({ status: 'rejected' }, { transaction: t });
      }

      return dr;
    });

    // Refetch with latest state
    const updated = await DiscountRequest.findByPk(result.id);
    return res.json({ success: true, message: 'Decision recorded', data: { discountRequest: updated } });
  } catch (e) { next(e); }
};
