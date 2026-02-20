const { ActivityType } = require("discord.js");
const config = require("../../config.js");
const { roleQueue } = require("./queues");
const CacheService = require("../services/cache");
const constants = require("./constants");
const logger = require("../services/logger");

/**
 * Extrae la parte relevante de una keyword de vanity
 * Ejemplos:
 * - ".gg/testing" -> "testing"
 * - "/testing" -> "testing"
 * - "testing" -> "testing"
 */
function extractKeywordPart(keyword) {
    if (!keyword) return "";
    
    const keywordStr = String(keyword).toLowerCase().trim();
    
    // Si contiene "/", tomar la parte después de la última "/"
    if (keywordStr.includes("/")) {
        const parts = keywordStr.split("/");
        return parts[parts.length - 1];
    }
    
    // Si contiene ".gg/", tomar la parte después
    if (keywordStr.includes(".gg/")) {
        return keywordStr.split(".gg/")[1] || keywordStr;
    }
    
    // Si empieza con ".", quitar el punto
    if (keywordStr.startsWith(".")) {
        return keywordStr.substring(1);
    }
    
    return keywordStr;
}

/**
 * Verifica si el estado del usuario contiene la keyword de vanity
 * Detecta variaciones como:
 * - ".gg/testing" -> detecta "testing", "/testing", ".gg/testing"
 * - "/testing" -> detecta "testing", "/testing"
 * - "testing" -> detecta "testing"
 */
function hasMeetspace(member, keyword) {
    if (!member?.presence || !keyword) return false;

    try {
        const customStatus = member.presence.activities?.find((a) => a.type === 4);
        if (!customStatus?.state) return false;

        const statusText = customStatus.state.toLowerCase().trim();
        const keywordString = String(keyword).toLowerCase().trim();
        
        if (!keywordString) return false;
        
        // Extraer la parte relevante de la keyword (ej: "testing" de ".gg/testing")
        const keywordPart = extractKeywordPart(keywordString);
        
        // Verificar si el estado contiene:
        // 1. La keyword completa (ej: ".gg/testing")
        // 2. La parte relevante con "/" (ej: "/testing")
        // 3. Solo la parte relevante (ej: "testing")
        const matchesFull = statusText.includes(keywordString);
        const matchesWithSlash = keywordPart && statusText.includes(`/${keywordPart}`);
        const matchesPart = keywordPart && statusText.includes(keywordPart);
        
        return matchesFull || matchesWithSlash || matchesPart;
    } catch (err) {
        // Silenciosamente retornar false si hay algún error al verificar
        return false;
    }
}

function computeTriggers(vanityKeyword) {
    if (!vanityKeyword) return [];
    return [vanityKeyword.toLowerCase()];
}

async function getSettings(guildId, GuildSettingsModel) {
    if (!guildId) {
        logger.error("[SETTINGS ERROR] ❌ guildId no proporcionado");
        return null;
    }

    // Usar cache
    return await CacheService.getOrSet(
        `settings:${guildId}`,
        async () => {
            try {
                return await GuildSettingsModel.findOrCreate({
                    where: { guildId: String(guildId) },
                    defaults: {
                        vanityKeyword: config.System.vanity_role_system_status_text || "",
                        roleId: config.System.vanity_role_system_role_id || "",
                        channelId: config.System.vanity_role_system_channel_id || "",
                    }
                }).then(res => res[0]);
            } catch (err) {
                logger.error(`[SETTINGS ERROR] ❌ Error al obtener configuraciones para guild ${guildId}:`, err.message);
                return null;
            }
        },
        constants.CACHE.SETTINGS_TTL
    );
}

async function performFullScan(guild, GuildSettingsModel, progressCallback = null) {
    if (!guild) {
        logger.error("[SYSTEM ERROR] ❌ Guild no proporcionado para el escaneo");
        return { enqueued: 0, errors: 0, total: 0 };
    }

    const settings = await getSettings(guild.id, GuildSettingsModel);
    if (!settings) {
        logger.error(`[SYSTEM ERROR] ❌ No se pudieron obtener las configuraciones para el guild ${guild.id}`);
        return { enqueued: 0, errors: 0, total: 0 };
    }

    if (!settings.roleId || !settings.vanityKeyword) {
        logger.warn(`[SYSTEM] ⚠️ Configuración incompleta: roleId=${!!settings.roleId}, keyword=${!!settings.vanityKeyword}`);
        return { enqueued: 0, errors: 0, total: 0 };
    }

    // Validar que el rol existe
    const role = guild.roles.cache.get(settings.roleId);
    if (!role) {
        logger.error(`[SYSTEM ERROR] ❌ El rol ${settings.roleId} no existe en el servidor ${guild.name}`);
        return { enqueued: 0, errors: 0, total: 0 };
    }

    // Validar permisos del bot
    if (!guild.members.me?.permissions.has("ManageRoles")) {
        logger.error(`[SYSTEM ERROR] ❌ El bot no tiene permisos para gestionar roles en ${guild.name}`);
        return { enqueued: 0, errors: 0, total: 0 };
    }

    logger.info(`[SYSTEM] 🔍 Iniciando escaneo masivo en ${guild.name}..`);

    try {
        // Obtener miembros con paginación
        const allMembers = await guild.members.fetch({ limit: constants.BATCH.MEMBER_FETCH_LIMIT }).catch((err) => {
            logger.error(`[SYSTEM ERROR] ❌ Error al obtener miembros:`, err.message);
            throw err;
        }); 
        
        const membersArray = Array.from(allMembers.values());
        const total = membersArray.length;
        let enqueued = 0;
        let errors = 0;
        let processed = 0;

        // Procesar en batches
        const batchSize = constants.BATCH.SCAN_BATCH_SIZE;
        for (let i = 0; i < membersArray.length; i += batchSize) {
            const batch = membersArray.slice(i, i + batchSize);
            const batchPromises = [];

            for (const member of batch) {
                // Ignorar bots
                if (member.user.bot) {
                    processed++;
                    continue;
                }

                // Verificar que el miembro aún está en el servidor
                if (!member || !member.user) {
                    processed++;
                    continue;
                }

                batchPromises.push(
                    (async () => {
                        try {
                            const hasKeyword = hasMeetspace(member, settings.vanityKeyword);
                            const hasRole = member.roles.cache.has(settings.roleId);

                            if ((hasKeyword && !hasRole) || (!hasKeyword && hasRole)) {
                                const action = hasKeyword ? "add" : "remove";
                                
                                await roleQueue.add(
                                    `scan-${action}-${member.id}-${Date.now()}`,
                                    {
                                        guildId: guild.id,
                                        memberId: member.id,
                                        roleId: settings.roleId,
                                        action: action,
                                        reason: "Full Scan Synchronization",
                                        channelId: settings.channelId,
                                        avatarURL: member.user.displayAvatarURL({ extension: 'png' })
                                    },
                                    { priority: constants.JOB_PRIORITY.LOW }
                                );
                                enqueued++;
                            }
                            processed++;
                        } catch (memberError) {
                            errors++;
                            processed++;
                            if (errors <= 5) {
                                logger.error(`[SYSTEM ERROR] Error procesando miembro ${member.user?.tag || member.id}:`, memberError.message);
                            }
                        }
                    })()
                );
            }

            // Ejecutar batch
            await Promise.all(batchPromises);

            // Callback de progreso
            if (progressCallback && processed % constants.SCAN.PROGRESS_UPDATE_INTERVAL === 0) {
                await progressCallback(processed, total, enqueued, errors);
            }
        }

        logger.info(`[SYSTEM] ✅ Escaneo finalizado. ${enqueued} tareas añadidas a la cola.${errors > 0 ? ` ${errors} errores encontrados.` : ''}`);
        return { enqueued, errors, total };
    } catch (err) {
        logger.error("[SYSTEM ERROR] ❌ Fallo en el escaneo masivo:", err.message);
        throw err;
    }
}

function requireAdmin(interaction) {
    return interaction.member?.permissions?.has("Administrator");
}

module.exports = { hasMeetspace, computeTriggers, getSettings, requireAdmin, performFullScan, extractKeywordPart };