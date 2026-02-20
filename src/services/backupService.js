const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const constants = require("../utils/constants");

class BackupService {
    static backupsDir = path.join(__dirname, "..", "..", "backups");

    static initialize() {
        try {
            // Crear directorio de backups si no existe
            if (!fs.existsSync(this.backupsDir)) {
                fs.mkdirSync(this.backupsDir, { recursive: true });
                logger.info(`[BACKUP] Directorio de backups creado: ${this.backupsDir}`);
            }

            // Limpiar backups antiguos al iniciar
            this.cleanOldBackups();
        } catch (err) {
            logger.error(`[BACKUP ERROR] Error al inicializar BackupService:`, err.message);
            // No crashear si falla la inicialización de backups
        }
    }

    /**
     * Crea un backup de la configuración de un guild
     */
    static async createBackup(guildId, settings) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `guild-${guildId}-${timestamp}.json`;
            const filepath = path.join(this.backupsDir, filename);

            const backup = {
                guildId,
                timestamp: new Date().toISOString(),
                settings: settings.toJSON ? settings.toJSON() : settings,
            };

            fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
            logger.info(`Backup creado para guild ${guildId}: ${filename}`);
            return filepath;
        } catch (err) {
            logger.error(`Error al crear backup para guild ${guildId}: ${err.message}`);
            return null;
        }
    }

    /**
     * Crea backup de todos los guilds
     */
    static async createFullBackup(GuildSettings) {
        try {
            const allSettings = await GuildSettings.findAll();
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `full-backup-${timestamp}.json`;
            const filepath = path.join(this.backupsDir, filename);

            const backup = {
                timestamp: new Date().toISOString(),
                guilds: allSettings.map(s => s.toJSON()),
            };

            fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
            logger.info(`Backup completo creado: ${filename} (${allSettings.length} guilds)`);
            return filepath;
        } catch (err) {
            logger.error(`Error al crear backup completo: ${err.message}`);
            return null;
        }
    }

    /**
     * Restaura configuración desde un backup
     */
    static async restoreFromBackup(filepath, GuildSettings) {
        try {
            const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
            
            if (data.guilds) {
                // Backup completo
                for (const guildData of data.guilds) {
                    await GuildSettings.upsert({
                        guildId: guildData.guildId,
                        vanityKeyword: guildData.vanityKeyword,
                        roleId: guildData.roleId,
                        channelId: guildData.channelId,
                    });
                }
                logger.info(`Restaurados ${data.guilds.length} guilds desde backup`);
            } else {
                // Backup individual
                await GuildSettings.upsert({
                    guildId: data.guildId,
                    vanityKeyword: data.settings.vanityKeyword,
                    roleId: data.settings.roleId,
                    channelId: data.settings.channelId,
                });
                logger.info(`Restaurado guild ${data.guildId} desde backup`);
            }
            return true;
        } catch (err) {
            logger.error(`Error al restaurar backup: ${err.message}`);
            return false;
        }
    }

    /**
     * Limpia backups antiguos
     */
    static cleanOldBackups() {
        try {
            if (!fs.existsSync(this.backupsDir)) {
                return;
            }
            
            const files = fs.readdirSync(this.backupsDir);
            const now = Date.now();
            const maxAge = constants.BACKUP.RETENTION_DAYS * 24 * 60 * 60 * 1000;
            let deleted = 0;

            for (const file of files) {
                try {
                    const filepath = path.join(this.backupsDir, file);
                    if (!fs.existsSync(filepath)) continue;
                    
                    const stats = fs.statSync(filepath);
                    const age = now - stats.mtimeMs;

                    if (age > maxAge) {
                        fs.unlinkSync(filepath);
                        deleted++;
                    }
                } catch (fileErr) {
                    logger.debug(`[BACKUP] Error procesando archivo ${file}:`, fileErr.message);
                }
            }

            if (deleted > 0) {
                logger.info(`[BACKUP] Eliminados ${deleted} backups antiguos`);
            }
        } catch (err) {
            logger.error(`[BACKUP ERROR] Error al limpiar backups: ${err.message}`);
        }
    }

    /**
     * Lista todos los backups disponibles
     */
    static listBackups() {
        try {
            const files = fs.readdirSync(this.backupsDir)
                .filter(f => f.endsWith(".json"))
                .map(f => {
                    const filepath = path.join(this.backupsDir, f);
                    const stats = fs.statSync(filepath);
                    return {
                        filename: f,
                        path: filepath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                    };
                })
                .sort((a, b) => b.modified - a.modified);

            return files;
        } catch (err) {
            logger.error(`Error al listar backups: ${err.message}`);
            return [];
        }
    }
}

module.exports = BackupService;
