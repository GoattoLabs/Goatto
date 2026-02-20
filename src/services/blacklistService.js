const logger = require("./logger");

class BlacklistService {
    /**
     * Verifica si un usuario está en la blacklist
     */
    static async isBlacklisted(guildId, userId, Blacklist) {
        try {
            if (!Blacklist) return false;
            
            const entry = await Blacklist.findOne({
                where: {
                    guildId: String(guildId),
                    userId: String(userId),
                    type: "blacklist",
                },
            });
            return !!entry;
        } catch (err) {
            // Si la columna type no existe, retornar false silenciosamente
            if (err.message && err.message.includes('does not exist')) {
                logger.debug(`Columna type no existe en tabla Blacklist, omitiendo verificación`);
                return false;
            }
            logger.error(`Error al verificar blacklist: ${err.message}`);
            return false;
        }
    }

    /**
     * Verifica si un usuario está en la whitelist
     */
    static async isWhitelisted(guildId, userId, Blacklist) {
        try {
            if (!Blacklist) return false;
            
            const entry = await Blacklist.findOne({
                where: {
                    guildId: String(guildId),
                    userId: String(userId),
                    type: "whitelist",
                },
            });
            return !!entry;
        } catch (err) {
            // Si la columna type no existe, retornar false silenciosamente
            if (err.message && err.message.includes('does not exist')) {
                logger.debug(`Columna type no existe en tabla Blacklist, omitiendo verificación`);
                return false;
            }
            logger.error(`Error al verificar whitelist: ${err.message}`);
            return false;
        }
    }

    /**
     * Añade un usuario a la blacklist
     */
    static async addToBlacklist(guildId, userId, reason, addedBy, Blacklist) {
        try {
            const [entry, created] = await Blacklist.findOrCreate({
                where: { guildId, userId },
                defaults: {
                    type: "blacklist",
                    reason,
                    addedBy,
                },
            });

            if (!created) {
                entry.type = "blacklist";
                entry.reason = reason;
                entry.addedBy = addedBy;
                await entry.save();
            }

            logger.info(`Usuario ${userId} añadido a blacklist en guild ${guildId}`);
            return entry;
        } catch (err) {
            logger.error(`Error al añadir a blacklist: ${err.message}`);
            throw err;
        }
    }

    /**
     * Añade un usuario a la whitelist
     */
    static async addToWhitelist(guildId, userId, reason, addedBy, Blacklist) {
        try {
            const [entry, created] = await Blacklist.findOrCreate({
                where: { guildId, userId },
                defaults: {
                    type: "whitelist",
                    reason,
                    addedBy,
                },
            });

            if (!created) {
                entry.type = "whitelist";
                entry.reason = reason;
                entry.addedBy = addedBy;
                await entry.save();
            }

            logger.info(`Usuario ${userId} añadido a whitelist en guild ${guildId}`);
            return entry;
        } catch (err) {
            logger.error(`Error al añadir a whitelist: ${err.message}`);
            throw err;
        }
    }

    /**
     * Elimina un usuario de blacklist/whitelist
     */
    static async remove(guildId, userId, Blacklist) {
        try {
            const deleted = await Blacklist.destroy({
                where: { guildId, userId },
            });
            
            if (deleted > 0) {
                logger.info(`Usuario ${userId} eliminado de blacklist/whitelist en guild ${guildId}`);
            }
            
            return deleted > 0;
        } catch (err) {
            logger.error(`Error al eliminar de blacklist: ${err.message}`);
            throw err;
        }
    }

    /**
     * Lista todos los usuarios en blacklist/whitelist
     */
    static async list(guildId, type, Blacklist) {
        try {
            const entries = await Blacklist.findAll({
                where: {
                    guildId,
                    ...(type && { type }),
                },
                order: [["createdAt", "DESC"]],
            });
            return entries;
        } catch (err) {
            logger.error(`Error al listar blacklist: ${err.message}`);
            return [];
        }
    }
}

module.exports = BlacklistService;
