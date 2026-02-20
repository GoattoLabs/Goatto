const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getSettings } = require("../utils/functions");
const { getStatusLayout } = require("../utils/layouts.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Muestra el estado de la configuración"),
    
    async execute(interaction, GuildSettings, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const settings = await getSettings(interaction.guild.id, GuildSettings);
            if (!settings) {
                return await interaction.editReply("`❌` Error al obtener la configuración del servidor.");
            }
            
            const role = settings.roleId ? interaction.guild.roles.cache.get(settings.roleId) : null;
            const channel = settings.channelId ? interaction.guild.channels.cache.get(settings.channelId) : null;
            
            const realMemberCount = role ? role.members.size : 0;

            const payload = getStatusLayout(
                settings, 
                role, 
                channel, 
                interaction.user.id, 
                client.user.displayAvatarURL({ extension: 'png' }), 
                realMemberCount
            );

            // Validar que el bot puede enviar mensajes en el canal
            if (!interaction.channel.permissionsFor(interaction.guild.members.me)?.has("SendMessages")) {
                return await interaction.editReply("`❌` No tengo permisos para enviar mensajes en este canal.");
            }

            await interaction.channel.send(payload);
            const logger = require("../services/logger");
            logger.info(`[COMMAND] ✅ /status ejecutado por ${interaction.user.tag} en ${interaction.guild.name}`);
            await interaction.editReply("`✅` Estado enviado al canal.");

        } catch (err) {
            const logger = require("../services/logger");
            logger.error("[ERROR /STATUS]:", err);
            await interaction.editReply("`❌` Error al generar el estado.").catch(() => {});
        }
    },
};