const router = require('express').Router();
const PlatformController = require('../controllers/platformController');
const auth = require('../middleware/auth');
const requirePlatformAdmin = require('../middleware/requirePlatformAdmin');

// Все роуты — только для платформенных админов (с учётом реальной роли,
// а не effectiveRole при имперсонации)
router.use(auth);
router.use(requirePlatformAdmin);

router.get('/tenants', PlatformController.listTenants);
router.get('/tenants/:id', PlatformController.getTenant);
router.post('/tenants', PlatformController.createTenant);
router.patch('/tenants/:id', PlatformController.updateTenant);
router.post('/tenants/:id/admins', PlatformController.addTenantAdmin);

module.exports = router;