const { Events } = require("discord.js");
const { getSettings } = require("../utils/functions");
const { roleQueue } = require("../utils/queues");
const config = require("../../config.js");
const CacheService = require("../services/cache");
const constants = require("../utils/constants");
const logger = require("../services/logger");

const state = { cachedSettings: null };

module.exports = {
    name: Events.PresenceUpdate,
    state,
    async execute(oldPresence, newPresence, GuildSettings) {
        try {
            const memberId = newPresence?.userId;

            if (!memberId || memberId === "null") return;

            // Validar que tenemos un guild válido
            if (!newPresence.guild || newPresence.guild.id !== config.System.vanity_role_system_guild_id) return;
            
            const user = newPresence.user || await newPresence.client.users.fetch(memberId).catch(() => null);
            if (!user) {
                logger.debug(`[PRESENCE] ⚠️ No se pudo obtener el usuario ${memberId}`);
                return;
            }

            // Ignorar bots
            if (user.bot) return;
            
            const oldText = oldPresence?.activities?.find(a => a.type === 4)?.state || "";
            const newText = newPresence?.activities?.find(a => a.type === 4)?.state || "";

            if (oldText === newText) return;

            // Obtener configuraciones con cache
            const settings = await CacheService.getOrSet(
                `presence_settings:${newPresence.guild.id}`,
                async () => await getSettings(newPresence.guild.id, GuildSettings),
                constants.CACHE.PRESENCE_CACHE_TTL
            );
            if (!settings?.roleId || !settings?.vanityKeyword) {
                if (!settings) {
                    logger.debug(`[PRESENCE] ⚠️ No hay configuraciones para el guild ${newPresence.guild.id}`);
                }
                return;
            }

            // Validar que el rol existe
            const role = newPresence.guild.roles.cache.get(settings.roleId);
            if (!role) {
                logger.error(`[PRESENCE ERROR] El rol ${settings.roleId} no existe en el servidor`);
                return;
            }

            const keyword = settings.vanityKeyword.toLowerCase().trim();
            if (!keyword) {
                logger.debug(`[PRESENCE] ⚠️ La palabra clave de vanity está vacía`);
                return;
            }

            // Extraer la parte relevante de la keyword (ej: "testing" de ".gg/testing")
            const extractKeywordPart = (kw) => {
                if (!kw) return "";
                if (kw.includes("/")) {
                    const parts = kw.split("/");
                    return parts[parts.length - 1];
                }
                if (kw.includes(".gg/")) {
                    return kw.split(".gg/")[1] || kw;
                }
                if (kw.startsWith(".")) {
                    return kw.substring(1);
                }
                return kw;
            };

            const keywordPart = extractKeywordPart(keyword);
            const newTextLower = newText.toLowerCase();
            const oldTextLower = oldText.toLowerCase();

            // Verificar si el estado contiene la keyword completa, con "/", o solo la parte relevante
            const hasKeyword = newTextLower.includes(keyword) || 
                             (keywordPart && newTextLower.includes(`/${keywordPart}`)) ||
                             (keywordPart && newTextLower.includes(keywordPart));
            
            const hadKeyword = oldTextLower.includes(keyword) || 
                              (keywordPart && oldTextLower.includes(`/${keywordPart}`)) ||
                              (keywordPart && oldTextLower.includes(keywordPart));

            if (hasKeyword !== hadKeyword) {
                const action = hasKeyword ? "add" : "remove";
                
                try {
                    await roleQueue.add(
                        "roleJob",
                        {
                            guildId: newPresence.guild.id,
                            memberId: memberId,
                            roleId: settings.roleId,
                            action: action,
                            reason: "Vanity System (Automated)",
                            channelId: settings.channelId,
                            avatarURL: user.displayAvatarURL({ extension: 'png' })
                        },
                        { 
                            jobId: `vanity-${memberId}-${action}-${Date.now()}`,
                            attempts: constants.RETRY.MAX_ATTEMPTS,
                            priority: constants.JOB_PRIORITY.NORMAL
                        }
                    );

                    logger.debug(`[QUEUE] 📥 Tarea enviada: ${user.tag} (${memberId}) -> ${action}`);
                } catch (queueError) {
                    logger.error(`[QUEUE ERROR] Error al añadir job para ${user.tag}:`, queueError.message);
                }
            }
        } catch (err) {
            logger.error(`[PRESENCE ERROR] Error en presenceUpdate:`, err.message);
        }
    },
};