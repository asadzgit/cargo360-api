const router = require('express').Router();
const {
  generateUploadSignature,
  save,
  list,
  getById,
  delete: deleteDocument
} = require('../controllers/documents.controller');
const auth = require('../middlewares/auth');

// All routes require authentication
router.use(auth);

router.post('/upload-signature', generateUploadSignature);
router.post('/', save);
router.get('/', list);
router.get('/:id', getById);
router.delete('/:id', deleteDocument);

module.exports = router;

