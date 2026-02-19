const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
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
            return interaction.reply({ content: "`❌` No hay colores configurados.", ephemeral: true });
        }

        const options = roles.map(r => ({ label: r.label, value: r.roleId }));
        const imgPath = path.join(__dirname, "..", "assets", "vipcolors.png");
        const hasLocalImg = fs.existsSync(imgPath);
        
        const imageUrl = hasLocalImg ? "attachment://vipcolors.png" : config.VIP.colorPickerImageUrl;
        
        const payload = getColorPickerLayout(
            config.VIP.colorPickerTitle,
            config.VIP.colorPickerDescription,
            imageUrl,
            options,
        );

        await interaction.deferReply({ ephemeral: true });

        try {
            const sendOptions = { ...payload };
            
            if (hasLocalImg) {
                sendOptions.files = [new AttachmentBuilder(imgPath, { name: 'vipcolors.png' })];
            }

            await channel.send(sendOptions);
            await interaction.editReply("`✅` Selector de colores enviado.");
        } catch (err) {
            console.error("[ERROR /SENDCOLORPICKER]:", err);
            await interaction.editReply("`❌` No pude enviar el selector.").catch(o_O => {});
        }
    },
};