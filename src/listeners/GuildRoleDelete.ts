import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, Role } from 'discord.js';
import { GuildConfig } from '../database/models/GuildConfig';
import { CacheManager } from '../database/CacheManager';


// Guild role delete listener ──────────────────

@ApplyOptions<Listener.Options>({
    event: Events.GuildRoleDelete
})
export class GuildRoleDeleteListener extends Listener {
    public async run(role: Role) {
        const guildId = role.guild.id;

        try {
            const config = await GuildConfig.findOne({ where: { guildId } });
            if (!config) return;

            let changed = false;

            if (config.mutedRoleId === role.id) {
                config.mutedRoleId = null;
                config.modModule = false;
                changed = true;
                this.container.logger.info(`[ROLE-DELETE] Muted role deleted in ${role.guild.name}, clearing from config`);
            }

            if (config.vanityRoleId === role.id) {
                config.vanityRoleId = null;
                config.vanityModule = false;
                changed = true;
                this.container.logger.info(`[ROLE-DELETE] Vanity role deleted in ${role.guild.name}, clearing from config`);
            }

            if (!changed) return;

            await config.save();
            await CacheManager.syncGuild(guildId, config);
        } catch (error) {
            this.container.logger.error(`[ROLE-DELETE] Error handling role deletion in ${role.guild.name}:`, error);
        }
    }
}