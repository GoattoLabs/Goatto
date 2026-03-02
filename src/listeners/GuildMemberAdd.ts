import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, GuildMember } from 'discord.js';
import { addVanityJob } from '../lib/utils/vanity';
import { ActiveMute } from '../database/models/ActiveMute';


// Guild member add listener ──────────────────

@ApplyOptions<Listener.Options>({
    event: Events.GuildMemberAdd
})
export class GuildMemberAddListener extends Listener {
    public async run(member: GuildMember) {
        if (member.user.bot) return;

        // Queue vanity check with a small delay to allow presence to load ──────────
        setTimeout(async () => {
            try {
                await addVanityJob(member);
            } catch (error) {
                this.container.logger.error(`[QUEUE-JOIN] Error adding ${member.id} to queue:`, error);
            }
        }, 2000);

        // Reapply mute if they had one active on leave ──────────
        try {
            const activeMute = await ActiveMute.findOne({
                where: { guildId: member.guild.id, userId: member.id }
            });

            if (!activeMute) return;

            if (activeMute.expiresAt && activeMute.expiresAt < new Date()) {
                await activeMute.destroy();
                return;
            }

            const ms = activeMute.expiresAt
                ? activeMute.expiresAt.getTime() - Date.now()
                : 28 * 24 * 60 * 60 * 1000;

            await member.timeout(ms, 'Reapplied mute on rejoin');
            this.container.logger.info(`[MUTE-REJOIN] Reapplied mute to ${member.user.tag} in ${member.guild.name}`);
        } catch (error) {
            this.container.logger.error(`[MUTE-REJOIN] Failed to reapply mute to ${member.id}:`, error);
        }
    }
}