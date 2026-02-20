const { Queue } = require("bullmq");
const redisConnection = require("./redis");
const constants = require("./constants");
const logger = require("../services/logger");

const roleQueue = new Queue("roleQueue", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 1, 
        removeOnComplete: { 
            age: constants.QUEUE.JOB_CLEANUP_AGE, 
            count: constants.QUEUE.JOB_CLEANUP_COUNT 
        },
        removeOnFail: { 
            age: constants.QUEUE.FAILED_JOB_AGE 
        },
    }
});

// Limpieza automática de jobs antiguos
setInterval(async () => {
    try {
        const completed = await roleQueue.getCompleted();
        const failed = await roleQueue.getFailed();
        
        const now = Date.now();
        const maxAge = constants.QUEUE.JOB_CLEANUP_AGE * 1000;
        
        let cleaned = 0;
        
        // Limpiar jobs completados antiguos
        for (const job of completed) {
            if (now - job.timestamp > maxAge) {
                await job.remove();
                cleaned++;
            }
        }
        
        // Limpiar jobs fallidos antiguos (más tiempo)
        const failedMaxAge = constants.QUEUE.FAILED_JOB_AGE * 1000;
        for (const job of failed) {
            if (now - job.timestamp > failedMaxAge) {
                await job.remove();
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            logger.debug(`Limpieza automática: ${cleaned} jobs eliminados`);
        }
    } catch (err) {
        logger.error(`Error en limpieza automática de jobs: ${err.message}`);
    }
}, 60 * 60 * 1000); // Cada hora

module.exports = { roleQueue };