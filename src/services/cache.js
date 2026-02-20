const redisConnection = require("../utils/redis");
const constants = require("../utils/constants");

class CacheService {
    /**
     * Obtiene un valor del cache
     */
    static async get(key) {
        try {
            const value = await redisConnection.get(`cache:${key}`);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Establece un valor en el cache con TTL
     */
    static async set(key, value, ttl = constants.CACHE.SETTINGS_TTL) {
        try {
            await redisConnection.setex(
                `cache:${key}`,
                ttl,
                JSON.stringify(value)
            );
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Elimina un valor del cache
     */
    static async delete(key) {
        try {
            await redisConnection.del(`cache:${key}`);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Limpia todo el cache (usar con precaución)
     */
    static async clear() {
        try {
            const keys = await redisConnection.keys("cache:*");
            if (keys.length > 0) {
                await redisConnection.del(...keys);
            }
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Obtiene o establece un valor (patrón cache-aside)
     */
    static async getOrSet(key, fetchFn, ttl = constants.CACHE.SETTINGS_TTL) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        const value = await fetchFn();
        await this.set(key, value, ttl);
        return value;
    }
}

module.exports = CacheService;
