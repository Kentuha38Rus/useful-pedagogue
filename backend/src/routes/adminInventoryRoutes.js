const router = require('express').Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);
router.use(roleCheck('admin'));

// Сводка и выгрузка
router.get('/summary', inventoryController.getSummary);
router.get('/export.xlsx', inventoryController.exportXlsx);

// Категории
router.get('/categories', inventoryController.getCategories);
router.post('/categories', inventoryController.createCategory);
router.patch('/categories/:id', inventoryController.updateCategory);
router.delete('/categories/:id', inventoryController.deleteCategory);

// Номенклатура
router.get('/items', inventoryController.getItems);
router.post('/items', inventoryController.createItem);
router.patch('/items/:id', inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

// Экземпляры
router.get('/units', inventoryController.getUnits);
router.post('/units', inventoryController.createUnit);
router.patch('/units/:id', inventoryController.updateUnit);
router.post('/units/:id/transfer', inventoryController.transferUnit);
router.post('/units/:id/write-off', inventoryController.writeOffUnit);
router.post('/units/:id/status', inventoryController.changeUnitStatus);

// Расходники
router.get('/balances', inventoryController.getBalances);
router.post('/balances/receipt', inventoryController.receiptBalance);
router.post('/balances/write-off', inventoryController.writeOffBalance);

// Журнал операций
router.get('/movements', inventoryController.getMovements);
router.get('/movements/:id', inventoryController.getMovement);

// Заявки
router.get('/issues', inventoryController.getIssues);
router.patch('/issues/:id', inventoryController.updateIssue);

module.exports = router;
