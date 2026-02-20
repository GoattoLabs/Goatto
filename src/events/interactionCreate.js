const { Events, MessageFlags } = require("discord.js");
const { requireAdmin } = require("../utils/functions");
const config = require("../../config.js");
const RateLimiter = require("../services/rateLimiter");
const AuditService = require("../services/auditService");
const logger = require("../services/logger");
const constants = require("../utils/constants");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, GuildSettings, client, AuditLog, Blacklist) {
        
        // Slash Commands
        if (interaction.isChatInputCommand()) {
            if (!requireAdmin(interaction)) {
                await AuditService.log(
                    interaction.guild.id,
                    interaction.user.id,
                    "command",
                    interaction.commandName,
                    { denied: "no_admin" },
                    false,
                    null,
                    AuditLog
                );
                return interaction.reply({ 
                    content: "❌ Este comando está reservado para administradores. Necesitas el permiso de Administrador para usarlo.", 
                    flags: MessageFlags.Ephemeral 
                }).catch(() => {});
            }

            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // Rate limiting
            const rateLimitKey = `command:${interaction.user.id}`;
            const rateLimit = await RateLimiter.checkLimit(
                rateLimitKey,
                constants.RATE_LIMITS.COMMAND_PER_USER,
                constants.RATE_LIMITS.RATE_LIMIT_WINDOW
            );

            if (!rateLimit.allowed) {
                const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString();
                await AuditService.log(
                    interaction.guild.id,
                    interaction.user.id,
                    "command",
                    interaction.commandName,
                    { denied: "rate_limit" },
                    false,
                    null,
                    AuditLog
                );
                return interaction.reply({
                    content: `⏳ Has alcanzado el límite de comandos. Intenta de nuevo después de las ${resetTime}.`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }

            // Rate limiting específico por comando
            if (interaction.commandName === "refresh") {
                const refreshLimit = await RateLimiter.checkLimit(
                    `refresh:${interaction.guild.id}`,
                    constants.RATE_LIMITS.REFRESH_PER_GUILD,
                    constants.COOLDOWNS.REFRESH_COMMAND
                );
                if (!refreshLimit.allowed) {
                    const resetTime = new Date(refreshLimit.resetAt).toLocaleTimeString();
                    return interaction.reply({
                        content: `⏳ El escaneo completo ya se ejecutó recientemente. Intenta de nuevo después de las ${resetTime}.`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }
            }

            if (interaction.commandName === "setvanity") {
                const vanityLimit = await RateLimiter.checkLimit(
                    `setvanity:${interaction.user.id}`,
                    constants.RATE_LIMITS.SETVANITY_PER_USER,
                    constants.COOLDOWNS.SETVANITY_COMMAND
                );
                if (!vanityLimit.allowed) {
                    const resetTime = new Date(vanityLimit.resetAt).toLocaleTimeString();
                    return interaction.reply({
                        content: `⏳ Has cambiado la keyword recientemente. Intenta de nuevo después de las ${resetTime}.`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }
            }

            try {
                await command.execute(interaction, GuildSettings, client, AuditLog, Blacklist);
                
                // Log exitoso
                await AuditService.log(
                    interaction.guild.id,
                    interaction.user.id,
                    "command",
                    interaction.commandName,
                    { success: true },
                    true,
                    null,
                    AuditLog
                );
            } catch (error) {
                logger.error(`Error ejecutando comando ${interaction.commandName}:`, error);
                
                // Log de error
                await AuditService.log(
                    interaction.guild.id,
                    interaction.user.id,
                    "command",
                    interaction.commandName,
                    { error: error.message },
                    false,
                    error.message,
                    AuditLog
                );
                
                await interaction.reply({ 
                    content: '❌ Ocurrió un error al ejecutar el comando. El error ha sido registrado y será revisado. Si el problema persiste, contacta al soporte.', 
                    flags: MessageFlags.Ephemeral 
                }).catch(() => {});
            }
            return;
        }

        // Modal Say
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_say') {
                const mensajeModal = interaction.fields.getTextInputValue('modal_message');
                let replyId = interaction.fields.getTextInputValue('modal_reply');

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    // Validar que el mensaje no esté vacío
                    if (!mensajeModal || !mensajeModal.trim()) {
                        return await interaction.editReply("Error: El mensaje no puede estar vacío.");
                    }

                    // Validar permisos del bot
                    if (!interaction.channel.permissionsFor(interaction.guild.members.me)?.has("SendMessages")) {
                        return await interaction.editReply("Error: No tengo permisos para enviar mensajes en este canal.");
                    }

                    if (replyId) {
                        replyId = replyId.trim();
                        if (replyId.includes('/')) replyId = replyId.split('/').pop();
                        if (!/^\d+$/.test(replyId)) {
                            return await interaction.editReply("Error: ID no válido.");
                        }

                        try {
                            const target = await interaction.channel.messages.fetch(replyId);
                            if (!target) {
                                return await interaction.editReply("Error: Mensaje no encontrado.");
                            }

                            await target.reply({ 
                                content: mensajeModal, 
                                allowedMentions: { repliedUser: false } 
                            });
                            
                            logger.info(`[MODAL] ✅ Modal say ejecutado por ${interaction.user.tag} en ${interaction.guild.name} (respondiendo a ${replyId})`);
                        } catch (fetchError) {
                            if (fetchError.code === 10008) { // Unknown Message
                                return await interaction.editReply("Error: Mensaje no encontrado. Verifica que el ID sea correcto.");
                            }
                            throw fetchError;
                        }
                    } else {
                        await interaction.channel.send(mensajeModal);
                        logger.info(`[MODAL] ✅ Modal say ejecutado por ${interaction.user.tag} en ${interaction.guild.name}`);
                    }
                    
                    await interaction.deleteReply().catch(() => null);
                } catch (e) {
                    logger.error("[MODAL ERROR]:", e);
                    await interaction.editReply("Error: No se encontró el mensaje o faltan permisos.").catch(() => {});
                }
            }
        }

        // Modal VIP
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'vip_color_select') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const member = interaction.member;
                const roleId = interaction.values[0];
                const colorIds = config.VIP.colorRoles.map(r => r.roleId).filter(id => id !== 'clear');

                try {
                    // Validar que el miembro existe
                    if (!member) {
                        return await interaction.editReply({ content: "`❌` Error: No se pudo obtener tu información de miembro." });
                    }

                    // Validar permisos del bot
                    if (!interaction.guild.members.me?.permissions.has("ManageRoles")) {
                        return await interaction.editReply({ content: "`❌` Error: No tengo permisos para gestionar roles." });
                    }

                    // ¿Qué roles de color tiene?
                    const currentColors = member.roles.cache.filter(r => colorIds.includes(r.id)).map(r => r.id);

                    // Quita todos los colores
                    if (roleId === 'clear') {
                        if (currentColors.length > 0) {
                            try {
                                await member.roles.remove(currentColors);
                                logger.info(`[VIP] ✅ Color quitado a ${member.user.tag} en ${interaction.guild.name}`);
                            } catch (removeError) {
                                logger.error("[VIP COLOR ERROR] Error al quitar colores:", removeError.message);
                                return await interaction.editReply({ content: "`❌` Error al quitar los colores. Verifica permisos." });
                            }
                        }
                        return await interaction.editReply({ content: "`✅` Se ha quitado tu color." });
                    }

                    // Validar que el rol existe
                    const targetRole = interaction.guild.roles.cache.get(roleId);
                    if (!targetRole) {
                        return await interaction.editReply({ content: "`❌` Error: El rol seleccionado no existe." });
                    }

                    // Validar que el rol del bot esté por encima del rol a asignar
                    if (interaction.guild.members.me.roles.highest.position <= targetRole.position) {
                        return await interaction.editReply({ content: "`❌` Error: Mi rol no está por encima del rol de color. Contacta a un administrador." });
                    }

                    // Quita colores viejos
                    if (currentColors.length > 0) {
                        try {
                            await member.roles.remove(currentColors);
                        } catch (removeError) {
                            logger.error("[VIP COLOR ERROR] Error al quitar colores antiguos:", removeError.message);
                            // Continuar aunque falle, puede que el miembro ya no tenga esos roles
                        }
                    }

                    // Asigna nuevo color
                    try {
                        await member.roles.add(roleId);
                        const colorLabel = config.VIP.colorRoles.find(r => r.roleId === roleId)?.label || "nuevo";
                        logger.info(`[VIP] ✅ Color ${colorLabel} asignado a ${member.user.tag} en ${interaction.guild.name}`);
                        await interaction.editReply({ content: `\`✅\` Has seleccionado el color **${colorLabel}**.` });
                    } catch (addError) {
                        logger.error("[VIP COLOR ERROR] Error al añadir color:", addError.message);
                        await interaction.editReply({ content: "`❌` Error al asignar el color. Verifica permisos." }).catch(() => {});
                    }

                } catch (error) {
                    logger.error("[VIP COLOR ERROR]:", error);
                    await interaction.editReply({ content: "`❌` Error de permisos: Asegúrate de que mi rol esté por encima de los roles de colores." }).catch(() => {});
                }
            }
        }
    },
};