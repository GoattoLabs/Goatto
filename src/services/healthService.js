const express = require("express");
const logger = require("./logger");
const constants = require("../utils/constants");
const redisConnection = require("../utils/redis");

class HealthService {
    static app = null;
    static server = null;
    static sequelize = null;
    static client = null;
    static healthStatus = {
        status: "unknown",
        timestamp: null,
        checks: {},
    };

    static initialize(sequelize, client) {
        this.sequelize = sequelize;
        this.client = client;
        this.app = express();
        this.app.use(express.json());

        // Endpoint de health check
        this.app.get("/health", async (req, res) => {
            const health = await this.checkHealth();
            const statusCode = health.status === "healthy" ? 200 : 503;
            res.status(statusCode).json(health);
        });

        // Endpoint de readiness
        this.app.get("/ready", async (req, res) => {
            const ready = await this.isReady();
            res.status(ready ? 200 : 503).json({ ready });
        });

        // Endpoint de liveness
        this.app.get("/live", (req, res) => {
            res.status(200).json({ alive: true });
        });

        const port = process.env.HEALTH_PORT || constants.HEALTH.PORT;
        try {
            this.server = this.app.listen(port, () => {
                logger.info(`Health check server iniciado en puerto ${port}`);
            });
            
            this.server.on("error", (err) => {
                if (err.code === "EADDRINUSE") {
                    logger.warn(`[HEALTH] Puerto ${port} ya está en uso, health checks no estarán disponibles`);
                } else {
                    logger.error(`[HEALTH ERROR] Error en servidor HTTP:`, err.message);
                }
            });
        } catch (err) {
            logger.error(`[HEALTH ERROR] Error al iniciar servidor HTTP:`, err.message);
            // No crashear si el health service falla
        }

        // Verificar salud periódicamente
        setInterval(() => this.checkHealth(), constants.HEALTH.CHECK_INTERVAL);
    }

    static async checkHealth() {
        const checks = {
            database: await this.checkDatabase(),
            redis: await this.checkRedis(),
            discord: await this.checkDiscord(),
        };

        const allHealthy = Object.values(checks).every(c => c.healthy);
        
        this.healthStatus = {
            status: allHealthy ? "healthy" : "unhealthy",
            timestamp: new Date().toISOString(),
            checks,
        };

        return this.healthStatus;
    }

    static async checkDatabase() {
        try {
            if (!this.sequelize) return { healthy: false, message: "Not initialized" };
            await this.sequelize.authenticate();
            return { healthy: true, message: "Connected" };
        } catch (err) {
            return { healthy: false, message: err.message };
        }
    }

    static async checkRedis() {
        try {
            const result = await redisConnection.ping();
            return { healthy: result === "PONG", message: result === "PONG" ? "Connected" : "No response" };
        } catch (err) {
            return { healthy: false, message: err.message };
        }
    }

    static async checkDiscord() {
        // Verificar que el cliente está conectado
        if (!this.client) return { healthy: false, message: "Not initialized" };
        return {
            healthy: this.client.isReady(),
            message: this.client.isReady() ? "Connected" : "Not ready",
            ping: this.client.ws.ping,
        };
    }

    static async isReady() {
        const health = await this.checkHealth();
        return health.status === "healthy";
    }

    static shutdown() {
        if (this.server) {
            this.server.close(() => {
                logger.info("Health check server cerrado");
            });
        }
    }
}

module.exports = HealthService;
