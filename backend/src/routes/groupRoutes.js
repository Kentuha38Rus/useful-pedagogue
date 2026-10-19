const express = require('express');
const groupController = require('../controllers/groupController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const router = express.Router();

router.get('/', auth, groupController.getGroups);
router.get('/teacher', auth, roleCheck('teacher', 'admin'), groupController.getTeacherGroups);
router.get('/:id', auth, groupController.getGroupById);
router.get('/:id/children', auth, roleCheck('teacher', 'admin'), groupController.getGroupChildren);
router.post('/', auth, roleCheck('admin'), validate('createGroup'), groupController.createGroup);
router.put('/:id', auth, roleCheck('admin'), validate('updateGroup'), groupController.updateGroup);
router.delete('/:id', auth, roleCheck('admin'), groupController.deleteGroup);

module.exports = router;