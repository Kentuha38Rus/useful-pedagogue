const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChildGroup = sequelize.define('ChildGroup', {
    childId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'Children', key: 'id' },
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'Groups', key: 'id' },
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    timestamps: true,
    tableName: 'ChildGroups',
    hooks: {
      // Single create (Model.create, child.addGroup, group.addChild)
      beforeValidate: async (childGroup, options) => {
        if (childGroup.tenantId) return;
        if (!childGroup.childId) return;
        const child = await sequelize.models.Child.findByPk(childGroup.childId, {
          attributes: ['id', 'tenantId'],
          transaction: options.transaction,
        });
        if (child) childGroup.tenantId = child.tenantId;
      },
      // Bulk create (child.setGroups([...]), group.setChildren([...]))
      beforeBulkCreate: async (rows, options) => {
        const needFetch = rows.filter((r) => !r.tenantId && r.childId);
        if (needFetch.length === 0) return;

        const childIds = [...new Set(needFetch.map((r) => r.childId))];
        const children = await sequelize.models.Child.findAll({
          where: { id: childIds },
          attributes: ['id', 'tenantId'],
          transaction: options.transaction,
        });
        const map = new Map(children.map((c) => [c.id, c.tenantId]));
        needFetch.forEach((r) => {
          const tid = map.get(r.childId);
          if (tid) r.tenantId = tid;
        });
      },
    },
  });

  return ChildGroup;
};