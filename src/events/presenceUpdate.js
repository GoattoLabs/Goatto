const { Events } = require("discord.js");
const { getSettings } = require("../utils/functions");
const { roleQueue } = require("../utils/queues");
const config = require("../../config.js");

const state = { cachedSettings: null };

module.exports = {
    name: Events.PresenceUpdate,
    state,
    async execute(oldPresence, newPresence, GuildSettings) {
        const memberId = newPresence?.userId;

        if (!memberId || memberId === "null") return;

        const user = newPresence.user || await newPresence.client.users.fetch(memberId).catch(() => null);
        const userName = user ? user.tag : memberId;
        
        if (!newPresence.guild || newPresence.guild.id !== config.System.vanity_role_system_guild_id) return;
        
        const oldText = oldPresence?.activities?.find(a => a.type === 4)?.state || "";
        const newText = newPresence?.activities?.find(a => a.type === 4)?.state || "";

        if (oldText === newText) return;

        if (!state.cachedSettings) {
            state.cachedSettings = await getSettings(newPresence.guild.id, GuildSettings).catch(() => null);
        }
        
        const settings = state.cachedSettings;
        if (!settings?.roleId || !settings?.vanityKeyword) return;

        const keyword = settings.vanityKeyword.toLowerCase();
        const hasKeyword = newText.toLowerCase().includes(keyword);
        const hadKeyword = oldText.toLowerCase().includes(keyword);

        if (hasKeyword !== hadKeyword) {
            const action = hasKeyword ? "add" : "remove";
            
            await roleQueue.add(
                "roleJob",
                {
                    guildId: newPresence.guild.id,
                    memberId: memberId,
                    roleId: settings.roleId,
                    action: action,
                    reason: "Vanity System (Automated)",
                    channelId: settings.channelId,
                    avatarURL: newPresence.user.displayAvatarURL({ extension: 'png' })
                },
                { 
                    jobId: `vanity-${memberId}-${action}-${Date.now()}`,
                    removeOnComplete: true,
                    removeOnFail: true,
                    attempts: 1
                }
            );

            console.log(`[QUEUE] 📥 Tarea enviada: ${newPresence.user.tag} -> ${action}`);
        }
    },
};