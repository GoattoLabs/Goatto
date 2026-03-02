import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';


// Patto reaction listener ──────────────────

@ApplyOptions<Listener.Options>({
    event: Events.MessageCreate
})
export class PattoReactionListener extends Listener {
    public async run(message: Message) {
        if (message.author.bot || !message.guild) return;

        if (/\bpatto\b/i.test(message.content)) {
            await message.react('🦆').catch(() => {});
        }
    }
}