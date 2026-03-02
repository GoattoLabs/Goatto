import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { GuildConfig } from '../database/models/GuildConfig';
import { CacheManager } from '../database/CacheManager';


// Ready listener ──────────────────

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

        try {
            const configs = await GuildConfig.findAll();

            if (configs.length === 0) {
                container.logger.info('[SYNC] No configurations found in database to cache.');
            } else {
                await Promise.all(configs.map((config) => CacheManager.syncGuild(config.guildId, config)));
                container.logger.info(`📊 [REDIS] Redis cache warmed up with ${configs.length} configs.`);
            }
        } catch (error) {
            container.logger.error('[SYNC] Failed to warm up Redis cache:', error);
        }
    }
}