import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';


// Caramel reaction listener ──────────────────

@ApplyOptions<Listener.Options>({
    event: Events.MessageCreate
})
export class CaramelReactionListener extends Listener {
    public async run(message: Message) {
        if (message.author.bot || !message.guild) return;

        if (/\bcaramel\b/i.test(message.content)) {
            await message.react('🍬').catch(() => {});
        }
    }
}