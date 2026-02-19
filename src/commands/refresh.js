const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { performFullScan } = require("../utils/functions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("refresh")
        .setDescription("Forzar escaneo completo de miembros")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, GuildSettings) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            await performFullScan(interaction.guild, GuildSettings); 
            await interaction.editReply("`✅` Escaneo completado con éxito.");
        } catch (err) {
            console.error("[ERROR /REFRESH]:", err);
            await interaction.editReply("`❌` Error durante el escaneo.").catch(o_O => {});
        }
    },
};