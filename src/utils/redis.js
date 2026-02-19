const Redis = require("ioredis");
const config = require("../../config.js");

const redis = new Redis({
    host: config.Database.redis.host,
    port: config.Database.redis.port,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 50, 2000), 
});

redis.on("connect", () => console.log("[REDIS] ✅ Conexión con redis establecida."));

redis.on("error", (err) => {
    console.error("[REDIS ERROR] ❌ No se pudo conectar a redis:", err.message);
});

module.exports = redis;