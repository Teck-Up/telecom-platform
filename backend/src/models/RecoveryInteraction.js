const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecoveryInteraction = sequelize.define('RecoveryInteraction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    recovery_case_id: { type: DataTypes.INTEGER, allowNull: false },
    interaction_type: {
      type: DataTypes.ENUM('phone', 'email', 'note', 'legal_notice'),
      allowNull: false,
    },
    content: { type: DataTypes.TEXT, allowNull: false },
    created_by: { type: DataTypes.INTEGER },
  }, {
    tableName: 'recovery_interactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return RecoveryInteraction;
};
