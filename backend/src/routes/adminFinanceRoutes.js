const router = require('express').Router();
const financeController = require('../controllers/financeController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);
router.use(roleCheck('admin'));

// Категории
router.get('/categories', financeController.getCategories);
router.post('/categories', financeController.createCategory);
router.patch('/categories/:id', financeController.updateCategory);
router.delete('/categories/:id', financeController.deleteCategory);

// Операции
router.get('/transactions', financeController.getTransactions);
router.post('/transactions', financeController.createTransaction);
router.patch('/transactions/:id', financeController.updateTransaction);
router.delete('/transactions/:id', financeController.deleteTransaction);

// Аналитика
router.get('/summary', financeController.getSummary);

// Начисления и оплаты родителей
router.get('/debts', financeController.getDebts);
router.post('/charges/generate', financeController.generateCharges);
router.get('/payments', financeController.getPayments);
router.post('/payments', financeController.createPayment);
router.delete('/payments/:id', financeController.deletePayment);

// Зарплата
router.post('/salary/generate', financeController.generateSalary);

module.exports = router;
