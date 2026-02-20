const { Webhook } = require("discord.js");

require("dotenv").config();

module.exports = {
    Client: {
        bot_token: process.env.BOT_TOKEN || "",
        bot_status: process.env.BOT_STATUS || "",
        bot_client_id: process.env.BOT_CLIENT_ID || "",
        guild_id: process.env.GUILD_ID || "",
    },
    System: {
        vanity_role_system: true,
        vanity_role_system_role_id: process.env.VANITY_ROLE_ID || "",
        vanity_role_system_guild_id: process.env.VANITY_GUILD_ID || "",
        vanity_role_system_channel_id: process.env.VANITY_CHANNEL_ID || "",
        vanity_role_system_status_text: process.env.VANITY_KEYWORD || "",
        webhook_url: process.env.WEBHOOK_URL || "",
        alert_webhook_url: process.env.ALERT_WEBHOOK_URL || "",
    },
    VIP: {
        colorPickerTitle: "Zona VIP・Colores exclusivos <:MS_CatPeek:1472492895729750116>",
        colorPickerDescription: "Si ves esto es porque eres parte de nuestros miembros **VIP**\nMuchas gracias por apoyar al servidor; como agradecimiento, aquí tienes una lista de colores exclusivos para tu perfil. ¡Elige el que más te guste!\n",
        colorPickerImageUrl: "",
        colorRoles: 
        [
                { label: "Negro", roleId: "822611437591461899" },
                { label: "Blanco", roleId: "822611438308032513" },
                { label: "Verde", roleId: "822611439483093023" },
                { label: "Azul", roleId: "822611440346464276" },
                { label: "Morado", roleId: "822611441063952384" },
                { label: "Rojo", roleId: "939986214692462602" },
                { label: "Naranja", roleId: "941077346763546635" },
                { label: "Marrón", roleId: "941077090621599754" },
                { label: "Rosa", roleId: "941077550476693545" },
                { label: "Celeste", roleId: "822611441739759638" },
                { label: "Amarillo", roleId: "822611443119030334" },
                { label: "Quitar color", roleId: "clear" },
            ],
    },
    Database: {
        postgres: {
            database: process.env.PG_DATABASE || "vanitybot",
            username: process.env.PG_USER || "user",
            password: process.env.PG_PASSWORD || "password",
            host: process.env.PG_HOST || "localhost",
            port: parseInt(process.env.PG_PORT || "5432", 10),
            dialect: "postgres",
        },
        redis: {
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379", 10),
        },
    },
};