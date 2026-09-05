const express = require('express');
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const router = express.Router();

router.get('/', auth, courseController.getCourses);
router.get('/:id', auth, courseController.getCourseById);
router.post('/', auth, roleCheck('admin'), validate('createCourse'), courseController.createCourse);
router.put('/:id', auth, roleCheck('admin'), validate('updateCourse'), courseController.updateCourse);
router.delete('/:id', auth, roleCheck('admin'), courseController.deleteCourse);

module.exports = router;