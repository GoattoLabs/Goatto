import { Listener } from '@sapphire/framework';
import { Presence, Events, TextChannel } from 'discord.js';
import { GuildConfig } from '../database/models/GuildConfig';
import { sendPattoLog } from '../lib/utils/webhook';
import { getVanityWelcomeLayout } from '../lib/utils/layouts';

export class PresenceUpdateListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.PresenceUpdate 
        });
    }

    public async run(_oldPresence: Presence | null, newPresence: Presence) {
        const { guild, member } = newPresence;

        if (!guild || !member || member.user.bot) return;

        const { redis, logger } = this.container;

        try {
            const isEnabled = await redis.get(`vanity:enabled:${guild.id}`);
            if (isEnabled !== 'true') return;

            const vanityString = await redis.get(`vanity:string:${guild.id}`);
            const vanityRoleId = await redis.get(`vanity:role:${guild.id}`);
            const logChannelId = await redis.get(`vanity:log_channel:${guild.id}`); // <-- Nuevo

            if (!vanityString || !vanityRoleId) return;

            const roleExists = guild.roles.cache.has(vanityRoleId);
            if (!roleExists) {
                logger.warn(`[VANITY] Role ${vanityRoleId} not found in guild ${guild.id}. Disabling module.`);
                await redis.del(`vanity:enabled:${guild.id}`);
                await GuildConfig.update({ vanityEnabled: false }, { where: { guildId: guild.id } });
                return;
            }

            const customStatus = newPresence.activities.find(a => a.name === 'Custom Status');
            const hasKeyword = customStatus?.state?.includes(vanityString);
            const hasRole = member.roles.cache.has(vanityRoleId);

            // CASO 1: SE PONE LA VANITY (Gana el rol + Mensaje)
            if (hasKeyword && !hasRole) {
                await member.roles.add(vanityRoleId);
                logger.info(`[VANITY] Added role to ${member.user.tag} in ${guild.name}`);

                // Lógica del Webhook con tu Layout
                if (logChannelId) {
                    const channel = guild.channels.cache.get(logChannelId) as TextChannel;
                    if (channel) {
                        const welcomeLayout = getVanityWelcomeLayout(
                            member.id, 
                            vanityRoleId, 
                            member.user.displayAvatarURL({ extension: 'png', size: 512 })
                        );
                        await sendPattoLog(channel, welcomeLayout);
                    }
                }
            } 
            // CASO 2: SE QUITA LA VANITY (Solo pierde el rol)
            else if (!hasKeyword && hasRole) {
                await member.roles.remove(vanityRoleId);
                logger.info(`[VANITY] Removed role from ${member.user.tag} in ${guild.name}`);
            }

        } catch (error: any) {
            if (error.code === 50013) {
                logger.error(`[VANITY] Missing Permissions to manage roles in ${guild.name}.`);
            } else {
                logger.error(`[VANITY] Unexpected error in PresenceUpdate:`, error);
            }
        }
    }
}