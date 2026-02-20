const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require("discord.js");
const BlacklistService = require("../services/blacklistService");
const logger = require("../services/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blacklist")
        .setDescription("Gestiona la blacklist/whitelist de usuarios")
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Añade un usuario a la blacklist")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("El usuario a añadir")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("razon")
                        .setDescription("Razón (opcional)")
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Elimina un usuario de la blacklist/whitelist")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("El usuario a eliminar")
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("Lista usuarios en blacklist/whitelist")
                .addStringOption(opt =>
                    opt.setName("tipo")
                        .setDescription("Tipo de lista")
                        .addChoices(
                            { name: "Blacklist", value: "blacklist" },
                            { name: "Whitelist", value: "whitelist" }
                        )
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName("whitelist")
                .setDescription("Añade un usuario a la whitelist")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("El usuario a añadir")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("razon")
                        .setDescription("Razón (opcional)")
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, GuildSettings, client, Blacklist) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === "add") {
                const user = interaction.options.getUser("usuario");
                const reason = interaction.options.getString("razon") || "Sin razón especificada";

                await BlacklistService.addToBlacklist(
                    interaction.guild.id,
                    user.id,
                    reason,
                    interaction.user.id,
                    Blacklist
                );

                await interaction.editReply(`\`✅\` Usuario ${user.tag} añadido a la blacklist.`);
                logger.info(`[COMMAND] ✅ /blacklist add ejecutado por ${interaction.user.tag} para ${user.tag}`);

            } else if (subcommand === "remove") {
                const user = interaction.options.getUser("usuario");

                const removed = await BlacklistService.remove(
                    interaction.guild.id,
                    user.id,
                    Blacklist
                );

                if (removed) {
                    await interaction.editReply(`\`✅\` Usuario ${user.tag} eliminado de la blacklist/whitelist.`);
                } else {
                    await interaction.editReply(`\`❌\` Usuario ${user.tag} no está en la blacklist/whitelist.`);
                }
                logger.info(`[COMMAND] ✅ /blacklist remove ejecutado por ${interaction.user.tag} para ${user.tag}`);

            } else if (subcommand === "list") {
                const type = interaction.options.getString("tipo");

                const entries = await BlacklistService.list(
                    interaction.guild.id,
                    type,
                    Blacklist
                );

                if (entries.length === 0) {
                    return await interaction.editReply(`\`ℹ️\` No hay usuarios en la ${type || "blacklist/whitelist"}.`);
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${type === "whitelist" ? "✅" : "🚫"} ${type ? type.charAt(0).toUpperCase() + type.slice(1) : "Blacklist/Whitelist"}`)
                    .setColor(type === "whitelist" ? 0x57F287 : 0xED4245)
                    .setTimestamp();

                const list = entries.slice(0, 20).map((entry, index) => {
                    const user = client.users.cache.get(entry.userId);
                    return `${index + 1}. ${user ? user.tag : entry.userId}${entry.reason ? ` - ${entry.reason}` : ""}`;
                }).join("\n");

                embed.setDescription(list);
                if (entries.length > 20) {
                    embed.setFooter({ text: `Mostrando 20 de ${entries.length} usuarios` });
                }

                await interaction.editReply({ embeds: [embed] });
                logger.info(`[COMMAND] ✅ /blacklist list ejecutado por ${interaction.user.tag}`);

            } else if (subcommand === "whitelist") {
                const user = interaction.options.getUser("usuario");
                const reason = interaction.options.getString("razon") || "Sin razón especificada";

                await BlacklistService.addToWhitelist(
                    interaction.guild.id,
                    user.id,
                    reason,
                    interaction.user.id,
                    Blacklist
                );

                await interaction.editReply(`\`✅\` Usuario ${user.tag} añadido a la whitelist.`);
                logger.info(`[COMMAND] ✅ /blacklist whitelist ejecutado por ${interaction.user.tag} para ${user.tag}`);
            }

        } catch (err) {
            logger.error("[ERROR /BLACKLIST]:", err);
            await interaction.editReply("`❌` Error al gestionar la blacklist.").catch(() => {});
        }
    },
};
