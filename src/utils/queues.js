const { Queue } = require("bullmq");
const redisConnection = require("./redis");

const roleQueue = new Queue("roleQueue", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 1, 
        removeOnComplete: true,
        removeOnFail: true, 
    }
});

module.exports = { roleQueue };