const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
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
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const channel = interaction.options.getChannel("canal");
            const settings = await getSettings(interaction.guild.id, GuildSettings);
            
            settings.channelId = channel.id;
            await settings.save();
            
            await interaction.editReply(`\`✅\` Notificaciones configuradas en ${channel}`);
        } catch (err) {
            console.error("[ERROR /SETCHANNEL]:", err);
            await interaction.editReply("`❌` No se pudo guardar la configuración.").catch(o_O => {});
        }
    },
};