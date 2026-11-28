const router = require('express').Router();
const AdminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);
router.use(roleCheck('admin'));

// Статистика
router.get('/stats', AdminController.getStats);

// Настройки центра (часовой пояс и пр.)
router.get('/settings', AdminController.getSettings);
router.patch('/settings', AdminController.updateSettings);

// Уведомления по сегодняшним занятиям (web-push + socket)
router.post('/lessons/notify-today', AdminController.notifyTodayLessons);

// Зарплата
router.get('/salary', AdminController.getSalaryReport);

// Пользователи
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserDetails);
router.patch('/users/:id/role', AdminController.updateUserRole);
router.patch('/users/:id', AdminController.updateUser);
router.post('/users', AdminController.createUser);
router.delete('/users/:id', AdminController.deleteUser);

// Дети и группы (специальные маршруты — до /groups/:id)
router.get('/children/available', AdminController.getAvailableChildren);
router.post('/groups/add-child', AdminController.addChildToGroup);
router.delete('/groups/remove-child', AdminController.removeChildFromGroup);

// Филиалы
router.get('/branches', AdminController.getAllBranches);
router.post('/branches', AdminController.createBranch);
router.patch('/branches/:id', AdminController.updateBranch);
router.delete('/branches/:id', AdminController.deleteBranch);

// Группы
router.get('/groups', AdminController.getAllGroups);
router.get('/groups/:id', AdminController.getGroupDetails);
router.post('/groups', AdminController.createGroup);
router.patch('/groups/:id', AdminController.updateGroup);
router.delete('/groups/:id', AdminController.deleteGroup);

// Чаты
router.post('/chats/broadcast', AdminController.broadcastMessage);

// Занятия: замена преподавателя на конкретную дату
router.patch('/lessons/:id/substitute', AdminController.substituteLessonTeacher);

// Курсы
router.get('/courses', AdminController.getAllCourses);
router.post('/courses', AdminController.createCourse);
router.patch('/courses/:id', AdminController.updateCourse);
router.delete('/courses/:id', AdminController.deleteCourse);

// Платежи (заглушка)
router.get('/payments', AdminController.getPayments);

module.exports = router;