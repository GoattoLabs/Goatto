import { redis } from '../../database/Redis';


// Voice rate limiter ──────────────────


// Config ──────────

const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000;
const RATE_LIMIT_THRESHOLD = 20;
const ESCALATION_TTL = 10 * 60;

const TIMEOUT_LEVELS = [
    1 * 60 * 1000,   // 1 min
    2 * 60 * 1000,   // 2 min
    5 * 60 * 1000,   // 5 min
    10 * 60 * 1000,  // 10 min
    30 * 60 * 1000,  // 30 min
];


// Redis key helpers ──────────

function rateKey(guildId: string, userId: string): string {
    return `silentban:voicerate:${guildId}:${userId}`;
}

function escalationKey(guildId: string, userId: string): string {
    return `silentban:escalation:${guildId}:${userId}`;
}


// Tracks a voice join and returns whether the user is rate limited ──────────

export async function trackVoiceJoin(guildId: string, userId: string): Promise<{ rateLimited: boolean; timeoutMs: number | null }> {
    const now = Date.now();
    const key = rateKey(guildId, userId);
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    const pipeline = redis.pipeline();
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2, 8)}`);
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) + 10);

    const results = await pipeline.exec();
    if (!results) return { rateLimited: false, timeoutMs: null };

    const joinCount = results[2][1] as number;

    if (joinCount >= RATE_LIMIT_THRESHOLD) {
        const escKey = escalationKey(guildId, userId);
        const levelRaw = await redis.get(escKey);
        const level = parseInt(levelRaw || '0', 10);
        const timeoutMs = TIMEOUT_LEVELS[Math.min(level, TIMEOUT_LEVELS.length - 1)];

        await redis.set(escKey, String(level + 1), 'EX', ESCALATION_TTL);
        await redis.del(key);

        return { rateLimited: true, timeoutMs };
    }

    return { rateLimited: false, timeoutMs: null };
}


// Returns true if the user is approaching the rate limit threshold ──────────

export async function isApproachingRateLimit(guildId: string, userId: string): Promise<boolean> {
    const key = rateKey(guildId, userId);
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    return count >= Math.floor(RATE_LIMIT_THRESHOLD / 2);
}


export { RATE_LIMIT_THRESHOLD };