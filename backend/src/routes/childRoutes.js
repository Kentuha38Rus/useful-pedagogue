const express = require('express');
const childController = require('../controllers/childController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validation');
const router = express.Router();

router.use(auth);

router.get('/', childController.getChildren);
router.post('/', validate('createChild'), childController.createChild);
router.get('/:id', childController.getChildById);
router.patch('/:id', validate('updateChild'), childController.updateChild);
router.delete('/:id', childController.deleteChild);

module.exports = router;