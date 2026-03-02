import { Redis } from 'ioredis';
import { container } from '@sapphire/framework';


// Redis setup ──────────────────

if (!process.env.REDIS_URL) {
    throw new Error('🔴 [REDIS] REDIS_URL environment variable is missing!');
}

export const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    reconnectOnError: (err) => {
        if (err.message.includes('READONLY')) return true;
        return false;
    }
});

container.redis = redis;


// Redis event listeners ──────────

redis.on('connect', () => {
    container.logger.info('🟢 [REDIS] Connected to Redis.');
});

redis.on('error', (err) => {
    container.logger.error('🔴 [REDIS] Error:', err);
});


// Container type augmentation ──────────

declare module '@sapphire/pieces' {
    interface Container {
        redis: Redis;
    }
}