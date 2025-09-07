const { User, Shipment, Vehicle } = require('../../models/index');

exports.listUsers = async (_req, res, next) => {
  try {
    const users = await User.findAll({ attributes: ['id','name','email','role','isApproved','createdAt'] });
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
