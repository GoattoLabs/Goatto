import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { GuildConfig } from '../database/models/GuildConfig';

export class ReadyListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: true,
            event: Events.ClientReady
        });
    }

    public async run() {
        const { container } = this;
        container.logger.info(`[SYSTEM] Logged in as ${container.client.user?.tag}`);

        try {
            const configs = await GuildConfig.findAll();
            
            for (const config of configs) {
                const { guildId, vanityString, vanityRoleId, vanityEnabled, vanityChannelId } = config;
                
                if (vanityString) await container.redis.set(`vanity:string:${guildId}`, vanityString);
                if (vanityRoleId) await container.redis.set(`vanity:role:${guildId}`, vanityRoleId);
                if (vanityChannelId) await container.redis.set(`vanity:channel:${guildId}`, vanityChannelId);
                
                await container.redis.set(`vanity:enabled:${guildId}`, String(vanityEnabled));
            }
            
            container.logger.info(`[SYNC] Redis cache warmed up with ${configs.length} configs.`);
        } catch (error) {
            container.logger.error('[SYNC] Failed to warm up Redis:', error);
        }
    }
}