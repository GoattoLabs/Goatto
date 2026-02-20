const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Escribe a través del bot')
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('Contenido del mensaje')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('respuesta')
                .setDescription('Agrega el ID de un mensaje para responderlo')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const content = interaction.options.getString('mensaje');
        const idInput = interaction.options.getString('respuesta');

        // Si solo se manda "/say", se abre el modal
        if (!content) {
            const modal = new ModalBuilder()
                .setCustomId(`modal_say`) 
                .setTitle('Nuevo mensaje');

            const textInput = new TextInputBuilder()
                .setCustomId('modal_message')
                .setLabel("Escribe a través del bot")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Contenido del mensaje')
                .setMaxLength(2000)
                .setRequired(true);

            const idInputModal = new TextInputBuilder()
                .setCustomId('modal_reply')
                .setLabel("ID o Link del mensaje a responder (Opcional)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Agrega el ID aquí')
                .setValue(idInput || "")
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(textInput),
                new ActionRowBuilder().addComponents(idInputModal)
            );
            
            return await interaction.showModal(modal);
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Validar que el bot puede enviar mensajes en el canal
            if (!interaction.channel.permissionsFor(interaction.guild.members.me)?.has("SendMessages")) {
                return await interaction.editReply('❌ No tengo permisos para enviar mensajes en este canal.');
            }

            if (idInput) {
                let messageId = idInput.includes('/') ? idInput.split('/').pop() : idInput;

                if (!/^\d+$/.test(messageId)) {
                    return await interaction.editReply('❌ ID o Link inválido.');
                }

                try {
                    const target = await interaction.channel.messages.fetch(messageId);
                    
                    // Validar que el bot puede responder al mensaje
                    if (!target) {
                        return await interaction.editReply('❌ Mensaje no encontrado.');
                    }

                    await target.reply({ 
                        content,
                        allowedMentions: { repliedUser: false } 
                    });
                    
                    const logger = require("../services/logger");
                    logger.info(`[COMMAND] ✅ /say ejecutado por ${interaction.user.tag} en ${interaction.guild.name} (respondiendo a ${messageId})`);
                } catch (fetchError) {
                    if (fetchError.code === 10008) { // Unknown Message
                        return await interaction.editReply('❌ Mensaje no encontrado. Verifica que el ID sea correcto y que el mensaje esté en este canal.');
                    }
                    throw fetchError;
                }
            } else {
                await interaction.channel.send(content);
                const logger = require("../services/logger");
                logger.info(`[COMMAND] ✅ /say ejecutado por ${interaction.user.tag} en ${interaction.guild.name}`);
            }

            await interaction.deleteReply().catch(() => {});

        } catch (err) {
            const logger = require("../services/logger");
            logger.error("[ERROR /SAY]:", err);
            await interaction.editReply('❌ No se pudo enviar el mensaje.').catch(() => {});
        }
    },
};