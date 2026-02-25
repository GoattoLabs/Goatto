import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Presence, Events, ActivityType } from 'discord.js';
import { addVanityJob } from '../lib/utils/vanity';

@ApplyOptions<Listener.Options>({
    event: Events.PresenceUpdate
})
export class PresenceUpdateListener extends Listener {
    public async run(oldPresence: Presence | null, newPresence: Presence) {
        const { guild, member } = newPresence;

        if (!guild || !member || member.user.bot) return;

        const oldStatus = oldPresence?.activities.find(a => a.type === ActivityType.Custom)?.state;
        const newStatus = newPresence.activities.find(a => a.type === ActivityType.Custom)?.state;

        this.container.logger.info(`🔗 [VANITY] ${member.user.tag} - Old Status: ${oldStatus} | New Status: ${newStatus}`);

        if (oldStatus !== newStatus) {
            this.container.logger.info(`🔰 [VANITY] Status detected on ${member.user.tag}. Sending job to queue.`);
            
            try {
                await addVanityJob(member);
                this.container.logger.info(`🟢 [VANITY] Job sent successfuly for ${member.user.tag}`);
            } catch (error) {
                this.container.logger.error(`[QUEUE-ERROR] ${error}`);
            }
        }
    }
}