const { WebhookClient } = require("discord.js");
const config = require("../../config.js");
const logger = require("./logger");

class AlertService {
    static alertWebhook = null;

    static initialize() {
        if (config.System.alert_webhook_url) {
            this.alertWebhook = new WebhookClient({ url: config.System.alert_webhook_url });
            logger.info("Sistema de alertas inicializado");
        } else {
            logger.warn("No se configuró alert_webhook_url, las alertas no se enviarán");
        }
    }

    /**
     * Envía una alerta crítica
     */
    static async sendAlert(level, title, message, details = {}) {
        if (!this.alertWebhook) return;

        const emoji = {
            critical: "🔴",
            error: "⚠️",
            warning: "🟡",
            info: "ℹ️",
        }[level] || "ℹ️";

        const embed = {
            title: `${emoji} ${title}`,
            description: message,
            color: {
                critical: 0xff0000,
                error: 0xff6600,
                warning: 0xffaa00,
                info: 0x0099ff,
            }[level] || 0x0099ff,
            timestamp: new Date().toISOString(),
            fields: [],
        };

        if (Object.keys(details).length > 0) {
            for (const [key, value] of Object.entries(details)) {
                embed.fields.push({
                    name: key,
                    value: String(value).slice(0, 1024),
                    inline: true,
                });
            }
        }

        try {
            await this.alertWebhook.send({ embeds: [embed] });
            logger.info(`Alerta ${level} enviada: ${title}`);
        } catch (err) {
            logger.error(`Error al enviar alerta: ${err.message}`);
        }
    }

    /**
     * Alertas predefinidas
     */
    static async databaseDown(error) {
        await this.sendAlert(
            "critical",
            "Base de datos desconectada",
            "El bot no puede conectarse a PostgreSQL",
            { error: error.message }
        );
    }

    static async redisDown(error) {
        await this.sendAlert(
            "critical",
            "Redis desconectado",
            "El bot no puede conectarse a Redis",
            { error: error.message }
        );
    }

    static async highErrorRate(rate, threshold) {
        await this.sendAlert(
            "error",
            "Tasa de errores alta",
            `La tasa de errores (${rate}%) supera el umbral (${threshold}%)`,
            { rate: `${rate}%`, threshold: `${threshold}%` }
        );
    }

    static async rateLimitHit(service, endpoint) {
        await this.sendAlert(
            "warning",
            "Rate limit alcanzado",
            `Se alcanzó el rate limit de Discord API`,
            { service, endpoint }
        );
    }
}

module.exports = AlertService;
