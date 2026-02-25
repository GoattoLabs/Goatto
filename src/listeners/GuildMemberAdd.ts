import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from "@sapphire/framework";
import { Events, GuildMember } from "discord.js";
import { addVanityJob } from '../lib/utils/vanity';

@ApplyOptions<Listener.Options>({
    event: Events.GuildMemberAdd
})
export class GuildMemberAddListener extends Listener {
    public async run(member: GuildMember) {
        if (member.user.bot) return;

        setTimeout(async () => {
            try {
                await addVanityJob(member);
            } catch (error) {
                this.container.logger.error(`[QUEUE-JOIN] Error adding ${member.id} to queue:`, error);
            }
        }, 2000); 
    }
}