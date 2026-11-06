const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Tenant, User, sequelize } = require('../models');

const BCRYPT_ROUNDS = 10;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

class PlatformController {
  // GET /api/platform/tenants
  static async listTenants(req, res, next) {
    try {
      const tenants = await Tenant.findAll({
        attributes: ['id', 'slug', 'name', 'status', 'plan', 'settings', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']],
      });
      res.json({ success: true, tenants });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/platform/tenants/:id
  static async getTenant(req, res, next) {
    try {
      const tenant = await Tenant.findByPk(req.params.id);
      if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

      const adminCount = await User.count({
        where: { tenantId: tenant.id, role: 'admin' },
      });
      const userCount = await User.count({ where: { tenantId: tenant.id } });

      res.json({
        success: true,
        tenant,
        stats: { adminCount, userCount },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/platform/tenants
  // Body: { slug, name, plan?, settings?, admin: { email, password, name, username? } }
  static async createTenant(req, res, next) {
    const { slug, name, plan, settings, admin } = req.body;

    if (!slug || !name) {
      return res.status(400).json({ message: 'slug and name are required' });
    }
    if (!SLUG_RE.test(slug)) {
      return res.status(400).json({
        message: 'slug must be 2-63 chars, letters/digits/hyphens, DNS-safe',
      });
    }
    if (!admin || !admin.email || !admin.password || !admin.name) {
      return res.status(400).json({
        message: 'admin.email, admin.password, admin.name are required',
      });
    }

    try {
      const result = await sequelize.transaction(async (t) => {
        const opts = { transaction: t };

        const existingSlug = await Tenant.findOne({
          where: { slug: slug.toLowerCase() },
          ...opts,
        });
        if (existingSlug) {
          const err = new Error('slug already taken');
          err.status = 409;
          throw err;
        }

        const existingEmail = await User.findOne({
          where: { email: admin.email.toLowerCase().trim() },
          ...opts,
        });
        if (existingEmail) {
          const err = new Error('admin email already in use');
          err.status = 409;
          throw err;
        }

        const tenant = await Tenant.create({
          slug: slug.toLowerCase().trim(),
          name: name.trim(),
          plan: plan || 'basic',
          settings: settings || {},
          status: 'active',
        }, opts);

        const passwordHash = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);
        const tenantAdmin = await User.create({
          tenantId: tenant.id,
          email: admin.email.toLowerCase().trim(),
          username: admin.username ? admin.username.toLowerCase().trim() : null,
          passwordHash,
          name: admin.name.trim(),
          phone: admin.phone || null,
          role: 'admin',
        }, opts);

        return { tenant, tenantAdmin };
      });

      res.status(201).json({
        success: true,
        tenant: {
          id: result.tenant.id,
          slug: result.tenant.slug,
          name: result.tenant.name,
          status: result.tenant.status,
          plan: result.tenant.plan,
        },
        admin: {
          id: result.tenantAdmin.id,
          email: result.tenantAdmin.email,
          name: result.tenantAdmin.name,
          role: result.tenantAdmin.role,
        },
      });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  }

  // PATCH /api/platform/tenants/:id
  // Body: { name?, status?, plan?, settings? }
  static async updateTenant(req, res, next) {
    try {
      const tenant = await Tenant.findByPk(req.params.id);
      if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

      const { name, status, plan, settings } = req.body;
      const patch = {};
      if (name !== undefined) patch.name = name;
      if (status !== undefined) {
        if (!['active', 'suspended', 'trial'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status' });
        }
        patch.status = status;
      }
      if (plan !== undefined) patch.plan = plan;
      if (settings !== undefined) patch.settings = { ...tenant.settings, ...settings };

      await tenant.update(patch);
      res.json({ success: true, tenant });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/platform/tenants/:id/admins
  // Body: { email, password, name, username? }
  static async addTenantAdmin(req, res, next) {
    try {
      const tenant = await Tenant.findByPk(req.params.id);
      if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

      const { email, password, name, username, phone } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ message: 'email, password, name are required' });
      }

      const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
      if (existing) {
        return res.status(409).json({ message: 'email already in use' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const admin = await User.create({
        tenantId: tenant.id,
        email: email.toLowerCase().trim(),
        username: username ? username.toLowerCase().trim() : null,
        passwordHash,
        name: name.trim(),
        phone: phone || null,
        role: 'admin',
      });

      res.status(201).json({
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          tenantId: admin.tenantId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PlatformController;