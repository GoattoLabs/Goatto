const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { getSettings } = require("../utils/functions");
const CacheService = require("../services/cache");
const logger = require("../services/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setvanity")
        .setDescription("Configura la palabra clave de vanity")
        .addStringOption(opt => 
            opt.setName("keyword")
                .setDescription("La palabra clave (ej: .gg/meetspace)")
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, GuildSettings) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        try {
            const keyword = interaction.options.getString("keyword");
            
            // Validar que la palabra clave no esté vacía
            if (!keyword || !keyword.trim()) {
                return await interaction.editReply("`❌` La palabra clave no puede estar vacía.");
            }

            // Validar longitud máxima (Discord limita el estado personalizado a 128 caracteres)
            if (keyword.length > 128) {
                return await interaction.editReply("`❌` La palabra clave no puede tener más de 128 caracteres.");
            }

            // Obtener o crear la configuración directamente desde la base de datos
            const [settings, created] = await GuildSettings.findOrCreate({
                where: { guildId: String(interaction.guild.id) },
                defaults: {
                    vanityKeyword: keyword.trim(),
                    roleId: "",
                    channelId: "",
                }
            });

            if (!created) {
                // Actualizar la keyword existente
                settings.vanityKeyword = keyword.trim();
                await settings.save();
            }
            
            // Limpiar cache de configuraciones
            await CacheService.delete(`settings:${interaction.guild.id}`);
            await CacheService.delete(`presence_settings:${interaction.guild.id}`);
            
            logger.info(`[COMMAND] ✅ /setvanity ejecutado por ${interaction.user.tag} en ${interaction.guild.name}: "${keyword}"`);
            await interaction.editReply(`\`✅\` Vanity actualizada a: \`${keyword.trim()}\``);
        } catch (err) {
            logger.error("[ERROR /SETVANITY]:", err);
            await interaction.editReply("`❌` No se pudo actualizar la palabra clave.").catch(() => {});
        }
    },
};