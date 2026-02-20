const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { performFullScan } = require("../utils/functions");
const logger = require("../services/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("refresh")
        .setDescription("Forzar escaneo completo de miembros")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, GuildSettings, client, AuditLog, Blacklist) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        try {
            // Validar permisos del bot
            if (!interaction.guild.members.me?.permissions.has("ManageRoles")) {
                return await interaction.editReply("❌ No tengo permisos para gestionar roles en este servidor. Por favor, asegúrate de que mi rol tenga el permiso 'Gestionar Roles' y esté por encima del rol que voy a asignar.");
            }

            await interaction.editReply("⏳ Iniciando escaneo completo... Esto puede tardar unos momentos. Te mantendré informado del progreso.");
            
            // Callback de progreso
            let lastUpdate = Date.now();
            const progressCallback = async (processed, total, enqueued, errors) => {
                const now = Date.now();
                // Actualizar cada 5 segundos como mínimo
                if (now - lastUpdate < 5000) return;
                lastUpdate = now;
                
                const percentage = ((processed / total) * 100).toFixed(1);
                await interaction.editReply(
                    `⏳ Escaneando... ${processed}/${total} miembros (${percentage}%)\n` +
                    `✅ ${enqueued} tareas añadidas a la cola${errors > 0 ? `\n⚠️ ${errors} errores` : ""}`
                ).catch(() => {});
            };
            
            const result = await performFullScan(interaction.guild, GuildSettings, progressCallback); 
            
            logger.info(`[COMMAND] ✅ /refresh ejecutado por ${interaction.user.tag} en ${interaction.guild.name}`);
            await interaction.editReply(
                `✅ Escaneo completado con éxito.\n` +
                `📊 Resultados:\n` +
                `• Total de miembros escaneados: ${result.total}\n` +
                `• Tareas añadidas a la cola: ${result.enqueued}\n` +
                `${result.errors > 0 ? `• Errores encontrados: ${result.errors}` : "• Sin errores"}`
            );
        } catch (err) {
            logger.error("[ERROR /REFRESH]:", err);
            await interaction.editReply("❌ Ocurrió un error durante el escaneo. El error ha sido registrado en los logs. Por favor, intenta de nuevo más tarde o contacta al soporte si el problema persiste.").catch(() => {});
        }
    },
};