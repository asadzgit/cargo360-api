const { Review, Shipment } = require('../../models/index');

exports.create = async (req, res, next) => {
  try {
    const { rating, comment, toUserId } = req.body;
    const shipmentId = req.params.id;

    // Ensure shipment delivered and user participated
    const shipment = await Shipment.findByPk(shipmentId);
    if (!shipment || shipment.status !== 'delivered') {
      return next(Object.assign(new Error('Can only review delivered shipment'), { status: 400 }));
    }
    const me = req.user.id;
    const involved = me === shipment.customerId || me === shipment.truckerId;
    if (!involved) return next(Object.assign(new Error('Forbidden'), { status: 403 }));

    const review = await Review.create({
      shipmentId,
      reviewerId: me,
      revieweeId: toUserId,
      rating,
      comment
    });
    res.status(201).json({ review });
  } catch (e) { next(e); }
};
