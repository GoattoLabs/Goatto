import { TextChannel, WebhookClient } from 'discord.js';

export async function sendPattoLog(channel: TextChannel, payload: string | any) {
    try {
        const webhooks = await channel.fetchWebhooks();
        
        let webhook = webhooks.find(wh => 
            wh.name === 'Patto' && 
            wh.owner?.id === channel.client.user?.id
        );

        if (!webhook) {
            webhook = await channel.createWebhook({
                name: 'Patto',
                avatar: channel.client.user?.displayAvatarURL(),
                reason: 'Sistema automático de logs de Patto'
            });
        }

        const webhookUrlWithComponents = `${webhook.url}?with_components=true`;
        const webhookClient = new WebhookClient({ url: webhookUrlWithComponents });

        let dataToSend;

        if (typeof payload === 'string') {
            dataToSend = {
                components: [{
                    type: 17,
                    components: [{
                        type: 10,
                        content: payload
                    }]
                }],
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
        console.error('🔴 [WEBHOOK ERROR] No se pudo enviar el log:', error);
    }
}