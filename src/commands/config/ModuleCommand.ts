import { Subcommand } from '@sapphire/plugin-subcommands';
import { PermissionFlagsBits, ComponentType, ChannelType } from 'discord.js';
import { GuildConfig } from '../../database/models/GuildConfig';
import { ModuleValidators } from '../../validators/ModuleValidator';
import { CacheManager } from '../../database/CacheManager';
import { getModuleLayout, getResetLayout, getSuccessLayout, getCancelledLayout, getStatusUpdateLayout } from '../../lib/utils/layouts';

export class ModuleCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: 'module',
            description: 'Manage PattoLabs system modules',
            preconditions: ['GuildOnly'],
            subcommands: [
                { name: 'setup', chatInputRun: 'chatInputSetup' },
                { name: 'settings', chatInputRun: 'chatInputSettings' },
                { name: 'enable', chatInputRun: 'chatInputEnable' },
                { name: 'disable', chatInputRun: 'chatInputDisable' },
                { name: 'reset', chatInputRun: 'chatInputReset' }
            ]
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                // Sub: Setup
                .addSubcommand((sub) =>
                    sub
                        .setName('setup')
                        .setDescription('Configure a specific module settings')
                        .addStringOption(opt =>
                            opt.setName('name').setDescription('The name of the module').setRequired(true)
                                .addChoices({ name: 'Vanity Tracker', value: 'vanity' })
                        )
                        // Vanity options
                        .addStringOption(opt => opt.setName('keyword').setDescription('Vanity: Status keyword (e.g., .gg/pattolabs)'))
                        .addRoleOption(opt => opt.setName('role').setDescription('Vanity: Role to be awarded'))
                        .addChannelOption(opt => opt.setName('channel').setDescription('Vanity: Announcement channel').addChannelTypes(ChannelType.GuildText))
                )
                // Sub: Settings
                .addSubcommand((sub) =>
                    sub.setName('settings').setDescription('Show detailed configuration').addStringOption(opt =>
                        opt.setName('name').setDescription('Module name').setRequired(true)
                        .addChoices({ name: 'Vanity Tracker', value: 'vanity' }))
                )
                // Sub: Enable
                .addSubcommand((sub) =>
                    sub.setName('enable').setDescription('Enable module').addStringOption(opt =>
                        opt.setName('name').setDescription('Module name').setRequired(true)
                        .addChoices({ name: 'Vanity Tracker', value: 'vanity' }))
                )
                // Sub: Disable
                .addSubcommand((sub) =>
                    sub.setName('disable').setDescription('Disable module').addStringOption(opt =>
                        opt.setName('name').setDescription('Module name').setRequired(true)
                        .addChoices({ name: 'Vanity Tracker', value: 'vanity' }))
                )
                // Sub: Reset
                .addSubcommand((sub) =>
                    sub.setName('reset').setDescription('Factory reset module').addStringOption(opt =>
                        opt.setName('name').setDescription('Module name').setRequired(true)
                        .addChoices({ name: 'Vanity Tracker', value: 'vanity' }))
                )
        );
    }

    // Setup logic
    public async chatInputSetup(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options, guild } = interaction;
        
        const moduleValue = options.getString('name', true);
        
        const choiceName = interaction.options.get('name')?.value === 'vanity' ? 'Vanity Tracker' : 'Module';

        await interaction.deferReply({ ephemeral: false });

        try {
            if (moduleValue === 'vanity') {
                const keyword = options.getString('keyword');
                const role = options.getRole('role');
                const channel = options.getChannel('channel');

                const [config] = await GuildConfig.findOrCreate({ where: { guildId: guildId! } });

                if (!keyword && !role && !channel) {
                    return interaction.editReply({ content: '`❌` Please specify at least one option to update.' });
                }

                if (keyword) config.vanityString = keyword;
                if (role) {
                    const botMember = await guild!.members.fetch(this.container.client.user!.id);
                    if (role.id !== guild!.roles.everyone.id && (role as any).position >= botMember.roles.highest.position) {
                        return interaction.editReply({ 
                            content: `\`❌\` I cannot assign <@&${role.id}> because it is higher than my highest role.` 
                        });
                    }
                    config.vanityRoleId = role.id;
                }
                if (channel) config.vanityChannelId = channel.id;

                await config.save();
                await CacheManager.syncGuild(guildId!, config);

                const layout = getModuleLayout(moduleValue, config, guild, true);
                
                return interaction.editReply(layout);
            }
            
            return interaction.editReply({ content: `\`❌\` Setup for **${moduleValue}** is not implemented yet.` });
            
        } catch (error) {
            this.container.logger.error(`[MODULE SETUP ERROR] Guild: ${guildId}`, error);
            return interaction.editReply({ content: '`🔴` An error occurred during setup.' });
        }
    }

    // Settings logic
    public async chatInputSettings(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options, guild } = interaction;
        const moduleValue = options.getString('name', true);

        await interaction.deferReply({ ephemeral: false });

        try {
            const config = await GuildConfig.findByPk(guildId!);
            if (!config) return interaction.editReply({ content: '`❌` No configuration found.' });

            const layout = getModuleLayout(moduleValue, config, guild!, false); 
            
            return interaction.editReply(layout);
        } catch (error) {
            this.container.logger.error(`[MODULE SETTINGS ERROR] Guild: ${guildId}`, error);
            return interaction.editReply({ content: '`🔴` An error occurred while fetching settings.' });
        }
    }

// Enable logic
    public async chatInputEnable(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options, guild } = interaction;
        const moduleValue = options.getString('name', true);
        
        const choiceName = interaction.options.get('name')?.value === 'vanity' ? 'Vanity Tracker' : 'Module';

        await interaction.deferReply({ ephemeral: false });

        try {
            const config = await GuildConfig.findByPk(guildId!);
            const validator = ModuleValidators[moduleValue];

            if (!validator) return interaction.editReply({ content: `\`❌\` Module **${choiceName}** not supported.` });

            const { isValid, missing } = await validator(config, guild);
            if (!isValid) {
                return interaction.editReply({
                    content: `\`❌\` **${choiceName}** cannot be enabled:\n${missing?.map(m => `• ${m}`).join('\n')}`
                });
            }

            await config!.update({ [`${moduleValue}Module`]: true });
            await CacheManager.syncGuild(guildId!, config!);

            return interaction.editReply(getStatusUpdateLayout(choiceName, true));

        } catch (error) {
            this.container.logger.error(`[ENABLE ERROR]`, error);
            return interaction.editReply({ content: '`🔴` Error enabling module.' });
        }
    }

    // Disable logic
    public async chatInputDisable(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options } = interaction;
        const moduleValue = options.getString('name', true);
        
        const choiceName = interaction.options.get('name')?.value === 'vanity' ? 'Vanity Tracker' : 'Module';

        await interaction.deferReply({ ephemeral: false });

        try {
            const config = await GuildConfig.findByPk(guildId!);
            
            await config!.update({ [`${moduleValue}Module`]: false });
            await CacheManager.syncGuild(guildId!, config!);

            return interaction.editReply(getStatusUpdateLayout(choiceName, false));

        } catch (error) {
            this.container.logger.error(`[DISABLE ERROR]`, error);
            return interaction.editReply({ content: '`🔴` Error disabling module.' });
        }
    }

    // Reset logic
    public async chatInputReset(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options, user } = interaction;
        const moduleName = options.getString('name', true);
        const confirmId = `confirm_${interaction.id}`;
        const cancelId = `cancel_${interaction.id}`;
        const response = await interaction.reply({ ...getResetLayout(confirmId, cancelId), ephemeral: false, fetchReply: true });
        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000, filter: (i) => i.user.id === user.id });
        collector.on('collect', async (i) => {
            if (i.customId === confirmId) {
                try {
                    if (moduleName === 'vanity') {
                        const config = await GuildConfig.findByPk(guildId!);
                        if (config) {
                            await config.update({ vanityString: null, vanityRoleId: null, vanityChannelId: null, vanityModule: false });
                            await CacheManager.syncGuild(guildId!, config);
                        }
                    }
                    return i.update({ ...getSuccessLayout(moduleName) }).then(() => collector.stop('success'));
                } catch (error) {
                    return i.reply({ content: '`🔴` Error resetting.', ephemeral: false });
                }
            }
            if (i.customId === cancelId) return i.update({ ...getCancelledLayout() }).then(() => collector.stop('cancelled'));
        });
    }
}