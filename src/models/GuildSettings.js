const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('GuildSettings', {
        guildId: { type: DataTypes.STRING, primaryKey: true },
        vanityKeyword: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
        roleId: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
        channelId: { type: DataTypes.STRING, allowNull: true, defaultValue: "" }
    });
};