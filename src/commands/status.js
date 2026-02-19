const { SlashCommandBuilder } = require("discord.js");
const { getSettings } = require("../utils/functions");
const { getStatusLayout } = require("../utils/layouts.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Muestra el estado de la configuración"),
    
    async execute(interaction, GuildSettings, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const settings = await getSettings(interaction.guild.id, GuildSettings);
            
            const role = interaction.guild.roles.cache.get(settings.roleId);
            const channel = interaction.guild.channels.cache.get(settings.channelId);
            
            const realMemberCount = role ? role.members.size : 0;

            const payload = getStatusLayout(
                settings, 
                role, 
                channel, 
                interaction.user.id, 
                client.user.displayAvatarURL(), 
                realMemberCount
            );

            await interaction.channel.send(payload);
            await interaction.editReply("`✅` Estado enviado al canal.");

        } catch (err) {
            console.error("[ERROR /STATUS]:", err);
            await interaction.editReply("`❌` Error al generar el estado.");
        }
    },
};