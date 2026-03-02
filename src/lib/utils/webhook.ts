import { TextChannel, WebhookClient } from 'discord.js';


// Webhook ──────────────────


// Sends a payload to a channel via Caramel's webhook, creating it if it doesn't exist ──────────

export async function sendCaramelLog(channel: TextChannel, payload: string | any) {
    try {
        const webhooks = await channel.fetchWebhooks();

        let webhook = webhooks.find(wh =>
            wh.name === 'Caramel' &&
            wh.owner?.id === channel.client.user?.id
        );

        if (!webhook) {
            webhook = await channel.createWebhook({
                name: 'Caramel',
                avatar: channel.client.user?.displayAvatarURL(),
                reason: 'Caramel automatic log system'
            });
        }

        const webhookClient = new WebhookClient({ url: `${webhook.url}?with_components=true` });

        let dataToSend;

        if (typeof payload === 'string') {
            dataToSend = {
                components: [{ type: 17, components: [{ type: 10, content: payload }] }],
                allowedMentions: { parse: ['users'], roles: [] }
            };
        } else {
            dataToSend = {
                ...payload,
                allowedMentions: payload.allowed_mentions || { parse: ['users'], roles: [] }
            };
            delete dataToSend.allowed_mentions;
        }

        await webhookClient.send(dataToSend);
    } catch (error) {
        console.error('🔴 [WEBHOOK ERROR] Failed to send log:', error);
    }
}