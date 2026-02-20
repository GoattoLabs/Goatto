const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");
const { getSettings } = require("../utils/functions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setchannel")
        .setDescription("Configura el canal de notificaciones")
        .addChannelOption(opt => 
            opt.setName("canal")
                .setDescription("El canal de texto")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, GuildSettings) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        try {
            const channel = interaction.options.getChannel("canal");
            
            // Validar que el canal existe y es válido
            if (!channel) {
                return await interaction.editReply("`❌` Canal no encontrado.");
            }

            // Validar que el bot puede ver el canal
            if (!channel.viewable) {
                return await interaction.editReply("`❌` No tengo permisos para ver ese canal.");
            }

            // Obtener o crear la configuración directamente desde la base de datos
            const [settings, created] = await GuildSettings.findOrCreate({
                where: { guildId: String(interaction.guild.id) },
                defaults: {
                    vanityKeyword: "",
                    roleId: "",
                    channelId: channel.id,
                }
            });

            if (!created) {
                // Actualizar el canal existente
                settings.channelId = channel.id;
                await settings.save();
            }
            
            // Limpiar cache de configuraciones
            const CacheService = require("../services/cache");
            await CacheService.delete(`settings:${interaction.guild.id}`);
            await CacheService.delete(`presence_settings:${interaction.guild.id}`);
            
            const logger = require("../services/logger");
            logger.info(`[COMMAND] ✅ /setchannel ejecutado por ${interaction.user.tag} en ${interaction.guild.name}: ${channel.name} (${channel.id})`);
            await interaction.editReply(`\`✅\` Notificaciones configuradas en ${channel}`);
        } catch (err) {
            const logger = require("../services/logger");
            logger.error("[ERROR /SETCHANNEL]:", err);
            await interaction.editReply("`❌` No se pudo guardar la configuración.").catch(() => {});
        }
    },
};