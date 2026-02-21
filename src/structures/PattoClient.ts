import { Client, ClientOptions, Collection } from 'discord.js';

export class PattoClient extends Client {
    public commands: Collection<string, any> = new Collection();

    constructor(options: ClientOptions) {
        super(options);
    }

    public async start(token: string) {
        console.log('–––– 🦆 PATTO LABS CORE ––––');
        try {
            await this.login(token);
            console.log(`[SYSTEM] 🟢 Patto online como: ${this.user?.tag}`);
        } catch (error) {
            console.error('[SYSTEM] 🔴 Patto no despertó:', error);
        }
    }
}