import 'dotenv/config';
import { GatewayIntentBits, Partials } from 'discord.js';
import { PattoClient } from './structures/PattoClient';

const client = new PattoClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.GuildMember, Partials.User]
});

client.start(process.env.DISCORD_TOKEN!);