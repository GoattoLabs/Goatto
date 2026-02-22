import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, ComponentType, Routes } from 'discord.js';
import { GuildConfig } from '../../database/models/GuildConfig'; 
import { getResetLayout, getSuccessLayout, getCancelledLayout } from '../../lib/utils/layouts'; 

export class ResetCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'reset',
            description: 'Factory reset a specific module',
            preconditions: ['GuildOnly'],
            requiredUserPermissions: [PermissionFlagsBits.Administrator]
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addStringOption(option =>
                    option
                        .setName('module')
                        .setDescription('The module to reset')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Vanity Tracker', value: 'vanity' }
                        )
                )
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guildId, options, user } = interaction;
        const moduleValue = options.getString('module', true);
        const { redis } = this.container;

        const confirmId = `confirm_${interaction.id}`;
        const cancelId = `cancel_${interaction.id}`;

        // Send ask embed
        await this.container.client.rest.post(
            Routes.interactionCallback(interaction.id, interaction.token),
            {
                body: {
                    type: 4, 
                    data: getResetLayout(confirmId, cancelId)
                }
            }
        );

        const response = await interaction.fetchReply();
        
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000, // 20 seconds
            filter: (i) => i.user.id === user.id
        });

        collector.on('collect', async (i) => {
            if (i.customId === confirmId) {
                const moduleNames: Record<string, string> = {
                    vanity: 'Vanity Tracker'
                };
                const friendlyName = moduleNames[moduleValue] || moduleValue;

                // DB logic
                if (moduleValue === 'vanity') {
                    await GuildConfig.update({
                        vanityString: null,
                        vanityRoleId: null,
                        vanityChannelId: null,
                        vanityEnabled: false
                    }, { where: { guildId: guildId! } });

                    // Redis cleaner
                    const keys = [
                        `vanity:string:${guildId}`,
                        `vanity:enabled:${guildId}`
                    ];
                    await redis.del(...keys);
                }

                // Answer 1, show success embed
                return i.update({
                    ...getSuccessLayout(friendlyName)
                }).then(() => collector.stop('success'));
            }

            if (i.customId === cancelId) {
                // Answet 2, show cancelled embed
                return i.update({
                    ...getCancelledLayout()
                }).then(() => collector.stop('cancelled'));
            }
        });

        collector.on('end', (_collected, reason) => {
            // If time runs out, edit to delete buttons and show cancelled embed
            if (reason === 'time') {
                interaction.editReply({
                    ...getCancelledLayout()
                }).catch(() => null);
            }
        });
    }
}