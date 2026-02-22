import 'dotenv/config';
import './structures/Redis'; 
import { connectDB } from './database/db';
import { PattoClient } from './structures/PattoClient';
import { container } from '@sapphire/framework';

const client = new PattoClient();

async function bootstrap() {
    try {
        await connectDB();

        await client.start(process.env.DISCORD_TOKEN!);
        
    } catch (error) {
        container.logger.error('🔴 [BOOTSTRAP] Fatal error during startup:', error);
        
        process.exit(1);
    }
}

bootstrap();