import { GuildMember, ActivityType, TextChannel } from 'discord.js';
import { container } from '@sapphire/framework';
import { Queue } from 'bullmq';
import { getVanityWelcomeLayout } from './layouts';
import { sendPattoLog } from './webhook';
import { Redis } from 'ioredis';


// Vanity utils ──────────────────

let _vanityQueue: Queue | null = null;


// Returns (or creates) the vanity role queue ──────────

function getQueue() {
    if (!_vanityQueue) {
        const queueConnection = new Redis({
            ...container.redis?.options,
            maxRetriesPerRequest: null,
        });

        _vanityQueue = new Queue('vanity-roles', {
            connection: queueConnection as any,
            prefix: 'patto-vanity'
        });
    }
    return _vanityQueue;
}


// Adds a vanity role check job to the queue ──────────

export async function addVanityJob(member: GuildMember) {
    try {
        const queue = getQueue();
        await queue.add(
            'check-role',
            { memberId: member.id, guildId: member.guild.id },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true,
                removeOnFail: { count: 10 },
                delay: 1000
            }
        );
    } catch (error) {
        container.logger.error(`[QUEUE-FATAL] Could not add job: ${error}`);
    }
}


// Checks if a member should have the vanity role and adds/removes it accordingly ──────────

export async function checkVanity(member: GuildMember) {
    const { guild } = member;
    if (!guild || member.user.bot) return;

    const { redis, logger } = container;

    try {
        const [vanityModule, vanityString, vanityRoleId, logChannelId] = await redis.mget(
            `vanity:module:${guild.id}`,
            `vanity:string:${guild.id}`,
            `vanity:role:${guild.id}`,
            `vanity:log_channel:${guild.id}`
        );

        if (!vanityModule || (vanityModule !== 'true' && vanityModule !== '1') || !vanityString || !vanityRoleId) return;

        const currentStatus = member.presence?.activities.find(a => a.type === ActivityType.Custom)?.state;
        const hasKeyword = currentStatus?.toLowerCase().includes(vanityString.toLowerCase());
        const hasRole = member.roles.cache.has(vanityRoleId);

        const role = guild.roles.cache.get(vanityRoleId) || await guild.roles.fetch(vanityRoleId).catch(() => null);
        if (!role) {
            logger.warn(`[VANITY] Role ${vanityRoleId} not found in ${guild.name}`);
            return;
        }

        if (hasKeyword && !hasRole) {
            await member.roles.add(role);
            logger.info(`➕ [VANITY] Role added to ${member.user.tag}`);

            if (logChannelId) {
                const channel = guild.channels.cache.get(logChannelId) as TextChannel;
                if (channel) {
                    const avatar = member.user.displayAvatarURL({ extension: 'png', size: 512 });
                    const welcomeLayout = getVanityWelcomeLayout(member.id, vanityRoleId, avatar);
                    sendPattoLog(channel, welcomeLayout).catch((err) => logger.error(`[LOG-ERROR] ${err}`));
                }
            }
        } else if (!hasKeyword && hasRole) {
            await member.roles.remove(role);
            logger.info(`➖ [VANITY] Role removed from ${member.user.tag}`);
        }
    } catch (error: any) {
        if (error.code === 50013) {
            logger.error(`[VANITY] Permission Error: Bot cannot manage roles in ${guild.name}. Check hierarchy.`);
        } else {
            logger.error(`[VANITY] Unexpected error in checkVanity:`, error);
        }
    }
}