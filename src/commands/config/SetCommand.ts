import { Subcommand } from '@sapphire/plugin-subcommands';
import { PermissionFlagsBits, ChannelType } from 'discord.js';
import { GuildConfig } from '../../database/models/GuildConfig';

export class SetCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: 'set',
            description: 'Configure bot module settings',
            subcommands: [
                { name: 'vanity', chatInputRun: 'chatInputVanity' }
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
                        .setName('vanity')
                        .setDescription('Configure the Vanity Tracker settings')
                        .addStringOption(opt => 
                            opt.setName('keyword')
                               .setDescription('The status keyword (e.g., .gg/pattolabs)')
                               .setRequired(false)
                        )
                        .addRoleOption(opt => 
                            opt.setName('role')
                               .setDescription('The role to be awarded')
                               .setRequired(false)
                        )
                        .addChannelOption(opt => 
                            opt.setName('channel')
                                .setDescription('Announcement channel for thanks (Webhook)')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false)
                        )
                )
        );
    }

    public async chatInputVanity(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options, guild } = interaction;
        if (!guildId || !guild) return;

        await interaction.deferReply({ ephemeral: true });

        const keyword = options.getString('keyword');
        const role = options.getRole('role');
        const channel = options.getChannel('channel');

        const { redis, logger } = this.container;

        try {
            const [config] = await GuildConfig.findOrCreate({ where: { guildId } });
            const feedback: string[] = [];

            if (keyword) {
                config.vanityString = keyword;
                await redis.set(`vanity:string:${guildId}`, keyword);
                feedback.push(`✅ Keyword set to: \`${keyword}\``);
            }

            if (role) {
                const botMember = await guild.members.fetch(this.container.client.user!.id);
                if (role.position >= botMember.roles.highest.position) {
                    return interaction.editReply({
                        content: `❌ I cannot assign <@&${role.id}>. It is higher than my role!`
                    });
                }

                config.vanityRoleId = role.id;
                await redis.set(`vanity:role:${guildId}`, role.id);
                feedback.push(`✅ Role set to: <@&${role.id}>`);
            }

            if (channel) {
                config.vanityLogChannel = channel.id;
                await redis.set(`vanity:log_channel:${guildId}`, channel.id);
                feedback.push(`✅ Log channel set to: <#${channel.id}>`);
            }

            if (feedback.length === 0) {
                return interaction.editReply({ content: '❌ Please specify at least one option to update.' });
            }

            await config.save();
            
            return interaction.editReply({
                content: `### ⚙️ Vanity Configuration Updated\n${feedback.join('\n')}\n\n> *Reminder: Enable the module with \`/module enable\`*`
            });

        } catch (error: any) {
            logger.error(`[COMMAND SET] Error in guild ${guildId}:`, error);
            return interaction.editReply({ content: '🔴 An error occurred while saving the configuration.' });
        }
    }
}