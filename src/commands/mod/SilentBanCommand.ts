import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord.js';
import { addSilentBan, removeSilentBan, listSilentBans } from '../../services/SilentBanService';
import { getSilentBanLayout } from '../../lib/utils/layouts';
import { Emojis } from '../../lib/constants/emojis';


// Constants ──────────────────

// Duration options for silentban ──────────

const DURATION_MAP: Record<string, number> = {
    '30m': 30 * 60 * 1000,
    '1h':   1 * 60 * 60 * 1000,
    '6h':   6 * 60 * 60 * 1000,
    '1d':  24 * 60 * 60 * 1000,
    '7d':   7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};


// Silentban command ──────────────────

@ApplyOptions<Subcommand.Options>({
    name: 'silentban',
    description: 'Manage silent bans',
    preconditions: ['GuildOnly'],
    subcommands: [
        { name: 'add',    chatInputRun: 'chatInputAdd'    },
        { name: 'remove', chatInputRun: 'chatInputRemove' },
        { name: 'list',   chatInputRun: 'chatInputList'   }
    ]
})
export class SilentBanCommand extends Subcommand {
    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand((sub) =>
                    sub
                        .setName('add')
                        .setDescription('Apply a silent ban to a user')
                        .addUserOption((opt) => opt.setName('user').setDescription('The user to silent ban').setRequired(true))
                        .addStringOption((opt) =>
                            opt
                                .setName('duration')
                                .setDescription('Ban duration')
                                .addChoices(
                                    { name: '30 minutes', value: '30m' },
                                    { name: '1 hour',     value: '1h'  },
                                    { name: '6 hours',    value: '6h'  },
                                    { name: '1 day',      value: '1d'  },
                                    { name: '7 days',     value: '7d'  },
                                    { name: '30 days',    value: '30d' }
                                )
                        )
                        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the silent ban'))
                )
                .addSubcommand((sub) =>
                    sub
                        .setName('remove')
                        .setDescription('Remove a silent ban')
                        .addUserOption((opt) => opt.setName('user').setDescription('The user to unban').setRequired(true))
                )
                .addSubcommand((sub) => sub.setName('list').setDescription('List all active silent bans'))
        );
    }


    // Add ──────────

    public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });
        const { SilentBan } = (this.container as any).models ?? {};
        if (!SilentBan) return interaction.editReply('`❌` Silent ban system is unavailable.');

        const target   = interaction.options.getUser('user', true);
        const duration = interaction.options.getString('duration');
        const reason   = interaction.options.getString('reason')?.slice(0, 500) ?? null;

        if (target.id === interaction.user.id) return interaction.editReply("`❌` You can't silent ban yourself.");
        if (target.bot) return interaction.editReply("`❌` You can't silent ban bots.");

        const durationMs = duration ? DURATION_MAP[duration] : null;

        try {
            await addSilentBan(interaction.guildId!, target.id, interaction.user.id, reason, durationMs, SilentBan);
            return interaction.editReply(getSilentBanLayout('add', { userTag: target.username, duration: duration ?? 'Permanent', reason }));
        } catch (error) {
            this.container.logger.error(error);
            return interaction.editReply('`❌` Error applying the silent ban.');
        }
    }


    // Remove ──────────

    public async chatInputRemove(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });
        const { SilentBan } = (this.container as any).models ?? {};
        const target = interaction.options.getUser('user', true);

        try {
            await removeSilentBan(interaction.guildId!, target.id, SilentBan);
            return interaction.editReply(getSilentBanLayout('remove', { userTag: target.username }));
        } catch (error) {
            this.container.logger.error(error);
            return interaction.editReply('`❌` Error removing the silent ban.');
        }
    }


    // List ──────────

    public async chatInputList(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });
        const { SilentBan } = (this.container as any).models ?? {};

        try {
            const bans = await listSilentBans(interaction.guildId!, SilentBan);
            if (bans.length === 0) return interaction.editReply('`📋` No active silent bans.');

            const listText = bans.map((ban: any) =>
                `${Emojis.bullet_emoji} <@${ban.userId}> › expires ${this.formatExpiry(ban.expiresAt)}`
            ).join('\n');

            return interaction.editReply(getSilentBanLayout('list', { count: bans.length, listText }));
        } catch (error) {
            this.container.logger.error(error);
            return interaction.editReply('`❌` Error listing silent bans.');
        }
    }


    // Formats a date as a Discord timestamp ──────────

    private formatExpiry(date: Date | null) {
        if (!date) return '`Never`';
        return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
    }
}