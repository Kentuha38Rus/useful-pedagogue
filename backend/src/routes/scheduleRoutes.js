const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const router = express.Router();

router.use(auth);

router.get('/me', scheduleController.getMySchedule);
router.get('/group/:groupId', scheduleController.getGroupSchedule);
router.post('/lessons', roleCheck('admin'), validate('createLesson'), scheduleController.createLesson);
router.patch('/lessons/:id/attendance', roleCheck('teacher', 'admin'), validate('attendance'), scheduleController.markAttendance);

module.exports = router;