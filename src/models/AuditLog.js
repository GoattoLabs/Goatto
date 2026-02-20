const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('AuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        guildId: {
            type: DataTypes.STRING,
            allowNull: false,
            index: true,
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false, // 'command', 'role_add', 'role_remove', 'config_change'
        },
        command: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        details: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        success: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        error: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        timestamps: true,
        indexes: [
            { fields: ['guildId', 'createdAt'] },
            { fields: ['userId', 'createdAt'] },
            { fields: ['action', 'createdAt'] },
        ],
    });
};
