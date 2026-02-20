const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const AuditService = require("../services/auditService");
const logger = require("../services/logger");
const { getSettings } = require("../utils/functions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Muestra estadísticas del bot")
        .addIntegerOption(opt =>
            opt.setName("dias")
                .setDescription("Número de días a analizar (por defecto: 7)")
                .setMinValue(1)
                .setMaxValue(30)
                .setRequired(false)),
    
    async execute(interaction, GuildSettings, client, AuditLog) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const days = interaction.options.getInteger("dias") || 7;
            const settings = await getSettings(interaction.guild.id, GuildSettings);
            
            if (!settings) {
                return await interaction.editReply("`❌` Error al obtener la configuración del servidor.");
            }

            // Obtener estadísticas de auditoría
            const auditStats = await AuditService.getStats(interaction.guild.id, days, AuditLog);
            
            // Obtener información del rol
            const role = settings.roleId ? interaction.guild.roles.cache.get(settings.roleId) : null;
            const roleMemberCount = role ? role.members.size : 0;

            // Obtener logs recientes
            const recentLogs = await AuditService.getLogs(interaction.guild.id, { limit: 10 }, AuditLog);

            // Crear embed
            const embed = new EmbedBuilder()
                .setTitle("📊 Estadísticas del Bot")
                .setDescription(`Estadísticas de los últimos **${days} días**`)
                .setColor(0x5865F2)
                .setTimestamp()
                .addFields(
                    {
                        name: "👥 Usuarios con Rol",
                        value: `\`${roleMemberCount}\` usuarios`,
                        inline: true,
                    },
                    {
                        name: "📝 Acciones Totales",
                        value: `\`${auditStats?.total || 0}\` acciones`,
                        inline: true,
                    },
                    {
                        name: "✅ Tasa de Éxito",
                        value: `\`${auditStats?.successRate || 0}%\``,
                        inline: true,
                    },
                    {
                        name: "❌ Tasa de Errores",
                        value: `\`${auditStats?.errorRate || 0}%\``,
                        inline: true,
                    }
                );

            // Añadir estadísticas por comando si hay datos
            if (auditStats?.byCommand && Object.keys(auditStats.byCommand).length > 0) {
                const commandStats = Object.entries(auditStats.byCommand)
                    .slice(0, 5)
                    .map(([cmd, count]) => `\`/${cmd}\`: ${count}`)
                    .join("\n");
                
                embed.addFields({
                    name: "🔧 Comandos Más Usados",
                    value: commandStats || "N/A",
                    inline: false,
                });
            }

            // Añadir estadísticas por acción si hay datos
            if (auditStats?.byAction && Object.keys(auditStats.byAction).length > 0) {
                const actionStats = Object.entries(auditStats.byAction)
                    .map(([action, count]) => `\`${action}\`: ${count}`)
                    .join("\n");
                
                embed.addFields({
                    name: "⚡ Acciones por Tipo",
                    value: actionStats || "N/A",
                    inline: false,
                });
            }

            await interaction.editReply({ embeds: [embed] });
            logger.info(`[COMMAND] ✅ /stats ejecutado por ${interaction.user.tag} en ${interaction.guild.name}`);

        } catch (err) {
            logger.error("[ERROR /STATS]:", err);
            await interaction.editReply("`❌` Error al generar las estadísticas.").catch(() => {});
        }
    },
};
