const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const ctrl = require('../controllers/vehicles.controller');

router.post('/', auth, requireRole('trucker'), ctrl.createVehicle);
router.get('/', auth, ctrl.getVehicles);
router.patch('/:id', auth, requireRole('trucker'), ctrl.updateVehicle);
router.delete('/:id', auth, requireRole('trucker'), ctrl.deleteVehicle);

module.exports = router;
