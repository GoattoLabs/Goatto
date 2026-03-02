import 'dotenv/config';
import './database/Redis';
import { connectDB, sequelize } from './database/db';
import { CaramelClient } from './structures/CaramelClient';
import { container } from '@sapphire/framework';
import { setupVanityWorker } from './workers/VanityWorker';
import { setupSilentBanWorker } from './workers/SilentBanWorker';
import { setupMuteWorker } from './workers/MuteWorker';


// Bootstrap ──────────────────

const client = new CaramelClient();

async function bootstrap() {
    try {
        await connectDB();

        const models = (sequelize as any).models;

        // Attach models and workers to container ──────────

        (container as any).models = {
            SilentBan:   models.SilentBan,
            GuildConfig: models.GuildConfig
        };

        (container as any).vanityWorker   = setupVanityWorker();
        (container as any).silentBanWorker = setupSilentBanWorker(models.SilentBan);
        (container as any).muteWorker     = setupMuteWorker();

        await client.start(process.env.DISCORD_TOKEN!);
    } catch (error) {
        if (container.logger) {
            container.logger.error('[BOOTSTRAP] Fatal error during startup: ' + (error as Error).message);
        } else {
            console.error('[BOOTSTRAP] Fatal error before logger init:', error);
        }
        process.exit(1);
    }
}

bootstrap();