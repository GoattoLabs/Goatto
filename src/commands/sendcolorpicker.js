const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../config.js");
const { getColorPickerLayout } = require("../utils/layouts.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sendcolorpicker")
        .setDescription("Envía el menú de selección de colores")
        .addChannelOption(opt => opt.setName("canal").setDescription("Canal de destino"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, GuildSettings) {
        const channel = interaction.options.getChannel("canal") ?? interaction.channel;
        const roles = config.VIP?.colorRoles ?? [];
        
        if (roles.length === 0) {
            return interaction.reply({ content: "`❌` No hay colores configurados.", flags: MessageFlags.Ephemeral });
        }

        // Validar que el canal existe y es válido
        if (!channel) {
            return interaction.reply({ content: "`❌` Canal no encontrado.", flags: MessageFlags.Ephemeral });
        }

        // Validar que el bot puede enviar mensajes en el canal
        if (!channel.permissionsFor(interaction.guild.members.me)?.has("SendMessages")) {
            return interaction.reply({ content: "`❌` No tengo permisos para enviar mensajes en ese canal.", flags: MessageFlags.Ephemeral });
        }

        // Validar que el bot puede usar componentes embebidos
        if (!channel.permissionsFor(interaction.guild.members.me)?.has("EmbedLinks")) {
            return interaction.reply({ content: "`❌` No tengo permisos para enviar embeds en ese canal.", flags: MessageFlags.Ephemeral });
        }

        const options = roles.map(r => ({ label: r.label, value: r.roleId }));
        const imgPath = path.join(__dirname, "..", "assets", "vipcolors.png");
        const hasLocalImg = fs.existsSync(imgPath);
        
        const imageUrl = hasLocalImg ? "attachment://vipcolors.png" : config.VIP.colorPickerImageUrl;
        
        const payload = getColorPickerLayout(
            config.VIP.colorPickerTitle || "Selector de Colores",
            config.VIP.colorPickerDescription || "Selecciona un color",
            imageUrl,
            options,
        );

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const sendOptions = { ...payload };
            
            if (hasLocalImg) {
                sendOptions.files = [new AttachmentBuilder(imgPath, { name: 'vipcolors.png' })];
            }

            await channel.send(sendOptions);
            const logger = require("../services/logger");
            logger.info(`[COMMAND] ✅ /sendcolorpicker ejecutado por ${interaction.user.tag} en ${interaction.guild.name} (canal: ${channel.name})`);
            await interaction.editReply("`✅` Selector de colores enviado.");
        } catch (err) {
            const logger = require("../services/logger");
            logger.error("[ERROR /SENDCOLORPICKER]:", err);
            await interaction.editReply("`❌` No pude enviar el selector.").catch(() => {});
        }
    },
};