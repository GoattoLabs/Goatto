import { Redis } from 'ioredis';
import { container } from '@sapphire/framework';
import 'dotenv/config';

export const redis = new Redis(process.env.REDIS_URL!);

container.redis = redis;

redis.on('connect', () => {
    container.logger.info('🟢 [REDIS] Connected successfully.');
});

redis.on('error', (err) => {
    container.logger.error('🔴 [REDIS] Error during startup:', err);
});

declare module '@sapphire/pieces' {
    interface Container {
        redis: Redis;
    }
}