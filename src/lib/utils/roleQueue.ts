import { Queue } from 'bullmq';
import { redis } from '../../database/Redis';


// Role queue ──────────────────

export interface RoleJobData {
    guildId: string;
    userId: string;
    roleId: string;
    action: 'add' | 'remove';
}

export const roleQueue = new Queue<RoleJobData>('roleQueue', {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true
    }
});