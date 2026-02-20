const { WebhookClient } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../config.js");
const logger = require("./logger");

class WebhookService {
    static welcomeWebhook = null;
    static avatarPath = path.join(__dirname, "..", "assets", "goatto.png");

    /**
     * Inicializa o crea el webhook de agradecimiento
     */
    static async initialize(client) {
        try {
            // Si hay una URL configurada, usarla y configurarla
            if (config.System.webhook_url) {
                this.welcomeWebhook = new WebhookClient({ url: config.System.webhook_url });
                logger.info("[WEBHOOK] Usando webhook configurado manualmente");
                
                // Configurar el webhook con el avatar y nombre del bot
                await this.configureWebhook(client);
                return;
            }

            // Si no hay URL, intentar crear uno automáticamente
            const channelId = config.System.vanity_role_system_channel_id;
            if (!channelId) {
                logger.warn("[WEBHOOK] No hay canal configurado, no se puede crear webhook automático");
                return;
            }

            const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                logger.warn(`[WEBHOOK] Canal ${channelId} no encontrado, no se puede crear webhook`);
                return;
            }

            // Verificar permisos
            if (!channel.permissionsFor(client.user)?.has("ManageWebhooks")) {
                logger.warn("[WEBHOOK] El bot no tiene permisos para gestionar webhooks en el canal");
                return;
            }

            // Buscar webhooks existentes del bot
            const webhooks = await channel.fetchWebhooks();
            const botWebhook = webhooks.find(w => w.owner?.id === client.user.id);

            if (botWebhook) {
                // Usar webhook existente
                this.welcomeWebhook = new WebhookClient({ id: botWebhook.id, token: botWebhook.token });
                logger.info(`[WEBHOOK] Usando webhook existente: ${botWebhook.name}`);
                
                // Configurar el webhook
                await this.configureWebhook(client, botWebhook);
            } else {
                // Crear nuevo webhook
                const avatarBuffer = fs.existsSync(this.avatarPath) 
                    ? fs.readFileSync(this.avatarPath) 
                    : null;

                const webhook = await channel.createWebhook({
                    name: client.user.username || "Goatto Bot",
                    avatar: avatarBuffer,
                    reason: "Webhook automático para mensajes de agradecimiento",
                });

                this.welcomeWebhook = new WebhookClient({ id: webhook.id, token: webhook.token });
                logger.info(`[WEBHOOK] ✅ Webhook creado automáticamente: ${webhook.name}`);
            }
        } catch (err) {
            logger.error(`[WEBHOOK ERROR] Error al inicializar webhook: ${err.message}`);
        }
    }

    /**
     * Configura el webhook con el avatar y nombre del bot
     */
    static async configureWebhook(client, webhook = null) {
        try {
            if (!this.welcomeWebhook) return;

            const avatarBuffer = fs.existsSync(this.avatarPath) 
                ? fs.readFileSync(this.avatarPath) 
                : null;

            const botName = client.user.username || "Goatto Bot";
            const botAvatar = avatarBuffer || client.user.displayAvatarURL({ extension: 'png' });

            // Si tenemos acceso al webhook (fue creado por nosotros), actualizarlo
            if (webhook) {
                try {
                    await webhook.edit({
                        name: botName,
                        avatar: avatarBuffer,
                        reason: "Actualizar webhook con información del bot",
                    });
                    logger.info(`[WEBHOOK] ✅ Webhook configurado: nombre="${botName}"`);
                } catch (editErr) {
                    logger.debug(`[WEBHOOK] No se pudo editar webhook (puede ser de solo lectura): ${editErr.message}`);
                }
            } else if (config.System.webhook_url) {
                // Si es un webhook externo, solo podemos usar el avatar en los mensajes
                // El nombre y avatar se pueden sobrescribir en cada mensaje
                logger.info(`[WEBHOOK] Webhook externo detectado, se usará avatar del bot en mensajes`);
            }
        } catch (err) {
            logger.error(`[WEBHOOK ERROR] Error al configurar webhook: ${err.message}`);
        }
    }

    /**
     * Obtiene el webhook (puede ser null si no está inicializado)
     */
    static getWebhook() {
        return this.welcomeWebhook;
    }

    /**
     * Envía un mensaje a través del webhook con el avatar y nombre del bot
     * Para componentes v2, usa el método REST directamente
     */
    static async send(payload, client) {
        if (!this.welcomeWebhook) {
            logger.debug("[WEBHOOK] No hay webhook disponible para enviar mensaje");
            return false;
        }

        try {
            const botName = client.user.username || "Goatto Bot";
            // Discord no acepta data URLs para avatares, solo URLs HTTP/HTTPS
            // Usar el avatar del bot directamente
            const avatarUrl = client.user.displayAvatarURL({ extension: 'png', size: 256 });

            // Para componentes v2, usar REST API directamente
            const webhookPayload = {
                ...payload,
                username: botName,
                avatar_url: avatarUrl,
            };

            // Usar REST API para enviar con componentes v2
            await client.rest.post(`/webhooks/${this.welcomeWebhook.id}/${this.welcomeWebhook.token}?with_components=true`, {
                body: webhookPayload,
            });

            return true;
        } catch (err) {
            logger.error(`[WEBHOOK ERROR] Error al enviar mensaje: ${err.message}`);
            return false;
        }
    }
}

module.exports = WebhookService;
