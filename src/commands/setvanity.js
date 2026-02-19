const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getSettings } = require("../utils/functions");
const presenceUpdate = require("../events/presenceUpdate");

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
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const keyword = interaction.options.getString("keyword");
            const settings = await getSettings(interaction.guild.id, GuildSettings);
            
            settings.vanityKeyword = keyword;
            await settings.save();
            
            presenceUpdate.cachedSettings = null;
            
            await interaction.editReply(`\`✅\` Vanity actualizada a: \`${keyword}\``);
        } catch (err) {
            console.error("[ERROR /SETVANITY]:", err);
            await interaction.editReply("`❌` No se pudo actualizar la palabra clave.");
        }
    },
};