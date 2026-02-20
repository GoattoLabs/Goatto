const logger = require("./logger");

class AuditService {
    /**
     * Registra una acción en el log de auditoría
     */
    static async log(guildId, userId, action, command, details, success, error, AuditLog) {
        try {
            await AuditLog.create({
                guildId,
                userId,
                action,
                command,
                details: details || {},
                success,
                error: error ? String(error).slice(0, 1000) : null,
            });
        } catch (err) {
            logger.error(`Error al registrar en audit log: ${err.message}`);
        }
    }

    /**
     * Obtiene logs de auditoría
     */
    static async getLogs(guildId, options = {}, AuditLog) {
        try {
            const {
                limit = 50,
                offset = 0,
                action = null,
                userId = null,
                startDate = null,
                endDate = null,
            } = options;

            const where = { guildId };
            if (action) where.action = action;
            if (userId) where.userId = userId;

            const logs = await AuditLog.findAndCountAll({
                where,
                limit,
                offset,
                order: [["createdAt", "DESC"]],
            });

            return {
                logs: logs.rows,
                total: logs.count,
                limit,
                offset,
            };
        } catch (err) {
            logger.error(`Error al obtener logs de auditoría: ${err.message}`);
            return { logs: [], total: 0, limit, offset: 0 };
        }
    }

    /**
     * Obtiene estadísticas de auditoría
     */
    static async getStats(guildId, days = 7, AuditLog) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const logs = await AuditLog.findAll({
                where: {
                    guildId,
                    createdAt: {
                        [require("sequelize").Op.gte]: startDate,
                    },
                },
            });

            const stats = {
                total: logs.length,
                byAction: {},
                byCommand: {},
                successRate: 0,
                errorRate: 0,
            };

            let successCount = 0;
            let errorCount = 0;

            for (const log of logs) {
                // Por acción
                stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

                // Por comando
                if (log.command) {
                    stats.byCommand[log.command] = (stats.byCommand[log.command] || 0) + 1;
                }

                // Tasa de éxito
                if (log.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            if (logs.length > 0) {
                stats.successRate = ((successCount / logs.length) * 100).toFixed(2);
                stats.errorRate = ((errorCount / logs.length) * 100).toFixed(2);
            }

            return stats;
        } catch (err) {
            logger.error(`Error al obtener estadísticas de auditoría: ${err.message}`);
            return null;
        }
    }
}

module.exports = AuditService;
