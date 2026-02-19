const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

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

        await interaction.deferReply({ ephemeral: true });

        try {
            if (idInput) {
                let messageId = idInput.includes('/') ? idInput.split('/').pop() : idInput;

                if (!/^\d+$/.test(messageId)) {
                    return interaction.editReply('❌ ID o Link inválido.');
                }

                const target = await interaction.channel.messages.fetch(messageId);
                await target.reply({ 
                    content,
                    allowedMentions: { repliedUser: false } 
                });
            } else {
                await interaction.channel.send(content);
            }

            await interaction.deleteReply().catch(_ => {});

        } catch (err) {
            console.error("[ERROR /SAY]:", err);
            await interaction.editReply('❌ No se pudo enviar el mensaje.').catch(o_O => {});
        }
    },
};