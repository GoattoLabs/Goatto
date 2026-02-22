import { Subcommand } from '@sapphire/plugin-subcommands';
import { PermissionFlagsBits } from 'discord.js';
import { GuildConfig } from '../../database/models/GuildConfig';

export class ModuleCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: 'module',
            description: 'Enable or disable bot modules',
            preconditions: ['GuildOnly'],
            subcommands: [
                { name: 'enable', chatInputRun: 'chatInputEnable' },
                { name: 'disable', chatInputRun: 'chatInputDisable' }
            ]
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand((sub) =>
                    sub
                        .setName('enable')
                        .setDescription('Enable a specific module')
                        .addStringOption(opt =>
                            opt.setName('name')
                                .setDescription('The name of the module')
                                .setRequired(true)
                                .addChoices({ name: 'Vanity Tracker', value: 'vanity' })
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName('disable')
                        .setDescription('Disable a specific module')
                        .addStringOption(opt =>
                            opt.setName('name')
                                .setDescription('The name of the module')
                                .setRequired(true)
                                .addChoices({ name: 'Vanity Tracker', value: 'vanity' })
                        )
                )
        );
    }

    public async chatInputEnable(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options } = interaction;
        const moduleName = options.getString('name', true);
        const { redis, logger } = this.container;

        await interaction.deferReply({ ephemeral: true });

        try {
            if (moduleName === 'vanity') {
                const config = await GuildConfig.findByPk(guildId!);

                if (!config?.vanityRoleId || !config?.vanityString) {
                    return interaction.editReply({
                        content: '❌ **Vanity Tracker** cannot be enabled. Please configure the **keyword** and **role** first using `/set vanity`.'
                    });
                }

                await config.update({ vanityEnabled: true });
                await redis.set(`vanity:enabled:${guildId}`, 'true');

                return interaction.editReply({ content: '🟢 **Vanity Tracker** has been enabled and is now monitoring presences.' });
            }

            return interaction.editReply({ content: '❌ Unknown module.' });

        } catch (error: any) {
            logger.error(`[MODULE ENABLE ERROR] Guild: ${guildId}`, error);
            return interaction.editReply({ content: '🔴 An error occurred while enabling the module.' });
        }
    }

    public async chatInputDisable(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options } = interaction;
        const moduleName = options.getString('name', true);
        const { redis, logger } = this.container;

        await interaction.deferReply({ ephemeral: true });

        try {
            if (moduleName === 'vanity') {
                await GuildConfig.update({ vanityEnabled: false }, { where: { guildId: guildId! } });
                await redis.set(`vanity:enabled:${guildId}`, 'false');

                return interaction.editReply({ content: '⚪ **Vanity Tracker** has been disabled.' });
            }

            return interaction.editReply({ content: '❌ Unknown module.' });

        } catch (error: any) {
            logger.error(`[MODULE DISABLE ERROR] Guild: ${guildId}`, error);
            return interaction.editReply({ content: '🔴 An error occurred while disabling the module.' });
        }
    }
}