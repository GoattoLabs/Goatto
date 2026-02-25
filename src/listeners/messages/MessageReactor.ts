import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate
})
export class PattoReactionListener extends Listener {
	public async run(message: Message) {
		if (message.author.bot || !message.guild) return;

		const pattoRegex = /\bpatto\b/i;

		if (pattoRegex.test(message.content)) {
			try {
				await message.react('🦆');
			} catch {
			}
		}
	}
}