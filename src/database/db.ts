import { Sequelize } from 'sequelize-typescript';
import { container } from '@sapphire/framework';
import { GuildConfig } from './models/GuildConfig';
import { SilentBan } from './models/SilentBan';
import { WarnLog } from './models/WarnLog';
import { ActiveMute } from './models/ActiveMute';
import { ModLog } from './models/ModLog';
import 'dotenv/config';


// Database setup ──────────────────

if (!process.env.DATABASE_URL) {
    throw new Error('🔴 [DATABASE] DATABASE_URL environment variable is missing!');
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    models: [GuildConfig, SilentBan, WarnLog, ActiveMute, ModLog],
    define: {
        timestamps: true,
        underscored: true,
    },
});

container.db = sequelize;


// Connects to PostgreSQL and syncs tables ──────────

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        container.logger.info('🟢 [DATABASE] Connected to PostgreSQL.');

        await sequelize.sync({ alter: true });
        container.logger.info('📊 [DATABASE] Tables synchronized successfully.');
    } catch (error: any) {
        container.logger.error('🔴 [DATABASE] Connection error:', error.message);
        if (error.original) console.error('Original Error:', error.original);
        process.exit(1);
    }
};


// Container type augmentation ──────────

declare module '@sapphire/pieces' {
    interface Container {
        db: Sequelize;
    }
}