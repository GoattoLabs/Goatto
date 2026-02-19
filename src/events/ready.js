const { Events, ActivityType } = require("discord.js");
const config = require("../../config.js");
const { performFullScan } = require("../utils/functions");

const redisConnection = require("../utils/redis");
const setupRoleWorker = require("../workers/roleWorker");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client, GuildSettings) {
        
        console.log(`[CLIENT] 🟩 ${client.user.tag} iniciado correctamente.`);

        setupRoleWorker(redisConnection, client, GuildSettings);
        console.log("[BULLMQ] 👷 Worker de roles iniciado y listo para procesar la cola.");

        client.user.setActivity({
            name: config.Client.bot_status,
            type: ActivityType.Custom,
            state: config.Client.bot_status,
        });

        const guildId = config.System.vanity_role_system_guild_id;

        // Limpieza periódica (48h)
        setInterval(async () => {
            console.log("[SYSTEM] 🧹 Iniciando limpieza profunda de 48h..");
            
            try {
                const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
                
                if (guild) {
                    await performFullScan(guild, GuildSettings); 
                    console.log("[SYSTEM] ✅ Limpieza profunda completada con éxito.");
                } else {
                    console.log("[SYSTEM] ❌ No se pudo encontrar el servidor para la limpieza.");
                }
            } catch (err) {
                console.log(`[ERR INTERVAL] ${err.message}`);
            }
        }, 48 * 60 * 60 * 1000);
    },
};