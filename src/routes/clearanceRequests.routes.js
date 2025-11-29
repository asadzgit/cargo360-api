const router = require('express').Router();
const {
  create,
  list,
  getById,
  update,
  updateStatus,
  delete: deleteRequest
} = require('../controllers/clearanceRequests.controller');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');

// All routes require authentication
router.use(auth);

// Public routes (authenticated users)
router.post('/', create);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', deleteRequest);

// Admin/Moderator only routes
router.put('/:id/status', requireRole('admin'), updateStatus);

module.exports = router;

