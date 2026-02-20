const winston = require("winston");
const path = require("path");
const fs = require("fs");
const constants = require("../utils/constants");

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, "..", "..", "logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Formato personalizado
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Formato para consola (más legible)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Crear logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { service: "vanity-bot" },
    transports: [
        // Archivo para todos los logs
        new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
            maxsize: constants.LOG.MAX_FILE_SIZE,
            maxFiles: constants.LOG.MAX_FILES,
        }),
        // Archivo para todos los logs (info y superiores)
        new winston.transports.File({
            filename: path.join(logsDir, "combined.log"),
            maxsize: constants.LOG.MAX_FILE_SIZE,
            maxFiles: constants.LOG.MAX_FILES,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, "exceptions.log"),
            maxsize: constants.LOG.MAX_FILE_SIZE,
            maxFiles: constants.LOG.MAX_FILES,
        }),
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, "rejections.log"),
            maxsize: constants.LOG.MAX_FILE_SIZE,
            maxFiles: constants.LOG.MAX_FILES,
        }),
    ],
});

// Siempre mostrar en consola (para debugging y monitoreo)
logger.add(
    new winston.transports.Console({
        format: consoleFormat,
    })
);

// Helper methods para mantener compatibilidad con console.log
logger.info = logger.info.bind(logger);
logger.error = logger.error.bind(logger);
logger.warn = logger.warn.bind(logger);
logger.debug = logger.debug.bind(logger);

module.exports = logger;
