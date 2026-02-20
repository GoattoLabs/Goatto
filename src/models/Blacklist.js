const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('Blacklist', {
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
            unique: 'guild_user_unique',
        },
        type: {
            type: DataTypes.ENUM('blacklist', 'whitelist'),
            allowNull: false,
            defaultValue: 'blacklist',
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        addedBy: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        tableName: 'Blacklists',
        timestamps: true,
        indexes: [
            { fields: ['guildId', 'type'] },
            { unique: true, fields: ['guildId', 'userId'], name: 'guild_user_unique' },
        ],
    });
};
