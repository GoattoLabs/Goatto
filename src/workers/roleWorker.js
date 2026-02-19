const { Worker } = require("bullmq");
const { WebhookClient } = require("discord.js");
const { getWelcomeLayout } = require("../utils/layouts.js");
const { hasMeetspace, computeTriggers, getSettings } = require("../utils/functions");
const config = require("../../config.js");

const webhookHelper = config.System.webhook_url ? new WebhookClient({ url: config.System.webhook_url }) : null;

module.exports = (redisConnection, client, GuildSettings) => {
    return new Worker(
        "roleQueue",
        async (job) => {
            const { guildId, memberId, roleId, action, reason, avatarURL } = job.data;
            
            try {
                const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
                if (!guild) return;

                const member = await guild.members.fetch(memberId).catch(() => null);
                if (!member) return;

                const settings = await getSettings(guildId, GuildSettings);
                if (!settings) return;

                const triggers = computeTriggers(settings.vanityKeyword);
                const isEligible = hasMeetspace(member, triggers);
                const hasRole = member.roles.cache.has(roleId);

                if (action === "add" && isEligible && !hasRole) {
                    await member.roles.add(roleId, reason);
                    console.log(`[WORKER] ✅ Rol añadido a ${member.user.tag}`);

                    const cooldownKey = `vanity_welcome_cd:${memberId}`;
                    const isOnCooldown = await redisConnection.get(cooldownKey);

                    if (!isOnCooldown && webhookHelper) {
                        const layout = getWelcomeLayout(memberId, roleId, avatarURL);
                        
                        delete layout.content;
                        delete layout.embeds;

                        await client.rest.post(`/webhooks/${webhookHelper.id}/${webhookHelper.token}?with_components=true`, {
                            body: layout
                        })
                        .then(() => {
                            console.log(`[WORKER] 👋 Agradecimiento enviado a ${member.user.tag}`);
                        })
                        .catch(err => {
                            console.error(`[REST ERROR]`);
                            console.error(JSON.stringify(err.rawError || err, null, 2));
                        });
                        
                        await redisConnection.set(cooldownKey, "active", "EX", 7200);
                    } else if (isOnCooldown) {
                        console.log(`[WORKER] ⏳ Agradecimiento omitido. ${member.user.tag} sigue en cooldown.`);
                    }
                } 
                
                else if (action === "remove" && !isEligible && hasRole) {
                    await member.roles.remove(roleId, reason);
                    console.log(`[WORKER] ❌ Rol quitado a ${member.user.tag}`);
                }

            } catch (err) {
                console.error(`[WORKER ERROR] Job ${job.id}:`, err.message);
                throw err; 
            }
        },
        { 
            connection: redisConnection, 
            concurrency: 1,
            lockDuration: 60000,
            lockRenewTime: 10000,
            maxStalledCount: 0, 
            stalledInterval: 300000,
        }
    );
};