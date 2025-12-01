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
        // requestAmount is what customer wants to pay (their desired total)
        // totalAmount = requestAmount (what customer will pay)
        // discount amount = budget - requestAmount
        const shipment = await Shipment.findByPk(dr.shipmentId, { transaction: t });
        if (!shipment) throw Object.assign(new Error('Related shipment not found'), { status: 404 });
        
        // Ensure budget exists and is valid
        if (!shipment.budget || parseFloat(shipment.budget) <= 0) {
          throw Object.assign(new Error('Shipment budget is not set or invalid'), { status: 400 });
        }
        
        // Store original budget to ensure it's not changed
        const originalBudget = parseFloat(shipment.budget);
        const requestAmount = parseFloat(dr.requestAmount);
        
        // Validate: requestAmount should be less than or equal to budget
        if (requestAmount > originalBudget) {
          throw Object.assign(new Error('Requested amount cannot exceed admin budget'), { status: 400 });
        }
        
        if (requestAmount <= 0) {
          throw Object.assign(new Error('Requested amount must be greater than 0'), { status: 400 });
        }
        
        // IMPORTANT: Only update totalAmount, NEVER update budget
        // Use raw SQL to ensure ONLY totalAmount is updated, budget is NEVER touched
        // This prevents any hooks or model logic from accidentally modifying budget
        const [updateResult] = await sequelize.query(
          `UPDATE "Shipments" SET "totalAmount" = :totalAmount, "updatedAt" = NOW() WHERE "id" = :shipmentId`,
          {
            replacements: { 
              totalAmount: requestAmount,
              shipmentId: shipment.id 
            },
            transaction: t,
            type: sequelize.QueryTypes.UPDATE
          }
        );
        
        // Reload to verify budget was not changed (safety check)
        await shipment.reload({ transaction: t });
        const currentBudget = parseFloat(shipment.budget);
        if (Math.abs(currentBudget - originalBudget) > 0.01) { // Allow for floating point precision
          throw Object.assign(new Error(`Budget was unexpectedly modified from ${originalBudget} to ${currentBudget}. Rolling back transaction.`), { status: 500 });
        }
        
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
