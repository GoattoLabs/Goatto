const { Events } = require("discord.js");
const { requireAdmin } = require("../utils/functions");
const config = require("../../config.js");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, GuildSettings, client) {
        
        // Slash Commands
        if (interaction.isChatInputCommand()) {
            if (!requireAdmin(interaction)) {
                return interaction.reply({ content: "Comando reservado para administradores.", ephemeral: true }).catch(() => {});
            }

            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, GuildSettings, client);
            } catch (error) {
                console.error(`Error ejecutando comando ${interaction.commandName}:`, error);
                await interaction.reply({ content: 'Hubo un error ejecutando el comando.', ephemeral: true }).catch(() => {});
            }
            return;
        }

        // Modal Say
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_say') {
                const mensajeModal = interaction.fields.getTextInputValue('modal_message');
                let replyId = interaction.fields.getTextInputValue('modal_reply');

                await interaction.deferReply({ ephemeral: true });

                try {
                    if (replyId) {
                        if (replyId.includes('/')) replyId = replyId.split('/').pop();
                        if (!/^\d+$/.test(replyId)) return interaction.editReply("Error: ID no válido.");

                        const target = await interaction.channel.messages.fetch(replyId);
                        await target.reply({ 
                            content: mensajeModal, 
                            allowedMentions: { repliedUser: false } 
                        });
                    } else {
                        await interaction.channel.send(mensajeModal);
                    }
                    
                    await interaction.deleteReply().catch(() => null);
                } catch (e) {
                    console.error("[MODAL ERROR]:", e);
                    await interaction.editReply("Error: No se encontró el mensaje o faltan permisos.").catch(() => {});
                }
            }
        }

        // Modal VIP
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'vip_color_select') {
                await interaction.deferReply({ ephemeral: true });

                const member = interaction.member;
                const roleId = interaction.values[0];
                const colorIds = config.VIP.colorRoles.map(r => r.roleId).filter(id => id !== 'clear');

                try {
                    // ¿Qué roles de color tiene?
                    const currentColors = member.roles.cache.filter(r => colorIds.includes(r.id)).map(r => r.id);

                    // Quita todos los colores
                    if (roleId === 'clear') {
                        if (currentColors.length > 0) await member.roles.remove(currentColors);
                        return interaction.editReply({ content: "`✅` Se ha quitado tu color." });
                    }

                    // Quita colores viejos
                    if (currentColors.length > 0) {
                        await member.roles.remove(currentColors).catch(() => {});
                    }

                    // Asigna nuevo color
                    await member.roles.add(roleId);
                    
                    const colorLabel = config.VIP.colorRoles.find(r => r.roleId === roleId)?.label || "nuevo";
                    await interaction.editReply({ content: `\`✅\` Has seleccionado el color **${colorLabel}**.` });

                } catch (error) {
                    console.error("[VIP COLOR ERROR]:", error);
                    await interaction.editReply({ content: "`❌` Error de permisos: Asegúrate de que mi rol esté por encima de los roles de colores." }).catch(() => {});
                }
            }
        }
    },
};