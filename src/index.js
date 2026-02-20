const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");
const config = require("../config.js");
const logger = require("./services/logger");
const constants = require("./utils/constants");
const AlertService = require("./services/alertService");
const BackupService = require("./services/backupService");
const HealthService = require("./services/healthService");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences, 
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [
        Partials.User, 
        Partials.Channel, 
        Partials.GuildMember, 
        Partials.Presence 
    ],
    shards: "auto",
});

client.commands = new Collection();

logger.info("[INIT] Creando conexión a PostgreSQL...");
const sequelize = new Sequelize(
    config.Database.postgres.database, 
    config.Database.postgres.username, 
    config.Database.postgres.password, 
    {
        host: config.Database.postgres.host,
        port: config.Database.postgres.port,
        dialect: config.Database.postgres.dialect,
        logging: false,
        pool: { 
            max: constants.DATABASE.POOL_MAX, 
            min: constants.DATABASE.POOL_MIN, 
            acquire: constants.DATABASE.POOL_ACQUIRE, 
            idle: constants.DATABASE.POOL_IDLE 
        }
    }
);

logger.info("[INIT] Cargando modelos de base de datos...");
let GuildSettings, AuditLog, Blacklist;
try {
    GuildSettings = require("./models/GuildSettings")(sequelize);
    AuditLog = require("./models/AuditLog")(sequelize);
    Blacklist = require("./models/Blacklist")(sequelize);
    logger.debug("[INIT] ✅ Modelos cargados correctamente");
} catch (modelErr) {
    logger.error("[INIT ERROR] Error al cargar modelos:", modelErr.message);
    logger.error("[INIT ERROR] Stack:", modelErr.stack);
    process.exit(1);
}

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            if (command.data && command.data.name) {
                client.commands.set(command.data.name, command);
                logger.debug(`[LOAD] Comando cargado: ${command.data.name}`);
            }
        } catch (err) {
            logger.error(`[LOAD ERROR] Error al cargar comando ${file}:`, err.message);
        }
    }
} else {
    logger.warn("[LOAD] Directorio de comandos no encontrado");
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        try {
            const event = require(path.join(eventsPath, file));
            if (!event.name || !event.execute) {
                logger.warn(`[LOAD] Evento ${file} no tiene name o execute, omitiendo`);
                continue;
            }
            const execute = (...args) => {
                try {
                    return event.execute(...args, GuildSettings, client, AuditLog, Blacklist);
                } catch (err) {
                    logger.error(`[EVENT ERROR] Error en evento ${event.name}:`, err);
                }
            };
            
            if (event.once) {
                client.once(event.name, execute);
            } else {
                client.on(event.name, execute);
            }
            logger.debug(`[LOAD] Evento cargado: ${event.name}`);
        } catch (err) {
            logger.error(`[LOAD ERROR] Error al cargar evento ${file}:`, err.message);
        }
    }
} else {
    logger.warn("[LOAD] Directorio de eventos no encontrado");
}

// Validar configuración crítica antes de iniciar
function validateConfig() {
    const errors = [];
    const warnings = [];

    if (!config.Client.bot_token) {
        errors.push("BOT_TOKEN no está configurado en las variables de entorno");
    }

    if (!config.Database.postgres.database) {
        warnings.push("PG_DATABASE no está configurado, usando valor por defecto");
    }

    if (!config.Database.redis.host) {
        warnings.push("REDIS_HOST no está configurado, usando localhost");
    }

    if (!config.System.vanity_role_system_guild_id) {
        warnings.push("VANITY_GUILD_ID no está configurado");
    }

    if (!config.System.vanity_role_system_role_id) {
        warnings.push("VANITY_ROLE_ID no está configurado");
    }

    if (errors.length > 0) {
        logger.error("[CONFIG ERROR] ❌ Errores de configuración encontrados:");
        errors.forEach(err => logger.error(`  - ${err}`));
        logger.error("[CONFIG ERROR] El bot no puede iniciar sin estas configuraciones.");
        process.exit(1);
    }

    if (warnings.length > 0) {
        logger.warn("[CONFIG WARNING] ⚠️ Advertencias de configuración:");
        warnings.forEach(warn => logger.warn(`  - ${warn}`));
    }
}

// Validar configuración antes de continuar
logger.info("[INIT] Iniciando validación de configuración...");
validateConfig();
logger.info("[INIT] ✅ Configuración validada");

// Graceful shutdown
const shutdown = async (signal) => {
    logger.info(`Recibida señal ${signal}, cerrando bot gracefully...`);
    
    try {
        // Cerrar worker
        const readyEvent = require("./events/ready");
        const worker = readyEvent.getWorker();
        if (worker) {
            await worker.close();
            logger.info("Worker cerrado");
        }

        // Cerrar health service
        HealthService.shutdown();

        // Cerrar conexiones
        await sequelize.close();
        await client.destroy();
        
        logger.info("Bot cerrado correctamente");
        process.exit(0);
    } catch (err) {
        logger.error(`Error durante shutdown: ${err.message}`);
        process.exit(1);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Manejar errores no capturados (después de inicializar servicios)
let servicesInitialized = false;

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection:", reason);
    if (servicesInitialized) {
        AlertService.sendAlert("error", "Error no manejado", String(reason)).catch(() => {});
    }
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    if (servicesInitialized) {
        AlertService.sendAlert("critical", "Excepción no capturada", error.message, { stack: error.stack }).catch(() => {});
    }
    shutdown("uncaughtException");
});

logger.info("[INIT] Intentando conectar a PostgreSQL...");
logger.info(`[INIT] Configuración DB: host=${config.Database.postgres.host}, port=${config.Database.postgres.port}, database=${config.Database.postgres.database}`);

sequelize.sync({ alter: true }).then(async () => {
    logger.info("[DB] ✅ Conexión con PostgreSQL establecida.");
    
    // Inicializar servicios
    logger.info("[INIT] Inicializando servicios...");
    try {
        AlertService.initialize();
        logger.debug("[INIT] ✅ AlertService inicializado");
        
        BackupService.initialize();
        logger.debug("[INIT] ✅ BackupService inicializado");
        
        HealthService.initialize(sequelize, client);
        logger.debug("[INIT] ✅ HealthService inicializado");
        
        servicesInitialized = true;
        logger.info("[INIT] ✅ Todos los servicios inicializados");
    } catch (initErr) {
        logger.error("[INIT ERROR] Error al inicializar servicios:", initErr);
        logger.error("[INIT ERROR] Stack:", initErr.stack);
        // Continuar aunque falle la inicialización de servicios
    }
    
    // Validar que el token del bot existe antes de intentar iniciar sesión
    if (!config.Client.bot_token) {
        logger.error("[CLIENT ERROR] ❌ No se puede iniciar sesión sin BOT_TOKEN");
        process.exit(1);
    }
    
    logger.info("[INIT] Intentando iniciar sesión con Discord...");
    try {
        await client.login(config.Client.bot_token);
        logger.info("[INIT] ✅ Login a Discord exitoso, esperando evento ready...");
    } catch (err) {
        logger.error("[CLIENT ERROR] ❌ Error al iniciar sesión con Discord:", err.message);
        logger.error("[CLIENT ERROR] Stack:", err.stack);
        if (servicesInitialized) {
            await AlertService.sendAlert("critical", "Error de conexión a Discord", err.message).catch(() => {});
        }
        process.exit(1);
    }
}).catch(async (err) => {
    logger.error("[DB ERROR] ❌ Error fatal en PostgreSQL:", err.message);
    logger.error("[DB ERROR] Stack:", err.stack);
    logger.error("[DB ERROR] Verifica que PostgreSQL esté corriendo y las credenciales sean correctas");
    if (servicesInitialized) {
        await AlertService.sendAlert("critical", "Error de base de datos", err.message).catch(() => {});
    }
    process.exit(1);
});

module.exports = { client, sequelize, GuildSettings, AuditLog, Blacklist };