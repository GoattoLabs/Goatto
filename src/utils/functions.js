const { ActivityType } = require("discord.js");
const config = require("../../config.js");
const { roleQueue } = require("./queues");

function hasMeetspace(member, keyword) {
    if (!member?.presence || !keyword) return false;

    const customStatus = member.presence.activities.find((a) => a.type === 4);
    if (!customStatus?.state) return false;

    const keywordString = String(keyword).toLowerCase();
    
    return customStatus.state.toLowerCase().includes(keywordString);
}

function computeTriggers(vanityKeyword) {
    if (!vanityKeyword) return [];
    return [vanityKeyword.toLowerCase()];
}

async function getSettings(guildId, GuildSettingsModel) {
    return await GuildSettingsModel.findOrCreate({
        where: { guildId: guildId },
        defaults: {
            vanityKeyword: config.System.vanity_role_system_status_text || "",
            roleId: config.System.vanity_role_system_role_id || "",
            channelId: config.System.vanity_role_system_channel_id || "",
        }
    }).then(res => res[0]);
}

async function performFullScan(guild, GuildSettingsModel) {
    const settings = await getSettings(guild.id, GuildSettingsModel);
    if (!settings.roleId || !settings.vanityKeyword) return;

    console.log(`[SYSTEM] 🔍 Iniciando escaneo masivo en ${guild.name}..`);

    try {
        const allMembers = await guild.members.fetch(); 
        let enqueued = 0;

        for (const [id, member] of allMembers) {
            if (member.user.bot) continue;

            const hasKeyword = hasMeetspace(member, settings.vanityKeyword);
            const hasRole = member.roles.cache.has(settings.roleId);

            if ((hasKeyword && !hasRole) || (!hasKeyword && hasRole)) {
                const action = hasKeyword ? "add" : "remove";
                
                await roleQueue.add(
                    `scan-${action}-${member.id}`,
                    {
                        guildId: guild.id,
                        memberId: member.id,
                        roleId: settings.roleId,
                        action: action,
                        reason: "Full Scan Synchronization",
                        channelId: settings.channelId,
                        avatarURL: member.user.displayAvatarURL({ extension: 'png' })
                    },
                    { priority: 2 }
                );
                enqueued++;
            }
        }

        console.log(`[SYSTEM] ✅ Escaneo finalizado. ${enqueued} tareas añadidas a la cola.`);
    } catch (err) {
        console.error("[SYSTEM ERROR] ❌ Fallo en el escaneo masivo:", err.message);
    }
}

function requireAdmin(interaction) {
    return interaction.member?.permissions?.has("Administrator");
}

module.exports = { hasMeetspace, computeTriggers, getSettings, requireAdmin, performFullScan };