import { container } from '@sapphire/framework';
import type { GuildConfig } from './models/GuildConfig';

export class CacheManager {
    public static async syncGuild(guildId: string, config: GuildConfig) {
        const { redis, logger } = container;
        const pipeline = redis.pipeline();

        try {
            if (config.vanityString) pipeline.set(`vanity:string:${guildId}`, config.vanityString);
            if (config.vanityRoleId) pipeline.set(`vanity:role:${guildId}`, config.vanityRoleId);
            if (config.vanityChannelId) pipeline.set(`vanity:channel:${guildId}`, config.vanityChannelId);
            
            pipeline.set(`vanity:module:${guildId}`, String(config.vanityModule));

            await pipeline.exec();
        } catch (error) {
            logger.error(`[CACHE_MANAGER] Failed to sync guild ${guildId}:`, error);
        }
    }

    public static async clearGuild(guildId: string) {
        const { redis } = container;
        const keys = await redis.keys(`*:${guildId}`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
}