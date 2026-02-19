const { REST, Routes } = require("discord.js");
const config = require("./config.js");

const rest = new REST({ version: "10" }).setToken(config.Client.bot_token);

(async () => {
    try {
        const clientId = config.Client.bot_client_id;
        const guildId = config.System.vanity_role_system_guild_id;

        console.log("Iniciando limpieza de comandos..");

        // Elimina comandos globales
        console.log("Eliminando comandos globales (/)");
        await rest.put(Routes.applicationCommands(clientId), { body: [] });

        // Elimina comandos por servidor
        if (guildId) {
            console.log(`Eliminando comandos específicos del servidor: ${guildId}`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        }

        console.log("✅ Limpieza de comandos completada. Puedes usar deploy-commands.js para aplicar la nueva configuración.");
        
    } catch (error) {
        console.error("❌ Error durante la limpieza:");
        console.error(error.message);
        
        if (error.data?.body) {
            console.error("Error API:", JSON.stringify(error.data.body, null, 2));
        }
        process.exit(1);
    }
})();