import { Sequelize } from 'sequelize-typescript';
import { container } from '@sapphire/framework';
import { GuildConfig } from './models/GuildConfig';
import 'dotenv/config';

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: 'postgres',
    logging: false,
    models: [GuildConfig],
    define: {
        timestamps: true,
        underscored: true,
    },
});

container.db = sequelize;

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        container.logger.info('🟢 [DATABASE] Connected to PostgreSQL.');
        
        await sequelize.sync({ alter: true });
        container.logger.info('♾️ [DATABASE] Tables synchronized successfully.');
    } catch (error) {
        container.logger.error('🔴 [DATABASE] Connection error:', error);
        throw error; 
    }
};

declare module '@sapphire/pieces' {
    interface Container {
        db: Sequelize;
        redis: import('ioredis').Redis;
    }
}