import { SapphireClient, container, LogLevel } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import winston from 'winston';
import { join } from 'path';

export class PattoClient extends SapphireClient {
    public constructor() {
        const winstonLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({ filename: 'logs/combined.log' }),
                new winston.transports.File({ filename: 'logs/errors.log', level: 'error' })
            ]
        });

        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMembers,
            ],
            baseUserDirectory: join(__dirname, '..'), 
            applicationCommands: {
                developmentGuildIds: ['1195184839758975089']
            },
            logger: {
                instance: {
                    has: () => true,
                    info: (message: any) => winstonLogger.info(message),
                    debug: (message: any) => winstonLogger.debug(message),
                    error: (message: any) => winstonLogger.error(message),
                    warn: (message: any) => winstonLogger.warn(message),
                    fatal: (message: any) => winstonLogger.error(`[FATAL] ${message}`),
                    trace: (message: any) => winstonLogger.silly(message),
                    run: () => {},
                    level: LogLevel.Info
                } as any
            }
        } as any); 
    }

    public async start(token: string) {
        try {
            await super.login(token);
            container.logger.info('🦆 [CLIENT] PattoClient is online and ready.');
        } catch (error) {
            container.logger.error('🔴 [CLIENT] Login failed:');
            console.error(error);
            throw error;
        }
    }
}