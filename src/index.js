const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");
const config = require("../config.js");
require("advanced-logs");

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

const sequelize = new Sequelize(
    config.Database.postgres.database, 
    config.Database.postgres.username, 
    config.Database.postgres.password, 
    {
        host: config.Database.postgres.host,
        port: config.Database.postgres.port,
        dialect: config.Database.postgres.dialect,
        logging: false,
        pool: { max: 10, min: 2, acquire: 30000, idle: 10000 }
    }
);

const GuildSettings = require("./models/GuildSettings")(sequelize);

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.data.name, command);
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    const execute = (...args) => event.execute(...args, GuildSettings, client);
    
    if (event.once) {
        client.once(event.name, execute);
    } else {
        client.on(event.name, execute);
    }
}

sequelize.sync().then(() => {
    console.log("[DB] ✅ Conexión con PostgreSQL establecida.");
    client.login(config.Client.bot_token);
}).catch(err => {
    console.error("[DB ERROR] ❌ Error fatal en PostgreSQL:", err.message);
    process.exit(1);
});

module.exports = { client, sequelize, GuildSettings };