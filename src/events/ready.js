const { Events, ActivityType } = require("discord.js");
const config = require("../../config.js");
const { performFullScan } = require("../utils/functions");
const constants = require("../utils/constants");
const logger = require("../services/logger");
const BackupService = require("../services/backupService");
const AlertService = require("../services/alertService");
const WebhookService = require("../services/webhookService");

const redisConnection = require("../utils/redis");
const setupRoleWorker = require("../workers/roleWorker");

// Almacenar el worker para poder cerrarlo correctamente si es necesario
let roleWorker = null;

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client, GuildSettings, AuditLog, Blacklist) {
        
        logger.info(`[CLIENT] 🟩 ${client.user.tag} iniciado correctamente.`);

        // Validar configuración crítica
        const guildId = config.System.vanity_role_system_guild_id;
        if (!guildId) {
            logger.error("[CONFIG ERROR] ❌ VANITY_GUILD_ID no está configurado en las variables de entorno");
        }

        if (!config.System.vanity_role_system_role_id) {
            logger.warn("[CONFIG WARNING] ⚠️ VANITY_ROLE_ID no está configurado");
        }

        // Verificar conexión a Redis antes de iniciar el worker
        try {
            await redisConnection.ping();
            logger.info("[REDIS] ✅ Conexión a Redis verificada");
        } catch (err) {
            logger.error("[REDIS ERROR] ❌ No se pudo verificar la conexión a Redis:", err.message);
            logger.error("[REDIS ERROR] El worker puede no funcionar correctamente");
            await AlertService.redisDown(err);
        }

        // Inicializar webhook service
        try {
            await WebhookService.initialize(client);
            logger.info("[WEBHOOK] ✅ Servicio de webhook inicializado");
        } catch (err) {
            logger.error("[WEBHOOK ERROR] ❌ Error al inicializar webhook:", err.message);
        }

        // Iniciar worker y guardar referencia
        try {
            roleWorker = setupRoleWorker(redisConnection, client, GuildSettings, Blacklist);
            logger.info("[BULLMQ] 👷 Worker de roles iniciado y listo para procesar la cola.");
        } catch (err) {
            logger.error("[BULLMQ ERROR] ❌ Error al iniciar el worker:", err.message);
        }

        // Configurar actividad del bot
        if (config.Client.bot_status) {
            try {
                await client.user.setActivity({
                    name: config.Client.bot_status,
                    type: ActivityType.Custom,
                    state: config.Client.bot_status,
                });
            } catch (err) {
                logger.error("[ACTIVITY ERROR] Error al configurar la actividad del bot:", err.message);
            }
        }

        // Backup automático periódico
        setInterval(async () => {
            logger.info("[SYSTEM] 💾 Iniciando backup automático...");
            try {
                await BackupService.createFullBackup(GuildSettings);
            } catch (err) {
                logger.error(`[SYSTEM ERROR] Error en backup automático: ${err.message}`);
                await AlertService.sendAlert("error", "Error en backup automático", err.message);
            }
        }, constants.BACKUP.INTERVAL);

        // Limpieza periódica (48h)
        setInterval(async () => {
            logger.info("[SYSTEM] 🧹 Iniciando limpieza profunda de 48h..");
            
            try {
                if (!guildId) {
                    logger.warn("[SYSTEM] ❌ No se puede realizar la limpieza: guildId no configurado");
                    return;
                }

                const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
                
                if (guild) {
                    await performFullScan(guild, GuildSettings); 
                    logger.info("[SYSTEM] ✅ Limpieza profunda completada con éxito.");
                } else {
                    logger.warn(`[SYSTEM] ❌ No se pudo encontrar el servidor ${guildId} para la limpieza.`);
                }
            } catch (err) {
                logger.error(`[SYSTEM ERROR] Error en limpieza periódica: ${err.message}`);
                await AlertService.sendAlert("error", "Error en limpieza periódica", err.message);
            }
        }, constants.SCAN.FULL_SCAN_INTERVAL);
    },
    // Exportar el worker para poder cerrarlo si es necesario
    getWorker: () => roleWorker,
};