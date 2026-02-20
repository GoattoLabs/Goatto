// Constantes centralizadas del bot

module.exports = {
    // Cooldowns y tiempos
    COOLDOWNS: {
        WELCOME_MESSAGE: 7200, // 2 horas en segundos
        REFRESH_COMMAND: 300, // 5 minutos en segundos
        SETVANITY_COMMAND: 600, // 10 minutos en segundos
        RATE_LIMIT_WINDOW: 60, // 1 minuto en segundos
    },

    // Rate limiting
    RATE_LIMITS: {
        REFRESH_PER_GUILD: 1, // 1 vez por ventana
        SETVANITY_PER_USER: 3, // 3 veces por ventana
        COMMAND_PER_USER: 10, // 10 comandos por ventana
    },

    // BullMQ
    QUEUE: {
        LOCK_DURATION: 30000, // 30 segundos
        LOCK_RENEW_TIME: 15000, // 15 segundos
        STALLED_INTERVAL: 300000, // 5 minutos
        MAX_STALLED_COUNT: 0,
        JOB_CLEANUP_AGE: 3600, // 1 hora
        JOB_CLEANUP_COUNT: 1000,
        FAILED_JOB_AGE: 86400, // 24 horas
    },

    // Batch processing
    BATCH: {
        SCAN_BATCH_SIZE: 50, // Procesar 50 miembros a la vez
        MEMBER_FETCH_LIMIT: 1000, // Límite de Discord API
    },

    // Cache
    CACHE: {
        SETTINGS_TTL: 300, // 5 minutos en segundos
        PRESENCE_CACHE_TTL: 60, // 1 minuto
    },

    // Base de datos
    DATABASE: {
        POOL_MAX: 10,
        POOL_MIN: 2,
        POOL_ACQUIRE: 30000,
        POOL_IDLE: 10000,
    },

    // Escaneos
    SCAN: {
        FULL_SCAN_INTERVAL: 48 * 60 * 60 * 1000, // 48 horas en milisegundos
        PROGRESS_UPDATE_INTERVAL: 100, // Actualizar progreso cada 100 miembros
    },

    // Prioridades de jobs
    JOB_PRIORITY: {
        HIGH: 1, // Comandos manuales
        NORMAL: 5, // Cambios de presencia
        LOW: 10, // Escaneos automáticos
    },

    // Reintentos
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY_BASE: 1000, // 1 segundo
        DELAY_MULTIPLIER: 2, // Exponencial
    },

    // Health check
    HEALTH: {
        PORT: 3000,
        CHECK_INTERVAL: 30000, // 30 segundos
    },

    // Backup
    BACKUP: {
        INTERVAL: 24 * 60 * 60 * 1000, // 24 horas
        RETENTION_DAYS: 7, // Mantener 7 días de backups
    },

    // Validaciones
    VALIDATION: {
        MAX_KEYWORD_LENGTH: 128,
        MIN_KEYWORD_LENGTH: 1,
    },

    // Logging
    LOG: {
        MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB en bytes
        MAX_FILES: 14, // 14 archivos
        DATE_PATTERN: 'YYYY-MM-DD',
    },
};
