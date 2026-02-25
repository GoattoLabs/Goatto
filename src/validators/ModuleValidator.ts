export interface ValidationResult { isValid: boolean; missing?: string[]; }

export const ModuleValidators: Record<string, (config: any, guild: any) => Promise<ValidationResult>> = {
    vanity: async (config, guild) => {
        const errors: string[] = [];

        // Validate Keyword
        if (!config.vanityString) {
            errors.push('The **keyword** (status text) has not been configured.');
        }

        // Validate Role
        const role = config.vanityRoleId ? await guild.roles.fetch(config.vanityRoleId).catch(() => null) : null;
        if (!role) {
            errors.push('The **reward role** has not been configured or is invalid.');
        }

        // Validate Channel
        const channel = config.vanityChannelId ? await guild.channels.fetch(config.vanityChannelId).catch(() => null) : null;
        if (!channel) {
            errors.push('The **log channel** has not been configured or is invalid.');
        }

        return { isValid: errors.length === 0, missing: errors };
    },
};