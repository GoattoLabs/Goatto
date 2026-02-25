import { Redis } from 'ioredis';
import { container } from '@sapphire/framework';

if (!process.env.REDIS_URL) {
    throw new Error('🔴 [REDIS] REDIS_URL environment variable is missing!');
}

export const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true;
        }
        return false;
    }
});

container.redis = redis;

redis.on('connect', () => {
    container.logger.info('🟢 [REDIS] Connected successfully to Redis.');
});

redis.on('error', (err) => {
    container.logger.error('🔴 [REDIS] Error:', err);
});

declare module '@sapphire/pieces' {
    interface Container {
        redis: Redis;
    }
}