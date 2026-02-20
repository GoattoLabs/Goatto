const { REST, Routes, PermissionsBitField, ApplicationCommandOptionType } = require("discord.js");
const config = require("./config.js");

const ADMIN_ONLY = String(PermissionsBitField.Flags.Administrator);

const commands = [
    {
        name: "refresh",
        description: "Forzar escaneo completo de miembros",
        defaultMemberPermissions: ADMIN_ONLY,
    },
    {
        name: "say",
        description: "Escribe a través del bot",
        options: [
            {
                name: "mensaje",
                type: ApplicationCommandOptionType.String,
                description: "Contenido del mensaje",
                required: false,
            },
            {
                name: "respuesta",
                type: ApplicationCommandOptionType.String,
                description: "Agrega el ID de un mensaje para responderlo",
                required: false,
            },
        ],
        defaultMemberPermissions: ADMIN_ONLY,
    },
    {
        name: "sendcolorpicker",
        description: "Envía el menú de selección de colores",
        options: [
            {
                name: "canal",
                type: ApplicationCommandOptionType.Channel,
                description: "Canal de destino",
                required: false,
            },
        ],
        defaultMemberPermissions: ADMIN_ONLY,
    },
    {
        name: "setchannel",
        description: "Configura el canal de notificaciones",
        options: [
            {
                name: "canal",
                type: ApplicationCommandOptionType.Channel,
                description: "El canal de texto",
                required: true,
            },
        ],
        defaultMemberPermissions: ADMIN_ONLY,
    },
    {
        name: "setvanity",
        description: "Configura la palabra clave de vanity",
        options: [
            {
                name: "keyword",
                type: ApplicationCommandOptionType.String,
                description: "La palabra clave (ej: .gg/meetspace)",
                required: true,
            },
        ],
        defaultMemberPermissions: ADMIN_ONLY,
    },
    {
        name: "status",
        description: "Muestra el estado de la configuración",
        defaultMemberPermissions: ADMIN_ONLY, 
    },
    {
        name: "stats",
        description: "Muestra estadísticas del bot",
        options: [
            {
                name: "dias",
                type: ApplicationCommandOptionType.Integer,
                description: "Número de días a analizar (por defecto: 7)",
                required: false,
                min_value: 1,
                max_value: 30,
            },
        ],
        defaultMemberPermissions: ADMIN_ONLY,
    },
    {
        name: "blacklist",
        description: "Gestiona la blacklist/whitelist de usuarios",
        options: [
            {
                name: "add",
                type: ApplicationCommandOptionType.Subcommand,
                description: "Añade un usuario a la blacklist",
                options: [
                    {
                        name: "usuario",
                        type: ApplicationCommandOptionType.User,
                        description: "El usuario a añadir",
                        required: true,
                    },
                    {
                        name: "razon",
                        type: ApplicationCommandOptionType.String,
                        description: "Razón (opcional)",
                        required: false,
                    },
                ],
            },
            {
                name: "remove",
                type: ApplicationCommandOptionType.Subcommand,
                description: "Elimina un usuario de la blacklist/whitelist",
                options: [
                    {
                        name: "usuario",
                        type: ApplicationCommandOptionType.User,
                        description: "El usuario a eliminar",
                        required: true,
                    },
                ],
            },
            {
                name: "list",
                type: ApplicationCommandOptionType.Subcommand,
                description: "Lista usuarios en blacklist/whitelist",
                options: [
                    {
                        name: "tipo",
                        type: ApplicationCommandOptionType.String,
                        description: "Tipo de lista",
                        required: false,
                        choices: [
                            { name: "Blacklist", value: "blacklist" },
                            { name: "Whitelist", value: "whitelist" },
                        ],
                    },
                ],
            },
            {
                name: "whitelist",
                type: ApplicationCommandOptionType.Subcommand,
                description: "Añade un usuario a la whitelist",
                options: [
                    {
                        name: "usuario",
                        type: ApplicationCommandOptionType.User,
                        description: "El usuario a añadir",
                        required: true,
                    },
                    {
                        name: "razon",
                        type: ApplicationCommandOptionType.String,
                        description: "Razón (opcional)",
                        required: false,
                    },
                ],
            },
        ],
        defaultMemberPermissions: ADMIN_ONLY,
    },
];

const rest = new REST({ version: "10" }).setToken(config.Client.bot_token);

(async () => {
    try {
        console.log(`⌛ Sincronizando comandos en el servidor: ${config.Client.guild_id}...`);

        await rest.put(
            Routes.applicationGuildCommands(config.Client.bot_client_id, config.Client.guild_id),
            { body: commands },
        );

        console.log("✅ Comandos actualizados correctamente.");
    } catch (error) {
        console.error("❌ Error al desplegar comandos:", error.message);
        if (error.data?.body) {
            console.error("Error API:", JSON.stringify(error.data.body, null, 2));
        }
    }
})();