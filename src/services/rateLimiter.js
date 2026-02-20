const redisConnection = require("../utils/redis");

class RateLimiter {
    /**
     * Verifica si un usuario/guild puede ejecutar una acción
     * @param {string} key - Clave única (ej: "refresh:guildId" o "command:userId")
     * @param {number} limit - Número máximo de acciones permitidas
     * @param {number} window - Ventana de tiempo en segundos
     * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
     */
    static async checkLimit(key, limit, window) {
        const redisKey = `ratelimit:${key}`;
        const current = await redisConnection.incr(redisKey);
        
        if (current === 1) {
            // Primera vez, establecer TTL
            await redisConnection.expire(redisKey, window);
        }
        
        const ttl = await redisConnection.ttl(redisKey);
        const resetAt = Date.now() + (ttl * 1000);
        
        return {
            allowed: current <= limit,
            remaining: Math.max(0, limit - current),
            resetAt: resetAt,
        };
    }

    /**
     * Obtiene información del rate limit sin incrementar
     */
    static async getLimitInfo(key, limit) {
        const redisKey = `ratelimit:${key}`;
        const current = parseInt(await redisConnection.get(redisKey) || '0');
        const ttl = await redisConnection.ttl(redisKey);
        
        return {
            current: current,
            limit: limit,
            remaining: Math.max(0, limit - current),
            resetAt: ttl > 0 ? Date.now() + (ttl * 1000) : null,
        };
    }
}

module.exports = RateLimiter;
