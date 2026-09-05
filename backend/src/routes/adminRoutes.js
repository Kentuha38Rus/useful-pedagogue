const router = require('express').Router();
const AdminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Все маршруты требуют аутентификации и роль admin
router.use(auth);
router.use(roleCheck('admin'));

// Статистика
router.get('/stats', AdminController.getStats);

// Пользователи
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserDetails);
router.patch('/users/:id/role', AdminController.updateUserRole);
router.post('/users', AdminController.createUser);
// НОВЫЙ МАРШРУТ: удаление пользователя
router.delete('/users/:id', AdminController.deleteUser);

// Группы
router.get('/groups', AdminController.getAllGroups);
router.post('/groups', AdminController.createGroup);
router.patch('/groups/:id', AdminController.updateGroup);
router.delete('/groups/:id', AdminController.deleteGroup);

// Дети и группы
router.get('/children/available', AdminController.getAvailableChildren);
router.post('/groups/add-child', AdminController.addChildToGroup);
router.delete('/groups/remove-child', AdminController.removeChildFromGroup);

// Курсы
router.get('/courses', AdminController.getAllCourses);
router.post('/courses', AdminController.createCourse);
router.patch('/courses/:id', AdminController.updateCourse);
router.delete('/courses/:id', AdminController.deleteCourse);

// Платежи (заглушка)
router.get('/payments', AdminController.getPayments);

module.exports = router;