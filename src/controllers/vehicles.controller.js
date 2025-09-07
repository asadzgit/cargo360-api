// const { Vehicle } = require('../../models/index');
const { createVehicleSchema } = require('../validation/vehicles.schema');

// exports.create = async (req, res, next) => {
//   try {
//     const data = await createVehicleSchema.validateAsync(req.body, { stripUnknown: true });
//     const vehicle = await Vehicle.create({ ...data, truckerId: req.user.id, status: 'active' });
//     res.status(201).json({ vehicle });
//   } catch (e) { next(e); }
// };

// exports.mine = async (req, res, next) => {
//   try {
//     const list = await Vehicle.findAll({ where: { truckerId: req.user.id } });
//     res.json({ vehicles: list });
//   } catch (e) { next(e); }
// };

// exports.update = async (req, res, next) => {
//   try {
//     const id = req.params.id;
//     const vehicle = await Vehicle.findOne({ where: { id, truckerId: req.user.id } });
//     if (!vehicle) return next(Object.assign(new Error('Not found'), { status: 404 }));
//     await vehicle.update(req.body);
//     res.json({ vehicle });
//   } catch (e) { next(e); }
// };

// exports.remove = async (req, res, next) => {
//   try {
//     const id = req.params.id;
//     const vehicle = await Vehicle.findOne({ where: { id, truckerId: req.user.id } });
//     if (!vehicle) return next(Object.assign(new Error('Not found'), { status: 404 }));
//     await vehicle.destroy();
//     res.json({ ok: true });
//   } catch (e) { next(e); }
// };
const { Vehicle, User } = require('../../models/index');

// Create Vehicle (Trucker only)
exports.createVehicle = async (req, res) => {
  try {
    if (req.user.role !== 'trucker') {
      return res.status(403).json({ error: 'Only truckers can add vehicles' });
    }

    const vehicle = await Vehicle.create({
      ...req.body,
      truckerId: req.user.id
    });

    res.status(201).json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

// Get Vehicles (Trucker: own, Admin: all)
exports.getVehicles = async (req, res) => {
  try {
    let vehicles;
    if (req.user.role === 'admin') {
      vehicles = await Vehicle.findAll({ include: User });
    } else if (req.user.role === 'trucker') {
      vehicles = await Vehicle.findAll({ where: { truckerId: req.user.id } });
    } else {
      return res.status(403).json({ error: 'Not allowed' });
    }
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

// Update Vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (req.user.role !== 'admin' && vehicle.truckerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await vehicle.update(req.body);
    res.json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
};

// Delete Vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (req.user.role !== 'admin' && vehicle.truckerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await vehicle.destroy();
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
};
