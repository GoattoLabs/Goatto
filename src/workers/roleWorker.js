const { Worker } = require("bullmq");
const { getWelcomeLayout } = require("../utils/layouts.js");
const { hasMeetspace, computeTriggers, getSettings } = require("../utils/functions");
const BlacklistService = require("../services/blacklistService");
const WebhookService = require("../services/webhookService");
const logger = require("../services/logger");
const constants = require("../utils/constants");

module.exports = (redisConnection, client, GuildSettings, Blacklist) => {
    return new Worker(
        "roleQueue",
        async (job) => {
            const { guildId, memberId, roleId, action, reason, avatarURL } = job.data;
            
            // Validación de datos del job
            if (!guildId || !memberId || !roleId || !action) {
                console.error(`[WORKER ERROR] Job ${job.id}: Datos incompletos en el job`);
                return; // No relanzar el error para evitar reintentos innecesarios
            }

            try {
                const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
                if (!guild) {
                    console.log(`[WORKER] ⚠️ Guild ${guildId} no encontrado para el job ${job.id}`);
                    return;
                }

                // Verificar que el rol existe antes de intentar asignarlo
                const role = guild.roles.cache.get(roleId);
                if (!role) {
                    console.error(`[WORKER ERROR] Rol ${roleId} no existe en el servidor ${guild.name}`);
                    return;
                }

                // Verificar permisos del bot
                if (!guild.members.me.permissions.has("ManageRoles")) {
                    console.error(`[WORKER ERROR] El bot no tiene permisos para gestionar roles en ${guild.name}`);
                    return;
                }

                // Verificar que el rol del bot esté por encima del rol a asignar
                if (guild.members.me.roles.highest.position <= role.position) {
                    console.error(`[WORKER ERROR] El rol del bot no está por encima del rol ${role.name} en ${guild.name}`);
                    return;
                }

                const member = await guild.members.fetch(memberId).catch(() => null);
                if (!member) {
                    console.log(`[WORKER] ⚠️ Miembro ${memberId} no encontrado en el servidor ${guild.name}`);
                    return;
                }

                // Verificar que el miembro no sea un bot (por seguridad)
                if (member.user.bot) {
                    logger.debug(`[WORKER] ⚠️ Intento de asignar rol a bot ${member.user.tag}, omitido`);
                    return;
                }

                // Verificar blacklist/whitelist
                if (Blacklist) {
                    const isBlacklisted = await BlacklistService.isBlacklisted(guildId, memberId, Blacklist);
                    const isWhitelisted = await BlacklistService.isWhitelisted(guildId, memberId, Blacklist);
                    
                    if (isBlacklisted) {
                        logger.debug(`[WORKER] ⚠️ Usuario ${member.user.tag} está en blacklist, omitiendo`);
                        return;
                    }
                    
                    // Si está en whitelist, forzar asignación
                    if (isWhitelisted && action === "add") {
                        if (!member.roles.cache.has(roleId)) {
                            await member.roles.add(roleId, "Whitelist override");
                            logger.info(`[WORKER] ✅ Rol añadido a ${member.user.tag} (whitelist)`);
                        }
                        return;
                    }
                }

                const settings = await getSettings(guildId, GuildSettings);
                if (!settings) {
                    logger.error(`[WORKER ERROR] No se pudieron obtener las configuraciones para el guild ${guildId}`);
                    return;
                }

                const triggers = computeTriggers(settings.vanityKeyword);
                const isEligible = hasMeetspace(member, triggers);
                const hasRole = member.roles.cache.has(roleId);

                if (action === "add" && isEligible && !hasRole) {
                    try {
                        await member.roles.add(roleId, reason);
                        logger.info(`[WORKER] ✅ Rol añadido a ${member.user.tag} (${memberId})`);

                        const cooldownKey = `vanity_welcome_cd:${memberId}`;
                        const isOnCooldown = await redisConnection.get(cooldownKey).catch(() => null);

                        if (!isOnCooldown) {
                            const webhook = WebhookService.getWebhook();
                            if (webhook) {
                                const layout = getWelcomeLayout(memberId, roleId, avatarURL || member.user.displayAvatarURL({ extension: 'png' }));
                                
                                delete layout.content;
                                delete layout.embeds;

                                // Enviar usando el servicio de webhook (que maneja el avatar y nombre del bot)
                                const sent = await WebhookService.send(layout, client);
                                
                                if (sent) {
                                    logger.info(`[WORKER] 👋 Agradecimiento enviado a ${member.user.tag}`);
                                    await redisConnection.set(cooldownKey, "active", "EX", constants.COOLDOWNS.WELCOME_MESSAGE).catch(() => {
                                        logger.error(`[REDIS ERROR] No se pudo establecer el cooldown para ${member.user.tag}`);
                                    });
                                }
                            } else {
                                logger.debug(`[WORKER] ⏳ No hay webhook configurado, omitiendo agradecimiento para ${member.user.tag}`);
                            }
                        } else {
                            logger.debug(`[WORKER] ⏳ Agradecimiento omitido. ${member.user.tag} sigue en cooldown.`);
                        }
                    } catch (roleError) {
                        // Error específico al añadir rol (puede ser que el miembro abandonó el servidor)
                        if (roleError.code === 10007) { // Unknown Member
                            logger.debug(`[WORKER] ⚠️ Miembro ${memberId} ya no está en el servidor`);
                        } else {
                            logger.error(`[WORKER ERROR] Error al añadir rol a ${member.user?.tag || memberId}:`, roleError.message);
                        }
                    }
                } 
                
                else if (action === "remove" && !isEligible && hasRole) {
                    try {
                        await member.roles.remove(roleId, reason);
                        logger.info(`[WORKER] ❌ Rol quitado a ${member.user.tag} (${memberId})`);
                    } catch (roleError) {
                        // Error específico al quitar rol
                        if (roleError.code === 10007) { // Unknown Member
                            logger.debug(`[WORKER] ⚠️ Miembro ${memberId} ya no está en el servidor`);
                        } else {
                            logger.error(`[WORKER ERROR] Error al quitar rol a ${member.user?.tag || memberId}:`, roleError.message);
                        }
                    }
                }

            } catch (err) {
                logger.error(`[WORKER ERROR] Job ${job.id} (${action} rol para ${memberId}):`, err.message);
                
                // Reintentos inteligentes
                const isRecoverable = !(err.code === 10007 || err.code === 50001 || err.code === 50013);
                // 10007 = Unknown Member (no recuperable)
                // 50001 = Missing Access (no recuperable)
                // 50013 = Missing Permissions (no recuperable)
                
                if (!isRecoverable) {
                    return; // Error no recuperable, no reintentar
                }
                
                // Para errores recuperables, calcular delay exponencial
                const attemptNumber = job.attemptsMade || 0;
                if (attemptNumber < constants.RETRY.MAX_ATTEMPTS) {
                    const delay = constants.RETRY.DELAY_BASE * Math.pow(constants.RETRY.DELAY_MULTIPLIER, attemptNumber);
                    throw new Error(`Reintentando en ${delay}ms: ${err.message}`);
                }
                
                throw err; // Reintentar solo en casos de errores temporales
            }
        },
        { 
            connection: redisConnection, 
            concurrency: 1,
            lockDuration: constants.QUEUE.LOCK_DURATION,
            lockRenewTime: constants.QUEUE.LOCK_RENEW_TIME,
            maxStalledCount: constants.QUEUE.MAX_STALLED_COUNT, 
            stalledInterval: constants.QUEUE.STALLED_INTERVAL,
        }
    );
};