const Redis = require("ioredis");
const config = require("../../config.js");

const redis = new Redis({
    host: config.Database.redis.host,
    port: config.Database.redis.port,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[REDIS] ⏳ Reintentando conexión (intento ${times}) en ${delay}ms...`);
        return delay;
    },
    enableReadyCheck: true,
    enableOfflineQueue: false, // No encolar comandos si Redis está offline
});

redis.on("connect", () => {
    console.log("[REDIS] 🔌 Conectando a Redis...");
});

redis.on("ready", () => {
    console.log("[REDIS] ✅ Conexión con Redis establecida y lista.");
});

redis.on("error", (err) => {
    console.error("[REDIS ERROR] ❌ Error en Redis:", err.message);
    // No hacer exit aquí porque el bot puede funcionar sin Redis (aunque con limitaciones)
});

redis.on("close", () => {
    console.warn("[REDIS] ⚠️ Conexión con Redis cerrada.");
});

redis.on("reconnecting", () => {
    console.log("[REDIS] 🔄 Reconectando a Redis...");
});

// Manejar errores no capturados de Redis
process.on("unhandledRejection", (reason, promise) => {
    if (reason && reason.message && reason.message.includes("Redis")) {
        console.error("[REDIS ERROR] Error no manejado de Redis:", reason.message);
    }
});

module.exports = redis;